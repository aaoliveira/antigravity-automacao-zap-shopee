import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import { EvolutionClient } from './evolution.client';
import {
  CreateWhatsAppInstanceDto,
  UpdateInstanceSafetySettingsDto,
} from './dto/evolution.dto';
import { InstanceStatus, PublicationStatus } from '@prisma/client';
import {
  computeEffectiveInstanceDailyLimit,
  getStartOfDayInZone,
} from './instance-safety.helper';

@Injectable()
export class WhatsAppInstancesService {
  private readonly logger = new Logger(WhatsAppInstancesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly evolutionClient: EvolutionClient,
  ) {}

  /**
   * Lista todas as instâncias do WhatsApp pertencentes ao tenant com telemetria diária e limites efetivos.
   */
  async findAllByTenant(tenantId: string) {
    const instances = await this.prisma.whatsAppInstance.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        serverId: true,
        instanceName: true,
        displayName: true,
        status: true,
        phoneConnected: true,
        lastConnectedAt: true,
        dailyMessageLimit: true,
        minIntervalSeconds: true,
        warmUpEnabled: true,
        circuitOpenUntil: true,
        consecutiveSendFailures: true,
        lastErrorReason: true,
        createdAt: true,
        updatedAt: true,
        server: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
        _count: {
          select: { groups: true },
        },
      },
    });

    return this.enrichWithSafetyTelemetry(tenantId, instances);
  }

  /**
   * Busca uma instância por ID pertencente estritamente ao tenant.
   */
  async findOne(tenantId: string, id: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    const [enriched] = await this.enrichWithSafetyTelemetry(tenantId, [instance]);
    return enriched;
  }

  /**
   * Atualiza configurações anti-banimento da instância WhatsApp com validação estrita de tenant.
   */
  async updateSafetySettings(
    tenantId: string,
    id: string,
    dto: UpdateInstanceSafetySettingsDto,
  ) {
    const existing = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    const updated = await this.prisma.whatsAppInstance.update({
      where: { id },
      data: {
        dailyMessageLimit: dto.dailyMessageLimit ?? existing.dailyMessageLimit,
        minIntervalSeconds: dto.minIntervalSeconds ?? existing.minIntervalSeconds,
        warmUpEnabled: dto.warmUpEnabled ?? existing.warmUpEnabled,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
        _count: {
          select: { groups: true },
        },
      },
    });

    const [enriched] = await this.enrichWithSafetyTelemetry(tenantId, [updated]);
    return enriched;
  }

  /**
   * Reabre/reseta manualmente o Circuit Breaker de uma instância após o usuário verificar o número.
   */
  async resetCircuitBreaker(tenantId: string, id: string) {
    const existing = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    const updated = await this.prisma.whatsAppInstance.update({
      where: { id },
      data: {
        circuitOpenUntil: null,
        consecutiveSendFailures: 0,
        lastErrorReason: null,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
        _count: {
          select: { groups: true },
        },
      },
    });

    const [enriched] = await this.enrichWithSafetyTelemetry(tenantId, [updated]);
    return enriched;
  }

  private async enrichWithSafetyTelemetry<
    T extends {
      id: string;
      dailyMessageLimit?: number;
      warmUpEnabled?: boolean;
      lastConnectedAt?: Date | null;
      circuitOpenUntil?: Date | null;
      createdAt?: Date;
    },
  >(tenantId: string, instances: T[]) {
    if (instances.length === 0) return [];

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    const startOfDay = getStartOfDayInZone(tenant?.timezone || 'America/Sao_Paulo');

    const instanceIds = instances.map((i) => i.id);
    const todayPublications = await this.prisma.publication.findMany({
      where: {
        status: PublicationStatus.SUCCESS,
        sentAt: { gte: startOfDay },
        group: {
          tenantId,
          instanceId: { in: instanceIds },
        },
      },
      select: {
        group: {
          select: { instanceId: true },
        },
      },
    });

    const countsByInstance = new Map<string, number>();
    for (const pub of todayPublications) {
      const instId = pub.group?.instanceId;
      if (instId) {
        countsByInstance.set(instId, (countsByInstance.get(instId) || 0) + 1);
      }
    }

    const now = new Date();
    return instances.map((instance) => {
      const limitInfo = computeEffectiveInstanceDailyLimit(instance, now);
      const isCircuitOpen = Boolean(
        instance.circuitOpenUntil &&
          new Date(instance.circuitOpenUntil).getTime() > now.getTime(),
      );
      return {
        ...instance,
        messagesSentToday: countsByInstance.get(instance.id) || 0,
        effectiveDailyLimit: limitInfo.effectiveDailyLimit,
        warmUpStageDays: limitInfo.warmUpStageDays,
        warmUpCapApplied: limitInfo.warmUpCapApplied,
        warmUpRecommendedCap: limitInfo.warmUpRecommendedCap,
        isCircuitOpen,
      };
    });
  }

  /**
   * Cria uma nova instância na Evolution API e registra no banco local.
   */
  async create(tenantId: string, dto: CreateWhatsAppInstanceDto) {
    // 1. Valida se o servidor pertence ao tenant
    const server = await this.prisma.evolutionServer.findFirst({
      where: { id: dto.serverId, tenantId },
    });

    if (!server) {
      throw new NotFoundException('Servidor Evolution não encontrado ou não pertence a este tenant.');
    }

    // 2. Verifica unicidade de instanceName no servidor
    const existing = await this.prisma.whatsAppInstance.findUnique({
      where: {
        serverId_instanceName: {
          serverId: dto.serverId,
          instanceName: dto.instanceName.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe uma instância com o nome '${dto.instanceName}' vinculada a este servidor.`,
      );
    }

    // 3. Descriptografa a API Key do servidor
    const apiKey = this.cryptoVault.decrypt(server.apiKeyEncrypted);

    // 4. Cria a instância na Evolution API externa
    const creationResult = await this.evolutionClient.createInstance(
      server.baseUrl,
      apiKey,
      dto.instanceName.trim(),
    );

    const initialQrCode = creationResult.qrcode?.base64 || null;

    // 5. Persiste a instância no banco com status CREATED (não assumir que está conectada!)
    const instance = await this.prisma.whatsAppInstance.create({
      data: {
        tenantId,
        serverId: dto.serverId,
        instanceName: dto.instanceName.trim(),
        displayName: dto.displayName.trim(),
        status: InstanceStatus.CREATED,
        qrCodeBase64: initialQrCode,
        ...(dto.dailyMessageLimit !== undefined
          ? { dailyMessageLimit: dto.dailyMessageLimit }
          : {}),
        ...(dto.minIntervalSeconds !== undefined
          ? { minIntervalSeconds: dto.minIntervalSeconds }
          : {}),
        ...(dto.warmUpEnabled !== undefined
          ? { warmUpEnabled: dto.warmUpEnabled }
          : {}),
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
      },
    });

    this.logger.log(`Instância criada: ${instance.id} (${instance.instanceName})`);
    return instance;
  }

  /**
   * Obtém QR Code atualizado para pareamento.
   */
  async getQrCode(tenantId: string, id: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId },
      include: { server: true },
    });

    if (!instance) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    const apiKey = this.cryptoVault.decrypt(instance.server.apiKeyEncrypted);

    try {
      const qrData = await this.evolutionClient.getConnectQrCode(
        instance.server.baseUrl,
        apiKey,
        instance.instanceName,
      );

      // Se a Evolution API retornar QR Code base64
      if (qrData.base64) {
        await this.prisma.whatsAppInstance.update({
          where: { id },
          data: {
            qrCodeBase64: qrData.base64,
            status: InstanceStatus.CONNECTING,
          },
        });

        return {
          id: instance.id,
          instanceName: instance.instanceName,
          status: InstanceStatus.CONNECTING,
          base64: qrData.base64,
          code: qrData.code,
        };
      }

      // Se não retornou QR Code, pode já estar conectada
      const stateData = await this.evolutionClient.getConnectionState(
        instance.server.baseUrl,
        apiKey,
        instance.instanceName,
      );

      if (stateData.instance?.state === 'open') {
        await this.prisma.whatsAppInstance.update({
          where: { id },
          data: {
            status: InstanceStatus.CONNECTED,
            qrCodeBase64: null,
            lastConnectedAt: new Date(),
          },
        });

        return {
          id: instance.id,
          instanceName: instance.instanceName,
          status: InstanceStatus.CONNECTED,
          base64: null,
          message: 'Instância já está conectada.',
        };
      }

      return {
        id: instance.id,
        instanceName: instance.instanceName,
        status: instance.status,
        base64: instance.qrCodeBase64,
      };
    } catch (err: any) {
      this.logger.error(`Erro ao obter QR Code da instância ${id}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Consulta o estado em tempo real da conexão na Evolution API e sincroniza no banco.
   */
  async getStatus(tenantId: string, id: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId },
      include: { server: true },
    });

    if (!instance) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    const apiKey = this.cryptoVault.decrypt(instance.server.apiKeyEncrypted);

    try {
      const stateResult = await this.evolutionClient.getConnectionState(
        instance.server.baseUrl,
        apiKey,
        instance.instanceName,
      );

      const rawState = stateResult.instance?.state;
      let newStatus: InstanceStatus = instance.status;

      if (rawState === 'open') {
        newStatus = InstanceStatus.CONNECTED;
      } else if (rawState === 'close') {
        newStatus = InstanceStatus.DISCONNECTED;
      } else if (rawState === 'connecting') {
        newStatus = InstanceStatus.CONNECTING;
      }

      const updated = await this.prisma.whatsAppInstance.update({
        where: { id },
        data: {
          status: newStatus,
          qrCodeBase64: newStatus === InstanceStatus.CONNECTED ? null : instance.qrCodeBase64,
          lastConnectedAt: newStatus === InstanceStatus.CONNECTED ? new Date() : instance.lastConnectedAt,
          ...(newStatus === InstanceStatus.CONNECTED
            ? {
                circuitOpenUntil: null,
                consecutiveSendFailures: 0,
                lastErrorReason: null,
              }
            : {}),
        },
      });

      return {
        id: updated.id,
        instanceName: updated.instanceName,
        status: updated.status,
        state: rawState,
        lastConnectedAt: updated.lastConnectedAt,
      };
    } catch (err: any) {
      this.logger.error(`Erro ao consultar status da instância ${id}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Desconecta (logout) a instância no WhatsApp.
   */
  async logout(tenantId: string, id: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId },
      include: { server: true },
    });

    if (!instance) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    const apiKey = this.cryptoVault.decrypt(instance.server.apiKeyEncrypted);

    await this.evolutionClient.logoutInstance(
      instance.server.baseUrl,
      apiKey,
      instance.instanceName,
    );

    await this.prisma.whatsAppInstance.update({
      where: { id },
      data: {
        status: InstanceStatus.DISCONNECTED,
        qrCodeBase64: null,
      },
    });

    return { success: true, message: 'Instância desconectada com sucesso.' };
  }

  /**
   * Remove a instância da Evolution API e do banco local.
   */
  async remove(tenantId: string, id: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId },
      include: {
        server: true,
        automations: { select: { id: true, name: true } },
      },
    });

    if (!instance) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    if (instance.automations && instance.automations.length > 0) {
      throw new BadRequestException(
        `Não é possível excluir a instância pois ela está vinculada a ${instance.automations.length} automação(ões).`,
      );
    }

    const apiKey = this.cryptoVault.decrypt(instance.server.apiKeyEncrypted);

    try {
      await this.evolutionClient.deleteInstance(
        instance.server.baseUrl,
        apiKey,
        instance.instanceName,
      );
    } catch (err: any) {
      this.logger.warn(
        `Aviso ao excluir instância na Evolution API: ${err.message}. Prosseguindo com exclusão local.`,
      );
    }

    await this.prisma.whatsAppInstance.delete({
      where: { id },
    });

    return { success: true, message: 'Instância removida com sucesso.' };
  }
}
