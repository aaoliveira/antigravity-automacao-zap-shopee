import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExecutionStatus } from '@prisma/client';

export interface HistoryQueryDto {
  status?: string;
  automationId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista execuções de automação paginadas com filtros de status e automação.
   */
  async listExecutions(tenantId: string, query: HistoryQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.status) {
      where.status = query.status as ExecutionStatus;
    }

    if (query.automationId) {
      where.automationId = query.automationId;
    }

    const [total, items] = await Promise.all([
      this.prisma.automationExecution.count({ where }),
      this.prisma.automationExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
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
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca detalhes completos de uma execução.
   */
  async getExecutionDetails(tenantId: string, id: string) {
    const execution = await this.prisma.automationExecution.findFirst({
      where: { id, tenantId },
      include: {
        automation: true,
        productSnapshot: true,
        affiliateLink: true,
        publications: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Execução não encontrada para este tenant.');
    }

    return execution;
  }
}
