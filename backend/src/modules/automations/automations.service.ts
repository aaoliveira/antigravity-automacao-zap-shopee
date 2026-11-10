import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AutomationsSchedulerService } from './automations-scheduler.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  QueryAutomationsDto,
} from './dto/automations.dto';
import { AutomationStatus, DispatchStrategy } from '@prisma/client';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerService: AutomationsSchedulerService,
  ) {}

  /**
   * Lista automações do tenant com filtros opcionais.
   */
  async findAllByTenant(tenantId: string, query?: QueryAutomationsDto) {
    const where: any = { tenantId };

    if (query?.status) {
      where.status = query.status as AutomationStatus;
    }

    if (query?.search && query.search.trim().length > 0) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    return this.prisma.automation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        instance: {
          select: {
            id: true,
            instanceName: true,
            displayName: true,
            status: true,
          },
        },
        shopeeCredential: {
          select: {
            id: true,
            label: true,
            appId: true,
            isValid: true,
          },
        },
        groupRedirectLink: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            strategy: true,
          },
        },
        keywords: {
          select: { id: true, keyword: true },
        },
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                jid: true,
                participantCount: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: { executions: true },
        },
      },
    });
  }

  /**
   * Busca uma automação por ID pertencente estritamente ao tenant.
   */
  async findOne(tenantId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, tenantId },
      include: {
        instance: {
          select: {
            id: true,
            instanceName: true,
            displayName: true,
            status: true,
          },
        },
        shopeeCredential: {
          select: {
            id: true,
            label: true,
            appId: true,
            isValid: true,
          },
        },
        groupRedirectLink: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            strategy: true,
          },
        },
        keywords: {
          select: { id: true, keyword: true },
        },
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                jid: true,
                participantCount: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!automation) {
      throw new NotFoundException('Automação não encontrada para o tenant.');
    }

    return automation;
  }

  /**
   * Cria nova automação validando a propriedade de todos os recursos (instância, credencial e grupos).
   */
  async create(tenantId: string, dto: CreateAutomationDto) {
    // 1. Valida se a instância pertence ao tenant
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: dto.instanceId, tenantId },
    });
    if (!instance) {
      throw new BadRequestException('A instância WhatsApp informada não pertence a este tenant.');
    }

    // 2. Valida se a credencial Shopee pertence ao tenant
    const shopeeCred = await this.prisma.shopeeCredential.findFirst({
      where: { id: dto.shopeeCredentialId, tenantId },
    });
    if (!shopeeCred) {
      throw new BadRequestException('A credencial Shopee informada não pertence a este tenant.');
    }

    // 3. Valida se TODOS os grupos informados pertencem ao tenant e à instância
    const groups = await this.prisma.whatsAppGroup.findMany({
      where: {
        id: { in: dto.groupIds },
        tenantId,
        instanceId: dto.instanceId,
      },
    });

    if (groups.length !== dto.groupIds.length) {
      throw new BadRequestException(
        'Um ou mais grupos de WhatsApp selecionados são inválidos ou não pertencem à instância selecionada.',
      );
    }

    if (dto.groupRedirectLinkId) {
      await this.validateGroupRedirectLink(tenantId, dto.groupRedirectLinkId);
    }

    // 4. Calcula o próximo horário de execução agendado
    const nextExecutionAt = this.schedulerService.calculateNextExecution(
      {
        frequencyMinutes: dto.frequencyMinutes ?? 60,
        windowStartTime: dto.windowStartTime ?? '08:00',
        windowEndTime: dto.windowEndTime ?? '22:00',
        daysOfWeek: dto.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7],
      },
      new Date(),
    );

    // 5. Cria a automação e associa palavras-chave e grupos
    const automation = await this.prisma.automation.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        instanceId: dto.instanceId,
        shopeeCredentialId: dto.shopeeCredentialId,
        groupRedirectLinkId: dto.groupRedirectLinkId || null,
        dispatchStrategy: (dto.dispatchStrategy || 'ALL_SEQUENTIAL') as DispatchStrategy,
        captionTemplate: dto.captionTemplate?.trim() || null,
        status: AutomationStatus.ACTIVE,
        frequencyMinutes: dto.frequencyMinutes ?? 60,
        dailyExecutionLimit: dto.dailyExecutionLimit ?? 20,
        jitterSeconds: dto.jitterSeconds ?? 10,
        windowStartTime: dto.windowStartTime ?? '08:00',
        windowEndTime: dto.windowEndTime ?? '22:00',
        daysOfWeek: dto.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7],
        dedupWindowDays: dto.dedupWindowDays ?? 7,
        nextExecutionAt,
        keywords: {
          create: dto.keywords.map((k) => ({ keyword: k.trim() })),
        },
        groups: {
          create: dto.groupIds.map((gid) => ({ groupId: gid })),
        },
      },
      include: {
        keywords: true,
        groups: { include: { group: true } },
        groupRedirectLink: {
          select: { id: true, name: true, slug: true, isActive: true, strategy: true },
        },
      },
    });

    this.logger.log(`Automação criada: ${automation.id} (${automation.name}) para o tenant ${tenantId}`);
    return automation;
  }

  /**
   * Atualiza uma automação existente somente quando estiver pausada ou inativa (`PAUSED` | `INACTIVE`),
   * recalculando agendamento para retomada futura sem alterar o status atual.
   */
  async update(tenantId: string, id: string, dto: UpdateAutomationDto) {
    const existing = await this.findOne(tenantId, id);

    // Regra de negócio (DEC-004): somente automações pausadas ou inativas podem ser editadas
    const editableStatuses: AutomationStatus[] = [
      AutomationStatus.PAUSED,
      AutomationStatus.INACTIVE,
    ];
    if (!editableStatuses.includes(existing.status)) {
      throw new ConflictException(
        'Somente automações pausadas ou inativas podem ser editadas. Pause ou inative a automação antes de editar.',
      );
    }

    // Valida recursos se alterados
    if (dto.instanceId) {
      const inst = await this.prisma.whatsAppInstance.findFirst({
        where: { id: dto.instanceId, tenantId },
      });
      if (!inst) throw new BadRequestException('Instância WhatsApp não pertence a este tenant.');

      if (dto.instanceId !== existing.instanceId && !dto.groupIds) {
        throw new BadRequestException(
          'Ao alterar a instância WhatsApp, informe também os grupos destinatários vinculados à nova instância.',
        );
      }
    }

    if (dto.shopeeCredentialId) {
      const cred = await this.prisma.shopeeCredential.findFirst({
        where: { id: dto.shopeeCredentialId, tenantId },
      });
      if (!cred) throw new BadRequestException('Credencial Shopee não pertence a este tenant.');
    }

    // Se forneceu nova lista de grupos, valida propriedade
    if (dto.groupIds) {
      const targetInstanceId = dto.instanceId || existing.instanceId;
      const validGroups = await this.prisma.whatsAppGroup.findMany({
        where: {
          id: { in: dto.groupIds },
          tenantId,
          instanceId: targetInstanceId,
        },
      });
      if (validGroups.length !== dto.groupIds.length) {
        throw new BadRequestException('Grupos selecionados inválidos para a instância.');
      }
    }

    if (dto.groupRedirectLinkId) {
      await this.validateGroupRedirectLink(tenantId, dto.groupRedirectLinkId);
    }

    // Recalcula próxima execução se horários foram alterados
    const frequencyMinutes = dto.frequencyMinutes ?? existing.frequencyMinutes;
    const windowStartTime = dto.windowStartTime ?? existing.windowStartTime;
    const windowEndTime = dto.windowEndTime ?? existing.windowEndTime;
    const daysOfWeek = dto.daysOfWeek ?? existing.daysOfWeek;

    const nextExecutionAt = this.schedulerService.calculateNextExecution(
      {
        frequencyMinutes,
        windowStartTime,
        windowEndTime,
        daysOfWeek,
      },
      new Date(),
    );

    // Atualização com transação para keywords e grupos
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.keywords) {
        await tx.automationKeyword.deleteMany({ where: { automationId: id } });
        await tx.automationKeyword.createMany({
          data: dto.keywords.map((k) => ({ automationId: id, keyword: k.trim() })),
        });
      }

      if (dto.groupIds) {
        await tx.automationGroup.deleteMany({ where: { automationId: id } });
        await tx.automationGroup.createMany({
          data: dto.groupIds.map((gid) => ({ automationId: id, groupId: gid })),
        });
      }

      return tx.automation.update({
        where: { id },
        data: {
          name: dto.name ? dto.name.trim() : existing.name,
          instanceId: dto.instanceId ?? existing.instanceId,
          shopeeCredentialId: dto.shopeeCredentialId ?? existing.shopeeCredentialId,
          groupRedirectLinkId:
            dto.groupRedirectLinkId !== undefined
              ? dto.groupRedirectLinkId
              : existing.groupRedirectLinkId,
          dispatchStrategy: (dto.dispatchStrategy ?? existing.dispatchStrategy) as DispatchStrategy,
          captionTemplate:
            dto.captionTemplate !== undefined
              ? dto.captionTemplate?.trim() || null
              : existing.captionTemplate,
          frequencyMinutes,
          dailyExecutionLimit: dto.dailyExecutionLimit ?? existing.dailyExecutionLimit,
          jitterSeconds: dto.jitterSeconds ?? existing.jitterSeconds,
          windowStartTime,
          windowEndTime,
          daysOfWeek,
          dedupWindowDays: dto.dedupWindowDays ?? existing.dedupWindowDays,
          nextExecutionAt,
        },
        include: {
          keywords: true,
          groups: { include: { group: true } },
          groupRedirectLink: {
            select: { id: true, name: true, slug: true, isActive: true, strategy: true },
          },
        },
      });
    });

    return updated;
  }

  /**
   * Pausa temporariamente a automação (`PAUSED`). Não permite pausar automação inativa/excluída.
   */
  async pause(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (
      existing.status === AutomationStatus.INACTIVE ||
      existing.status === AutomationStatus.DELETED
    ) {
      throw new ConflictException(
        'Não é possível pausar uma automação inativa ou excluída. Reative-a antes.',
      );
    }

    const updated = await this.prisma.automation.update({
      where: { id },
      data: { status: AutomationStatus.PAUSED },
    });

    return { success: true, message: 'Automação pausada com sucesso.', status: updated.status };
  }

  /**
   * Inativa a automação (`INACTIVE`), desabilitando execuções e liberando exclusão definitiva.
   */
  async deactivate(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status === AutomationStatus.DELETED) {
      throw new ConflictException('Automação já foi excluída.');
    }

    const updated = await this.prisma.automation.update({
      where: { id },
      data: {
        status: AutomationStatus.INACTIVE,
        nextExecutionAt: null,
      },
    });

    return {
      success: true,
      message: 'Automação inativada com sucesso.',
      status: updated.status,
    };
  }

  /**
   * Retoma ou reativa a automação (`ACTIVE`) a partir de `PAUSED` ou `INACTIVE`, recalculando horários.
   */
  async resume(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status === AutomationStatus.DELETED) {
      throw new ConflictException('Automação excluída não pode ser reativada.');
    }

    const nextExecutionAt = this.schedulerService.calculateNextExecution(
      {
        frequencyMinutes: existing.frequencyMinutes,
        windowStartTime: existing.windowStartTime,
        windowEndTime: existing.windowEndTime,
        daysOfWeek: existing.daysOfWeek,
      },
      new Date(),
    );

    const updated = await this.prisma.automation.update({
      where: { id },
      data: {
        status: AutomationStatus.ACTIVE,
        nextExecutionAt,
      },
    });

    return { success: true, message: 'Automação reativada com sucesso.', status: updated.status };
  }

  /**
   * Disparo manual imediato enfileirando job prioritário no BullMQ.
   */
  async executeNow(tenantId: string, id: string) {
    const automation = await this.findOne(tenantId, id);

    if (
      automation.status === AutomationStatus.INACTIVE ||
      automation.status === AutomationStatus.DELETED
    ) {
      throw new ConflictException(
        'Automação inativa não pode ser disparada. Reative a automação antes de executar.',
      );
    }

    const { jobId } = await this.schedulerService.enqueueAutomationJob(
      automation.id,
      tenantId,
      true,
    );

    return {
      success: true,
      message: 'Disparo manual enfileirado com sucesso para processamento imediato.',
      jobId,
    };
  }

  /**
   * Exclui a automação somente quando estiver inativa (`INACTIVE`).
   */
  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.status !== AutomationStatus.INACTIVE) {
      throw new ConflictException(
        'Somente automações inativas podem ser excluídas. Inative a automação antes de excluir.',
      );
    }

    await this.prisma.automation.delete({
      where: { id },
    });

    return { success: true, message: 'Automação removida com sucesso.' };
  }

  /**
   * Lista o histórico de execuções da automação.
   */
  async getExecutions(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.automationExecution.findMany({
      where: { automationId: id, tenantId },
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        productSnapshot: true,
        affiliateLink: true,
        publications: {
          include: {
            group: {
              select: { id: true, name: true, jid: true },
            },
          },
        },
      },
    });
  }

  private async validateGroupRedirectLink(tenantId: string, linkId: string) {
    const link = await this.prisma.groupRedirectLink.findFirst({
      where: { id: linkId, tenantId },
    });
    if (!link) {
      throw new BadRequestException(
        'O Link Permanente de Grupo informado não pertence a este tenant.',
      );
    }
    return link;
  }
}
