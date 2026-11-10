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
  CreateGroupLinkDto,
  UpdateGroupLinkDto,
  WHATSAPP_INVITE_URL_REGEX,
} from './dto/group-links.dto';
import { GroupLinkStrategy, InstanceStatus } from '@prisma/client';

export interface ResolvedGroupRedirect {
  available: boolean;
  slug: string;
  name: string;
  inviteUrl: string | null;
  groupName: string | null;
  participantCount: number | null;
  maxParticipants: number | null;
  switchedGroup: boolean;
  message: string;
}

@Injectable()
export class GroupLinksService {
  private readonly logger = new Logger(GroupLinksService.name);
  private readonly syncCooldownMs = 15000;
  private readonly lastSyncByLink = new Map<string, number>();

  private readonly groupPublicSelect = {
    id: true,
    name: true,
    jid: true,
    participantCount: true,
    maxParticipants: true,
    inviteUrl: true,
    isActive: true,
    instanceId: true,
    instance: {
      select: {
        id: true,
        displayName: true,
        status: true,
      },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly evolutionClient: EvolutionClient,
  ) {}

  /**
   * Lista todos os Links Permanentes de Grupo pertencentes ao tenant autenticado.
   */
  async findAllByTenant(tenantId: string) {
    return this.prisma.groupRedirectLink.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        currentGroup: { select: this.groupPublicSelect },
        targets: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          include: {
            group: { select: this.groupPublicSelect },
          },
        },
      },
    });
  }

  /**
   * Busca um Link Permanente por ID garantindo isolamento por tenant.
   */
  async findOne(tenantId: string, id: string) {
    const link = await this.prisma.groupRedirectLink.findFirst({
      where: { id, tenantId },
      include: {
        currentGroup: { select: this.groupPublicSelect },
        targets: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          include: {
            group: { select: this.groupPublicSelect },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException(
        'Link permanente de grupo não encontrado para esta organização.',
      );
    }

    return link;
  }

  /**
   * Cria um novo Link Permanente de Grupo validando estritamente propriedade multi-tenant.
   */
  async create(tenantId: string, dto: CreateGroupLinkDto) {
    const normalizedSlug = dto.slug.trim().toLowerCase();

    const slugTaken = await this.prisma.groupRedirectLink.findUnique({
      where: { slug: normalizedSlug },
    });
    if (slugTaken) {
      throw new ConflictException(
        `O slug '${normalizedSlug}' já está em uso. Escolha outro identificador único.`,
      );
    }

    const validatedGroupsMap = await this.validateTenantGroups(
      tenantId,
      dto.targets.map((t) => t.groupId),
    );

    if (dto.currentGroupId && !validatedGroupsMap.has(dto.currentGroupId)) {
      throw new BadRequestException(
        'O grupo destino inicial selecionado deve estar incluído na lista de grupos do link.',
      );
    }

    // Resolve links de convite iniciais (DTO -> banco -> Evolution API se conectada)
    const preparedTargets = await Promise.all(
      dto.targets.map(async (target, index) => {
        const grp = validatedGroupsMap.get(target.groupId)!;
        const inviteUrl = await this.resolveOrFetchInviteUrl(
          grp,
          target.inviteUrl,
        );

        return {
          groupId: target.groupId,
          inviteUrl,
          maxParticipants: target.maxParticipants ?? null,
          priority: target.priority ?? index,
          isEnabled: target.isEnabled ?? true,
        };
      }),
    );

    const strategy = (dto.strategy || 'LEAST_FILLED') as GroupLinkStrategy;
    const linkMax = dto.maxParticipants ?? 1024;
    const initialGroupId =
      dto.currentGroupId ||
      this.pickInitialGroupId(preparedTargets, validatedGroupsMap, linkMax);

    const created = await this.prisma.groupRedirectLink.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        slug: normalizedSlug,
        strategy,
        maxParticipants: linkMax,
        isActive: dto.isActive ?? true,
        currentGroupId: initialGroupId,
        targets: {
          create: preparedTargets,
        },
      },
      include: {
        currentGroup: { select: this.groupPublicSelect },
        targets: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          include: {
            group: { select: this.groupPublicSelect },
          },
        },
      },
    });

    this.logger.log(
      `Link permanente '${created.slug}' criado para tenant ${tenantId} com ${preparedTargets.length} grupo(s).`,
    );
    return created;
  }

  /**
   * Atualiza um Link Permanente (permite trocar grupo de destino sem alterar a URL compartilhada).
   */
  async update(tenantId: string, id: string, dto: UpdateGroupLinkDto) {
    const existing = await this.findOne(tenantId, id);

    let normalizedSlug = existing.slug;
    if (dto.slug !== undefined) {
      normalizedSlug = dto.slug.trim().toLowerCase();
      if (normalizedSlug !== existing.slug) {
        const slugTaken = await this.prisma.groupRedirectLink.findUnique({
          where: { slug: normalizedSlug },
        });
        if (slugTaken) {
          throw new ConflictException(
            `O slug '${normalizedSlug}' já está em uso por outro link.`,
          );
        }
      }
    }

    let preparedTargets:
      | Array<{
          groupId: string;
          inviteUrl: string | null;
          maxParticipants: number | null;
          priority: number;
          isEnabled: boolean;
        }>
      | undefined;

    let allowedGroupIds = new Set(existing.targets.map((t) => t.groupId));

    if (dto.targets) {
      const validatedGroupsMap = await this.validateTenantGroups(
        tenantId,
        dto.targets.map((t) => t.groupId),
      );
      allowedGroupIds = new Set(validatedGroupsMap.keys());

      preparedTargets = await Promise.all(
        dto.targets.map(async (target, index) => {
          const grp = validatedGroupsMap.get(target.groupId)!;
          const prevTarget = existing.targets.find(
            (t) => t.groupId === target.groupId,
          );
          const inviteUrl = await this.resolveOrFetchInviteUrl(
            grp,
            target.inviteUrl ?? prevTarget?.inviteUrl ?? undefined,
          );

          return {
            groupId: target.groupId,
            inviteUrl,
            maxParticipants: target.maxParticipants ?? null,
            priority: target.priority ?? index,
            isEnabled: target.isEnabled ?? true,
          };
        }),
      );
    }

    let nextCurrentGroupId = existing.currentGroupId;
    if (dto.currentGroupId !== undefined) {
      if (!allowedGroupIds.has(dto.currentGroupId)) {
        throw new BadRequestException(
          'O grupo de destino informado não pertence a este link ou organização.',
        );
      }
      nextCurrentGroupId = dto.currentGroupId;
    } else if (
      preparedTargets &&
      nextCurrentGroupId &&
      !allowedGroupIds.has(nextCurrentGroupId)
    ) {
      nextCurrentGroupId = preparedTargets[0]?.groupId ?? null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (preparedTargets) {
        await tx.groupRedirectTarget.deleteMany({
          where: { redirectLinkId: id },
        });
        await tx.groupRedirectTarget.createMany({
          data: preparedTargets.map((t) => ({
            redirectLinkId: id,
            ...t,
          })),
        });
      }

      return tx.groupRedirectLink.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : existing.name,
          slug: normalizedSlug,
          strategy: (dto.strategy ?? existing.strategy) as GroupLinkStrategy,
          maxParticipants: dto.maxParticipants ?? existing.maxParticipants,
          isActive: dto.isActive ?? existing.isActive,
          currentGroupId: nextCurrentGroupId,
        },
        include: {
          currentGroup: { select: this.groupPublicSelect },
          targets: {
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            include: {
              group: { select: this.groupPublicSelect },
            },
          },
        },
      });
    });

    this.lastSyncByLink.delete(id);
    return updated;
  }

  /**
   * Remove um Link Permanente pertencente ao tenant.
   */
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.groupRedirectLink.delete({ where: { id } });
    this.lastSyncByLink.delete(id);
    return { success: true, message: 'Link permanente removido com sucesso.' };
  }

  /**
   * Sincroniza ocupação real e links de convite de todos os grupos vinculados via Evolution API.
   */
  async syncLinkTargets(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    this.lastSyncByLink.delete(id);

    const link = await this.loadFullLinkById(id);
    if (!link) {
      throw new NotFoundException('Link permanente não encontrado.');
    }

    await this.refreshTargetsFromEvolution(link, true);
    return this.findOne(tenantId, id);
  }

  /**
   * Rota pública: identifica se o grupo atual atingiu o limite máximo de participantes,
   * escolhe o próximo grupo elegível mais vazio (ou aleatório conforme estratégia) e retorna a URL oficial.
   */
  async resolvePublicRedirect(slug: string): Promise<ResolvedGroupRedirect> {
    const normalizedSlug = (slug || '').trim().toLowerCase();
    const link = await this.prisma.groupRedirectLink.findUnique({
      where: { slug: normalizedSlug },
      include: {
        targets: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          include: {
            group: {
              include: {
                instance: {
                  include: { server: true },
                },
              },
            },
          },
        },
      },
    });

    if (!link || !link.isActive) {
      throw new NotFoundException(
        'Link permanente de grupo não encontrado ou inativo.',
      );
    }

    // Atualiza contagem e convites com throttle de 15s para proteger a Evolution API em picos
    await this.refreshTargetsFromEvolution(link, false);

    const selection = this.selectTargetForRedirect(link);

    if (!selection) {
      return {
        available: false,
        slug: link.slug,
        name: link.name,
        inviteUrl: null,
        groupName: null,
        participantCount: null,
        maxParticipants: link.maxParticipants,
        switchedGroup: false,
        message:
          'Todos os grupos vinculados a este link atingiram o limite máximo de participantes ou estão sem link de convite no momento.',
      };
    }

    const switchedGroup = Boolean(
      link.currentGroupId && link.currentGroupId !== selection.target.groupId,
    );

    await this.prisma.$transaction([
      this.prisma.groupRedirectLink.update({
        where: { id: link.id },
        data: {
          totalClicks: { increment: 1 },
          lastRedirectedAt: new Date(),
          currentGroupId: selection.target.groupId,
        },
      }),
      this.prisma.groupRedirectTarget.update({
        where: { id: selection.target.id },
        data: {
          clicks: { increment: 1 },
        },
      }),
    ]);

    if (switchedGroup) {
      this.logger.log(
        `Failover automático no link '${link.slug}': grupo alterado para '${selection.target.group.name}' (${selection.participantCount}/${selection.maxParticipants}).`,
      );
    }

    return {
      available: true,
      slug: link.slug,
      name: link.name,
      inviteUrl: selection.inviteUrl,
      groupName: selection.target.group.name,
      participantCount: selection.participantCount,
      maxParticipants: selection.maxParticipants,
      switchedGroup,
      message: 'Grupo disponível encontrado.',
    };
  }

  /**
   * Seleciona o grupo destino elegível respeitando o limite máximo de participantes e a estratégia do link.
   */
  private selectTargetForRedirect(link: {
    strategy: GroupLinkStrategy;
    maxParticipants: number;
    currentGroupId: string | null;
    targets: Array<{
      id: string;
      groupId: string;
      inviteUrl: string | null;
      maxParticipants: number | null;
      priority: number;
      isEnabled: boolean;
      group: {
        id: string;
        name: string;
        participantCount: number | null;
        maxParticipants: number;
        inviteUrl: string | null;
        isActive: boolean;
      };
    }>;
  }) {
    const eligible = link.targets
      .map((target) => {
        const inviteUrl = target.inviteUrl || target.group.inviteUrl || '';
        const participantCount = target.group.participantCount ?? 0;
        const maxParticipants = this.getEffectiveMaxParticipants(
          target.maxParticipants,
          link.maxParticipants,
          target.group.maxParticipants,
        );

        return {
          target,
          inviteUrl,
          participantCount,
          maxParticipants,
        };
      })
      .filter(
        (item) =>
          item.target.isEnabled &&
          item.target.group.isActive &&
          WHATSAPP_INVITE_URL_REGEX.test(item.inviteUrl) &&
          item.participantCount < item.maxParticipants,
      );

    if (eligible.length === 0) {
      return null;
    }

    if (link.strategy === GroupLinkStrategy.MANUAL_WITH_FALLBACK && link.currentGroupId) {
      const current = eligible.find(
        (item) => item.target.groupId === link.currentGroupId,
      );
      if (current) {
        return current;
      }
      // Se o grupo manual lotou ou ficou indisponível, cai automaticamente para o próximo mais vazio
    }

    if (link.strategy === GroupLinkStrategy.RANDOM_AVAILABLE) {
      const randomIdx = Math.floor(Math.random() * eligible.length);
      return eligible[randomIdx];
    }

    // LEAST_FILLED (e fallback padrão): ordena do grupo mais vazio para o mais cheio
    eligible.sort((a, b) => {
      if (a.participantCount !== b.participantCount) {
        return a.participantCount - b.participantCount;
      }
      return a.target.priority - b.target.priority;
    });

    return eligible[0];
  }

  private async validateTenantGroups(tenantId: string, groupIds: string[]) {
    const uniqueIds = Array.from(new Set(groupIds));
    const groups = await this.prisma.whatsAppGroup.findMany({
      where: {
        id: { in: uniqueIds },
        tenantId,
      },
      include: {
        instance: {
          include: { server: true },
        },
      },
    });

    if (groups.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Um ou mais grupos informados não existem ou não pertencem a esta organização.',
      );
    }

    return new Map(groups.map((g) => [g.id, g]));
  }

  private pickInitialGroupId(
    targets: Array<{ groupId: string; inviteUrl: string | null; maxParticipants: number | null; isEnabled: boolean }>,
    groupsMap: Map<string, any>,
    linkMax: number,
  ): string | null {
    const sorted = [...targets]
      .filter((t) => t.isEnabled)
      .sort((a, b) => {
        const countA = groupsMap.get(a.groupId)?.participantCount ?? 0;
        const countB = groupsMap.get(b.groupId)?.participantCount ?? 0;
        return countA - countB;
      });

    const firstOpen = sorted.find((t) => {
      const grp = groupsMap.get(t.groupId);
      const count = grp?.participantCount ?? 0;
      const limit = this.getEffectiveMaxParticipants(
        t.maxParticipants,
        linkMax,
        grp?.maxParticipants,
      );
      return count < limit;
    });

    return (firstOpen || sorted[0] || targets[0])?.groupId ?? null;
  }

  private getEffectiveMaxParticipants(
    targetMax: number | null | undefined,
    linkMax: number,
    groupMax: number | null | undefined,
  ): number {
    return targetMax ?? Math.min(linkMax, groupMax || 1024);
  }

  private async resolveOrFetchInviteUrl(
    group: any,
    explicitInviteUrl?: string,
  ): Promise<string | null> {
    if (explicitInviteUrl && explicitInviteUrl.trim().length > 0) {
      const clean = explicitInviteUrl.trim();
      if (!WHATSAPP_INVITE_URL_REGEX.test(clean)) {
        throw new BadRequestException(
          'O link de convite deve seguir o formato oficial https://chat.whatsapp.com/...',
        );
      }
      return clean;
    }

    if (group.inviteUrl && WHATSAPP_INVITE_URL_REGEX.test(group.inviteUrl)) {
      return group.inviteUrl;
    }

    if (group.instance?.status === InstanceStatus.CONNECTED && group.instance?.server) {
      try {
        const apiKey = this.cryptoVault.decrypt(
          group.instance.server.apiKeyEncrypted,
        );
        const invite = await this.evolutionClient.getGroupInviteCode(
          group.instance.server.baseUrl,
          apiKey,
          group.instance.instanceName,
          group.jid,
        );
        if (invite?.inviteUrl && WHATSAPP_INVITE_URL_REGEX.test(invite.inviteUrl)) {
          await this.prisma.whatsAppGroup.update({
            where: { id: group.id },
            data: { inviteUrl: invite.inviteUrl },
          });
          return invite.inviteUrl;
        }
      } catch (err: any) {
        this.logger.debug(
          `Não foi possível obter inviteCode automático para '${group.name}': ${err.message}`,
        );
      }
    }

    return null;
  }

  private async loadFullLinkById(id: string) {
    return this.prisma.groupRedirectLink.findUnique({
      where: { id },
      include: {
        targets: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          include: {
            group: {
              include: {
                instance: {
                  include: { server: true },
                },
              },
            },
          },
        },
      },
    });
  }

  private async refreshTargetsFromEvolution(link: any, force: boolean) {
    const now = Date.now();
    const lastSync = this.lastSyncByLink.get(link.id) || 0;
    if (!force && now - lastSync < this.syncCooldownMs) {
      return;
    }
    this.lastSyncByLink.set(link.id, now);

    await Promise.allSettled(
      link.targets.map(async (target: any) => {
        const grp = target.group;
        if (
          !target.isEnabled ||
          !grp?.isActive ||
          grp.instance?.status !== InstanceStatus.CONNECTED ||
          !grp.instance?.server
        ) {
          return;
        }

        const apiKey = this.cryptoVault.decrypt(
          grp.instance.server.apiKeyEncrypted,
        );

        try {
          const info = await this.evolutionClient.findGroupInfos(
            grp.instance.server.baseUrl,
            apiKey,
            grp.instance.instanceName,
            grp.jid,
            4000,
          );

          if (info && typeof info.size === 'number') {
            grp.participantCount = info.size;
            await this.prisma.whatsAppGroup.update({
              where: { id: grp.id },
              data: {
                participantCount: info.size,
                lastSyncedAt: new Date(),
              },
            });
          }
        } catch (err: any) {
          this.logger.debug(
            `Mantendo contagem em cache para '${grp.name}' (${grp.participantCount}): ${err.message}`,
          );
        }

        if (!target.inviteUrl && !grp.inviteUrl) {
          try {
            const invite = await this.evolutionClient.getGroupInviteCode(
              grp.instance.server.baseUrl,
              apiKey,
              grp.instance.instanceName,
              grp.jid,
            );
            if (
              invite?.inviteUrl &&
              WHATSAPP_INVITE_URL_REGEX.test(invite.inviteUrl)
            ) {
              target.inviteUrl = invite.inviteUrl;
              grp.inviteUrl = invite.inviteUrl;
              await this.prisma.$transaction([
                this.prisma.whatsAppGroup.update({
                  where: { id: grp.id },
                  data: { inviteUrl: invite.inviteUrl },
                }),
                this.prisma.groupRedirectTarget.update({
                  where: { id: target.id },
                  data: { inviteUrl: invite.inviteUrl },
                }),
              ]);
            }
          } catch {
            // Instância pode não ser admin do grupo; mantém link manual se houver
          }
        }
      }),
    );
  }
}
