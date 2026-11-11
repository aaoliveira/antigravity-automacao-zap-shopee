import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AutomationStatus } from '@prisma/client';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../database/prisma.service';

export interface SchedulerConfig {
  frequencyMinutes: number;
  windowStartTime: string; // HH:mm
  windowEndTime: string; // HH:mm
  daysOfWeek: number[]; // 1 (Segunda) a 7 (Domingo)
  timezone?: string;
}

const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

@Injectable()
export class AutomationsSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AutomationsSchedulerService.name);
  private pollTimer: NodeJS.Timeout | null = null;
  private bootTimer: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.DISABLE_AUTOMATION_SCHEDULER === 'true'
    ) {
      this.logger.log(
        'Scheduler periódico de automações desabilitado neste ambiente (test/flag).',
      );
      return;
    }

    const intervalMs = Math.max(
      5000,
      parseInt(process.env.SCHEDULER_POLL_INTERVAL_MS || '15000', 10) || 15000,
    );

    // Varredura inicial rápida após inicialização dos workers BullMQ
    this.bootTimer = setTimeout(() => {
      void this.runScheduledSweep();
    }, 3000);
    this.bootTimer.unref?.();

    this.pollTimer = setInterval(() => {
      void this.runScheduledSweep();
    }, intervalMs);
    this.pollTimer.unref?.();

    this.logger.log(
      `Scheduler automático de automações iniciado (intervalo: ${intervalMs}ms).`,
    );
  }

  onModuleDestroy() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async runScheduledSweep() {
    if (this.isSweeping) return;
    this.isSweeping = true;
    try {
      const dispatched = await this.checkAndDispatchDueAutomations();
      if (dispatched > 0) {
        this.logger.log(
          `Ciclo do agendador enfileirou ${dispatched} automação(ões) vencida(s).`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Erro no ciclo automático do scheduler: ${err.message}`,
      );
    } finally {
      this.isSweeping = false;
    }
  }

  private getTimePartsInZone(
    date: Date,
    timeZone?: string,
  ): { hour: number; minute: number; isoDay: number } {
    if (!timeZone) {
      const day = date.getDay();
      return {
        hour: date.getHours(),
        minute: date.getMinutes(),
        isoDay: day === 0 ? 7 : day,
      };
    }

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
      const parts = formatter.formatToParts(date);
      const map: Record<string, string> = {};
      for (const p of parts) {
        map[p.type] = p.value;
      }
      const hour = Number.parseInt(map.hour || '0', 10) % 24;
      const minute = Number.parseInt(map.minute || '0', 10);
      const isoDay = WEEKDAY_MAP[map.weekday] ?? (date.getDay() === 0 ? 7 : date.getDay());
      return { hour, minute, isoDay };
    } catch {
      const day = date.getDay();
      return {
        hour: date.getHours(),
        minute: date.getMinutes(),
        isoDay: day === 0 ? 7 : day,
      };
    }
  }

  private parseWindowMinutes(hhmm: string, fallbackMinutes: number): number {
    const [hStr, mStr] = String(hhmm || '').split(':');
    const h = Number.parseInt(hStr, 10);
    const m = Number.parseInt(mStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return fallbackMinutes;
    return h * 60 + m;
  }

  /**
   * Verifica se uma data está dentro da janela horária e dos dias permitidos do agendamento.
   */
  isWithinScheduleWindow(
    config: SchedulerConfig,
    date: Date = new Date(),
  ): boolean {
    const { hour, minute, isoDay } = this.getTimePartsInZone(
      date,
      config.timezone,
    );
    if (Array.isArray(config.daysOfWeek) && config.daysOfWeek.length > 0) {
      if (!config.daysOfWeek.includes(isoDay)) {
        return false;
      }
    }

    const currentMinutes = hour * 60 + minute;
    const startMinutes = this.parseWindowMinutes(config.windowStartTime, 8 * 60);
    const endMinutes = this.parseWindowMinutes(config.windowEndTime, 22 * 60);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Calcula a primeira execução de uma automação recém-criada ou reativada:
   * - Se estiver dentro da janela horária e do dia permitido agora, agenda para execução imediata no próximo ciclo (5s);
   * - Caso contrário, agenda para o início da próxima janela permitida.
   */
  calculateInitialExecution(
    config: SchedulerConfig,
    fromDate: Date = new Date(),
  ): Date {
    if (this.isWithinScheduleWindow(config, fromDate)) {
      return new Date(fromDate.getTime() + 5000);
    }
    return this.calculateNextExecution(
      { ...config, frequencyMinutes: 0 },
      fromDate,
    );
  }

  /**
   * Calcula o próximo horário de execução considerando frequência, janela horária, dias da semana e fuso horário.
   */
  calculateNextExecution(
    config: SchedulerConfig,
    fromDate: Date = new Date(),
  ): Date {
    const startMinutes = this.parseWindowMinutes(config.windowStartTime, 8 * 60);
    const endMinutes = this.parseWindowMinutes(config.windowEndTime, 22 * 60);
    const freqMinutes = Math.max(0, config.frequencyMinutes || 0);
    const allowedDays =
      Array.isArray(config.daysOfWeek) && config.daysOfWeek.length > 0
        ? config.daysOfWeek
        : [1, 2, 3, 4, 5, 6, 7];

    // Candidato inicial: adiciona frequencyMinutes
    const candidate = new Date(fromDate.getTime() + freqMinutes * 60 * 1000);

    // Ajusta se não avançou (exceto quando frequencyMinutes === 0 na inicialização)
    if (freqMinutes > 0 && candidate.getTime() <= fromDate.getTime()) {
      candidate.setTime(fromDate.getTime() + 60 * 1000);
    }

    // Limite de segurança de 30 dias de busca
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const { hour, minute, isoDay } = this.getTimePartsInZone(
        candidate,
        config.timezone,
      );
      const currentMinutes = hour * 60 + minute;

      // Se o dia da semana não for permitido, avança para o início do dia seguinte
      if (!allowedDays.includes(isoDay)) {
        const minsUntilTomorrow = 24 * 60 - currentMinutes;
        candidate.setTime(candidate.getTime() + minsUntilTomorrow * 60 * 1000);
        candidate.setSeconds(0, 0);
        continue;
      }

      // Se estiver antes do início da janela de hoje, ajusta para o horário de início
      if (currentMinutes < startMinutes) {
        const diffMins = startMinutes - currentMinutes;
        candidate.setTime(candidate.getTime() + diffMins * 60 * 1000);
        candidate.setSeconds(0, 0);
        return candidate;
      }

      // Se estiver dentro da janela de hoje, é o candidato válido
      if (currentMinutes <= endMinutes) {
        return candidate;
      }

      // Se ultrapassou o horário de fim de hoje, avança para a meia-noite seguinte
      const minsUntilTomorrow = 24 * 60 - currentMinutes;
      candidate.setTime(candidate.getTime() + minsUntilTomorrow * 60 * 1000);
      candidate.setSeconds(0, 0);
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
        attempts: 1,
      },
    );

    this.logger.log(
      `Job enfileirado: ${jobId} para automação ${automationId} (tenant: ${tenantId}, manual: ${isManual})`,
    );

    return { enqueued: true, jobId };
  }

  /**
   * Varre e enfileira automações ativas cujo horário agendado chegou (nextExecutionAt <= now).
   * Usa lock distribuído no Redis e atualização condicional no banco para evitar disparos duplicados.
   */
  async checkAndDispatchDueAutomations(): Promise<number> {
    const canLock = typeof this.queueService.acquireLock === 'function';
    const sweepLockKey = 'lock:scheduler:sweep';
    const sweepLockToken = crypto.randomUUID();

    if (canLock) {
      const acquired = await this.queueService.acquireLock(
        sweepLockKey,
        sweepLockToken,
        20,
      );
      if (!acquired) {
        return 0;
      }
    }

    try {
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
          nextExecutionAt: true,
          tenant: { select: { timezone: true } },
        },
        take: 50,
      });

      let dispatchedCount = 0;

      for (const auto of dueAutomations) {
        try {
          const nextTime = this.calculateNextExecution(
            {
              frequencyMinutes: auto.frequencyMinutes,
              windowStartTime: auto.windowStartTime,
              windowEndTime: auto.windowEndTime,
              daysOfWeek: auto.daysOfWeek,
              timezone: auto.tenant?.timezone || 'America/Sao_Paulo',
            },
            now,
          );

          // Claim atômico para evitar que múltiplos schedulers disparem a mesma execução
          if (typeof this.prisma.automation.updateMany === 'function') {
            const claimed = await this.prisma.automation.updateMany({
              where: {
                id: auto.id,
                status: AutomationStatus.ACTIVE,
                nextExecutionAt: auto.nextExecutionAt,
              },
              data: { nextExecutionAt: nextTime },
            });
            if (claimed.count === 0) {
              continue;
            }
          } else {
            await this.prisma.automation.update({
              where: { id: auto.id },
              data: { nextExecutionAt: nextTime },
            });
          }

          try {
            await this.enqueueAutomationJob(auto.id, auto.tenantId, false);
            dispatchedCount++;
          } catch (enqueueErr) {
            // Reverte nextExecutionAt caso falhe ao gravar na fila
            await this.prisma.automation
              .update({
                where: { id: auto.id },
                data: { nextExecutionAt: auto.nextExecutionAt },
              })
              .catch(() => undefined);
            throw enqueueErr;
          }
        } catch (err: any) {
          this.logger.error(
            `Falha ao despachar automação ${auto.id}: ${err.message}`,
          );
        }
      }

      return dispatchedCount;
    } finally {
      if (canLock && typeof this.queueService.releaseLock === 'function') {
        await this.queueService
          .releaseLock(sweepLockKey, sweepLockToken)
          .catch(() => undefined);
      }
    }
  }
}
