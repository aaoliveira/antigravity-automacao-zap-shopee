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
import { CreateWhatsAppInstanceDto } from './dto/evolution.dto';
import { InstanceStatus } from '@prisma/client';

@Injectable()
export class WhatsAppInstancesService {
  private readonly logger = new Logger(WhatsAppInstancesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly evolutionClient: EvolutionClient,
  ) {}

  /**
   * Lista todas as instâncias do WhatsApp pertencentes ao tenant.
   */
  async findAllByTenant(tenantId: string) {
    return this.prisma.whatsAppInstance.findMany({
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

    return instance;
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
