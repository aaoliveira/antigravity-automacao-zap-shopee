import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../database/prisma.service';
import { AutomationStatus } from '@prisma/client';

export interface SchedulerConfig {
  frequencyMinutes: number;
  windowStartTime: string; // HH:mm
  windowEndTime: string;   // HH:mm
  daysOfWeek: number[];    // 1 (Segunda) a 7 (Domingo)
  timezone?: string;
}

@Injectable()
export class AutomationsSchedulerService {
  private readonly logger = new Logger(AutomationsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Converte o dia da semana de JavaScript (0: Domingo, 1: Segunda... 6: Sábado)
   * para a convenção ISO adotada no sistema (1: Segunda a 7: Domingo).
   */
  private getIsoDayOfWeek(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  /**
   * Calcula o próximo horário de execução considerando frequência, janela horária e dias da semana.
   */
  calculateNextExecution(config: SchedulerConfig, fromDate: Date = new Date()): Date {
    const [startHour, startMin] = config.windowStartTime.split(':').map((v) => parseInt(v, 10));
    const [endHour, endMin] = config.windowEndTime.split(':').map((v) => parseInt(v, 10));

    // Candidato inicial: adiciona frequencyMinutes
    const candidate = new Date(fromDate.getTime() + config.frequencyMinutes * 60 * 1000);

    // Ajusta minutos para frente se estiver no passado
    if (candidate.getTime() <= fromDate.getTime()) {
      candidate.setTime(fromDate.getTime() + 60 * 1000);
    }

    // Limite de segurança de 30 dias de busca
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const currentIsoDay = this.getIsoDayOfWeek(candidate);

      // Se o dia da semana não for permitido, avança para as 00:00 do dia seguinte
      if (!config.daysOfWeek.includes(currentIsoDay)) {
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(startHour, startMin, 0, 0);
        continue;
      }

      const currentMinutes = candidate.getHours() * 60 + candidate.getMinutes();
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Se estiver antes do início da janela de hoje, ajusta para o horário de início
      if (currentMinutes < startMinutes) {
        candidate.setHours(startHour, startMin, 0, 0);
        return candidate;
      }

      // Se estiver dentro da janela de hoje, é o candidato perfeito!
      if (currentMinutes <= endMinutes) {
        return candidate;
      }

      // Se ultrapassou o horário de fim de hoje, avança para o início da janela de amanhã
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(startHour, startMin, 0, 0);
    }

    return candidate;
  }

  /**
   * Enfileira a execução de uma automação na fila BullMQ com controle de duplicidade.
   */
  async enqueueAutomationJob(
    automationId: string,
    tenantId: string,
    isManual = false,
  ): Promise<{ enqueued: boolean; jobId: string }> {
    const queue = this.queueService.getAutomationQueue();
    const timestamp = Date.now();
    const jobId = isManual
      ? `manual-${automationId}-${timestamp}`
      : `scheduled-${automationId}-${Math.floor(timestamp / 60000)}`;

    await queue.add(
      'execute-automation',
      {
        automationId,
        tenantId,
        isManual,
        triggeredAt: new Date().toISOString(),
      },
      {
        jobId,
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 1, // Retries são gerenciados com backoff granular pelo executor
      },
    );

    this.logger.log(
      `Job enfileirado: ${jobId} para automação ${automationId} (tenant: ${tenantId}, manual: ${isManual})`,
    );

    return { enqueued: true, jobId };
  }

  /**
   * Varre e enfileira automações ativas cujo horário agendado chegou (nextExecutionAt <= now).
   */
  async checkAndDispatchDueAutomations(): Promise<number> {
    const now = new Date();

    const dueAutomations = await this.prisma.automation.findMany({
      where: {
        status: AutomationStatus.ACTIVE,
        nextExecutionAt: { lte: now },
      },
      select: {
        id: true,
        tenantId: true,
        frequencyMinutes: true,
        windowStartTime: true,
        windowEndTime: true,
        daysOfWeek: true,
      },
      take: 50,
    });

    let dispatchedCount = 0;

    for (const auto of dueAutomations) {
      try {
        await this.enqueueAutomationJob(auto.id, auto.tenantId, false);

        // Atualiza temporariamente o nextExecutionAt para não re-enfileirar no próximo ciclo
        const nextTime = this.calculateNextExecution(
          {
            frequencyMinutes: auto.frequencyMinutes,
            windowStartTime: auto.windowStartTime,
            windowEndTime: auto.windowEndTime,
            daysOfWeek: auto.daysOfWeek,
          },
          now,
        );

        await this.prisma.automation.update({
          where: { id: auto.id },
          data: { nextExecutionAt: nextTime },
        });

        dispatchedCount++;
      } catch (err: any) {
        this.logger.error(`Falha ao despachar automação ${auto.id}: ${err.message}`);
      }
    }

    return dispatchedCount;
  }
}
