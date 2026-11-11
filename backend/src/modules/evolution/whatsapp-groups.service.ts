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
import { UpdateGroupInviteDto } from './dto/group-links.dto';
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
      const isAnnounceOnly = Boolean(group.announce);
      const isRestricted = Boolean(group.restrict);

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
          isAnnounceOnly,
          isRestricted,
          lastSyncedAt: new Date(),
        },
        update: {
          name: groupName,
          participantCount,
          isAnnounceOnly,
          isRestricted,
          lastSyncedAt: new Date(),
        },
      });

      syncedGroups.push(upserted);
    }

    const announceOnlyCount = syncedGroups.filter((g) => g.isAnnounceOnly).length;

    this.logger.log(
      `Sincronizados ${syncedGroups.length} grupos (${announceOnlyCount} somente admins) para a instância ${instance.instanceName} do tenant ${tenantId}`,
    );

    return {
      success: true,
      count: syncedGroups.length,
      announceOnlyCount,
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
      fileName?: string;
      delay?: number;
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

    const dynamicFileName = this.buildDynamicMediaFileName(
      params.fileName,
      params.captionParams.titulo,
      params.mediaUrl,
    );
    const sendDelayMs =
      typeof params.delay === 'number' && params.delay >= 0
        ? Math.round(params.delay)
        : 900 + Math.floor(Math.random() * 1100);

    const result = await this.evolutionClient.sendMedia(
      instance.server.baseUrl,
      apiKey,
      instance.instanceName,
      {
        number: group.jid,
        media: params.mediaUrl,
        caption,
        fileName: dynamicFileName,
        ...(sendDelayMs > 0 ? { delay: sendDelayMs } : {}),
      },
    );

    return {
      success: true,
      groupJid: group.jid,
      groupName: group.name,
      result,
    };
  }

  private buildDynamicMediaFileName(
    explicitFileName: string | undefined,
    title: string,
    mediaUrl: string,
  ): string {
    const extMatch = mediaUrl.split('?')[0].match(/\.(jpg|jpeg|png|webp)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

    if (explicitFileName && explicitFileName.trim().length > 0) {
      const cleaned = explicitFileName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72);
      if (cleaned) {
        return cleaned.includes('.') ? cleaned : `${cleaned}.${ext}`;
      }
    }

    const titleSlug = (title || 'oferta')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'oferta';
    const suffix = Math.random().toString(36).slice(2, 6);
    return `oferta-${titleSlug}-${suffix}.${ext}`;
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

  /**
   * Atualiza link oficial de convite e contagem de participantes de um grupo via Evolution API.
   */
  async fetchAndSaveGroupInvite(tenantId: string, groupId: string) {
    const group = await this.prisma.whatsAppGroup.findFirst({
      where: { id: groupId, tenantId },
      include: {
        instance: { include: { server: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo WhatsApp não encontrado para o tenant.');
    }

    if (group.instance.status !== InstanceStatus.CONNECTED) {
      throw new BadRequestException(
        `A instância '${group.instance.displayName}' precisa estar CONECTADA para obter o link de convite.`,
      );
    }

    const apiKey = this.cryptoVault.decrypt(group.instance.server.apiKeyEncrypted);

    const inviteRes = await this.evolutionClient.getGroupInviteCode(
      group.instance.server.baseUrl,
      apiKey,
      group.instance.instanceName,
      group.jid,
    );

    if (!inviteRes?.inviteUrl) {
      throw new BadRequestException(
        'Não foi possível obter o link de convite na Evolution API. Verifique se o número conectado é administrador deste grupo.',
      );
    }

    let participantCount = group.participantCount ?? 0;
    try {
      const info = await this.evolutionClient.findGroupInfos(
        group.instance.server.baseUrl,
        apiKey,
        group.instance.instanceName,
        group.jid,
      );
      if (info && typeof info.size === 'number') {
        participantCount = info.size;
      }
    } catch {
      // Mantém contagem existente caso findGroupInfos falhe pontualmente
    }

    const updated = await this.prisma.whatsAppGroup.update({
      where: { id: group.id },
      data: {
        inviteUrl: inviteRes.inviteUrl,
        participantCount,
        lastSyncedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Atualiza configurações manuais do grupo (link de convite oficial e limite máximo de membros).
   */
  async updateGroupSettings(
    tenantId: string,
    groupId: string,
    dto: UpdateGroupInviteDto,
  ) {
    const group = await this.prisma.whatsAppGroup.findFirst({
      where: { id: groupId, tenantId },
    });

    if (!group) {
      throw new NotFoundException('Grupo WhatsApp não encontrado para o tenant.');
    }

    return this.prisma.whatsAppGroup.update({
      where: { id: group.id },
      data: {
        inviteUrl: dto.inviteUrl !== undefined ? dto.inviteUrl.trim() : group.inviteUrl,
        maxParticipants:
          dto.maxParticipants !== undefined ? dto.maxParticipants : group.maxParticipants,
        ...(dto.isActive !== undefined
          ? {
              isActive: dto.isActive,
              ...(dto.isActive ? { sendBlockedReason: null } : {}),
            }
          : {}),
      },
    });
  }
}
