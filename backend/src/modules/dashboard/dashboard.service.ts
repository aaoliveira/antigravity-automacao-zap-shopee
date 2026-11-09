import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AutomationStatus, InstanceStatus, PublicationStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna os indicadores agregados em tempo real para os cards do painel e as últimas publicações.
   */
  async getSummary(tenantId: string) {
    const [
      activeAutomations,
      pausedAutomations,
      connectedInstances,
      totalInstances,
      successfulPublications,
      failedPublications,
      recentExecutions,
    ] = await Promise.all([
      this.prisma.automation.count({
        where: { tenantId, status: AutomationStatus.ACTIVE },
      }),
      this.prisma.automation.count({
        where: { tenantId, status: AutomationStatus.PAUSED },
      }),
      this.prisma.whatsAppInstance.count({
        where: { tenantId, status: InstanceStatus.CONNECTED },
      }),
      this.prisma.whatsAppInstance.count({
        where: { tenantId },
      }),
      this.prisma.publication.count({
        where: {
          execution: { tenantId },
          status: PublicationStatus.SUCCESS,
        },
      }),
      this.prisma.publication.count({
        where: {
          execution: { tenantId },
          status: PublicationStatus.FAILED,
        },
      }),
      this.prisma.automationExecution.findMany({
        where: { tenantId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          automation: {
            select: { id: true, name: true },
          },
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
      }),
    ]);

    return {
      automations: {
        active: activeAutomations,
        paused: pausedAutomations,
        total: activeAutomations + pausedAutomations,
      },
      instances: {
        connected: connectedInstances,
        total: totalInstances,
      },
      publications: {
        success: successfulPublications,
        failed: failedPublications,
        total: successfulPublications + failedPublications,
      },
      recentExecutions,
    };
  }

  /**
   * Retorna as próximas 5 execuções agendadas de automações ativas.
   */
  async getUpcoming(tenantId: string) {
    return this.prisma.automation.findMany({
      where: {
        tenantId,
        status: AutomationStatus.ACTIVE,
        nextExecutionAt: { not: null },
      },
      orderBy: { nextExecutionAt: 'asc' },
      take: 5,
      select: {
        id: true,
        name: true,
        nextExecutionAt: true,
        frequencyMinutes: true,
        windowStartTime: true,
        windowEndTime: true,
        instance: {
          select: { id: true, displayName: true, status: true },
        },
        _count: {
          select: { groups: true },
        },
      },
    });
  }
}
