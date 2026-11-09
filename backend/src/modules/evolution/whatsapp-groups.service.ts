import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import { EvolutionClient, CaptionTemplateParams } from './evolution.client';
import { EvolutionSsrfValidator } from './evolution-ssrf.validator';
import { QueryGroupsDto } from './dto/evolution.dto';
import { InstanceStatus } from '@prisma/client';

@Injectable()
export class WhatsAppGroupsService {
  private readonly logger = new Logger(WhatsAppGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly evolutionClient: EvolutionClient,
  ) {}

  /**
   * Lista todos os grupos de WhatsApp sincronizados para o tenant, com filtros opcionais.
   */
  async findAllByTenant(tenantId: string, query?: QueryGroupsDto) {
    const where: any = { tenantId };

    if (query?.instanceId) {
      where.instanceId = query.instanceId;
    }

    if (query?.search && query.search.trim().length > 0) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    return this.prisma.whatsAppGroup.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        instance: {
          select: {
            id: true,
            instanceName: true,
            displayName: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Sincroniza a lista de grupos da instância conectada a partir da Evolution API.
   * Preserva estritamente o JID original retornado pela API (ex: 120363xxx@g.us).
   */
  async syncGroups(tenantId: string, instanceId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: { server: true },
    });

    if (!instance) {
      throw new NotFoundException('Instância WhatsApp não encontrada para o tenant.');
    }

    const apiKey = this.cryptoVault.decrypt(instance.server.apiKeyEncrypted);

    // Consulta grupos na Evolution API
    const remoteGroups = await this.evolutionClient.fetchAllGroups(
      instance.server.baseUrl,
      apiKey,
      instance.instanceName,
    );

    const syncedGroups = [];

    for (const group of remoteGroups) {
      // Ignora se não possuir ID válido de grupo WhatsApp
      if (!group.id || !group.id.includes('@g.us')) {
        continue;
      }

      const originalJid = group.id.trim();
      const groupName = group.subject || 'Grupo sem nome';
      const participantCount = typeof group.size === 'number' ? group.size : 0;

      const upserted = await this.prisma.whatsAppGroup.upsert({
        where: {
          instanceId_jid: {
            instanceId: instance.id,
            jid: originalJid,
          },
        },
        create: {
          tenantId,
          instanceId: instance.id,
          jid: originalJid,
          name: groupName,
          participantCount,
          isActive: true,
          lastSyncedAt: new Date(),
        },
        update: {
          name: groupName,
          participantCount,
          lastSyncedAt: new Date(),
        },
      });

      syncedGroups.push(upserted);
    }

    this.logger.log(
      `Sincronizados ${syncedGroups.length} grupos para a instância ${instance.instanceName} do tenant ${tenantId}`,
    );

    return {
      success: true,
      count: syncedGroups.length,
      groups: syncedGroups,
    };
  }

  /**
   * Envia uma mensagem de mídia (imagem do produto + legenda formatada) para um grupo de WhatsApp.
   * Valida previamente que o grupo pertence ao tenant e que a instância está ativa.
   */
  async sendMediaToGroup(
    tenantId: string,
    groupId: string,
    params: {
      mediaUrl: string;
      captionParams: CaptionTemplateParams;
      captionTemplate?: string;
    },
  ) {
    if (!params.mediaUrl) {
      throw new BadRequestException('A URL da mídia é obrigatória.');
    }

    // Validação estrita contra SSRF na URL de mídia
    EvolutionSsrfValidator.validateUrl(params.mediaUrl);

    const group = await this.prisma.whatsAppGroup.findFirst({
      where: { id: groupId, tenantId },
      include: {
        instance: {
          include: { server: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo WhatsApp não encontrado ou não pertence a este tenant.');
    }

    if (!group.isActive) {
      throw new BadRequestException(`O grupo '${group.name}' está inativo para automações.`);
    }

    const { instance } = group;
    if (instance.status !== InstanceStatus.CONNECTED) {
      throw new BadRequestException(
        `A instância '${instance.displayName}' não está com status CONECTADA (Status atual: ${instance.status}).`,
      );
    }

    const apiKey = this.cryptoVault.decrypt(instance.server.apiKeyEncrypted);
    const caption = this.evolutionClient.formatCaption(
      params.captionTemplate,
      params.captionParams,
    );

    const result = await this.evolutionClient.sendMedia(
      instance.server.baseUrl,
      apiKey,
      instance.instanceName,
      {
        number: group.jid,
        media: params.mediaUrl,
        caption,
        fileName: 'oferta-shopee.jpg',
      },
    );

    return {
      success: true,
      groupJid: group.jid,
      groupName: group.name,
      result,
    };
  }

  /**
   * Envia mensagem de texto simples para um grupo.
   */
  async sendTextToGroup(tenantId: string, groupId: string, text: string) {
    const group = await this.prisma.whatsAppGroup.findFirst({
      where: { id: groupId, tenantId },
      include: {
        instance: {
          include: { server: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo WhatsApp não encontrado para o tenant.');
    }

    const { instance } = group;
    const apiKey = this.cryptoVault.decrypt(instance.server.apiKeyEncrypted);

    const result = await this.evolutionClient.sendText(
      instance.server.baseUrl,
      apiKey,
      instance.instanceName,
      {
        number: group.jid,
        text,
      },
    );

    return {
      success: true,
      groupJid: group.jid,
      result,
    };
  }
}
