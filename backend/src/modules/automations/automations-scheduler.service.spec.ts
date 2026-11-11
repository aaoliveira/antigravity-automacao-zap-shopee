import { AutomationsSchedulerService } from './automations-scheduler.service';
import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../queue/queue.service';

describe('AutomationsSchedulerService - Unit Tests', () => {
  let scheduler: AutomationsSchedulerService;
  let mockPrisma: any;
  let mockQueueService: any;
  let mockQueue: any;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    mockQueueService = {
      getAutomationQueue: jest.fn().mockReturnValue(mockQueue),
    };

    mockPrisma = {
      automation: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    scheduler = new AutomationsSchedulerService(
      mockPrisma as PrismaService,
      mockQueueService as QueueService,
    );
  });

  describe('calculateNextExecution', () => {
    it('deve somar a frequência quando estiver dentro da janela permitida', () => {
      // Terça-feira, 10:00
      const baseDate = new Date('2026-11-10T10:00:00');

      const next = scheduler.calculateNextExecution(
        {
          frequencyMinutes: 60,
          windowStartTime: '08:00',
          windowEndTime: '22:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        },
        baseDate,
      );

      // Deve ser 11:00 do mesmo dia
      expect(next.getHours()).toBe(11);
      expect(next.getMinutes()).toBe(0);
      expect(next.getDate()).toBe(baseDate.getDate());
    });

    it('deve ajustar para o início da janela se o horário estiver antes do início', () => {
      // Terça-feira, 05:00
      const baseDate = new Date('2026-11-10T05:00:00');

      const next = scheduler.calculateNextExecution(
        {
          frequencyMinutes: 30,
          windowStartTime: '08:00',
          windowEndTime: '22:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        },
        baseDate,
      );

      // Deve ajustar para 08:00 do mesmo dia
      expect(next.getHours()).toBe(8);
      expect(next.getMinutes()).toBe(0);
      expect(next.getDate()).toBe(baseDate.getDate());
    });

    it('deve avançar para o início da janela do dia seguinte se ultrapassar o fim da janela', () => {
      // Terça-feira, 22:30 (janela termina às 22:00)
      const baseDate = new Date('2026-11-10T22:30:00');

      const next = scheduler.calculateNextExecution(
        {
          frequencyMinutes: 60,
          windowStartTime: '08:00',
          windowEndTime: '22:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        },
        baseDate,
      );

      // Deve ir para o dia seguinte às 08:00
      expect(next.getHours()).toBe(8);
      expect(next.getMinutes()).toBe(0);
      expect(next.getDate()).toBe(baseDate.getDate() + 1);
    });

    it('deve pular dias não permitidos configurados em daysOfWeek', () => {
      // Sexta-feira, 23:00. daysOfWeek apenas dias úteis (1 a 5: Seg-Sex)
      const friday = new Date('2026-11-13T23:00:00');

      const next = scheduler.calculateNextExecution(
        {
          frequencyMinutes: 60,
          windowStartTime: '08:00',
          windowEndTime: '22:00',
          daysOfWeek: [1, 2, 3, 4, 5], // Apenas segunda a sexta
        },
        friday,
      );

      // Deve pular sábado (14) e domingo (15) e agendar para segunda-feira (16) às 08:00
      expect(next.getDay()).toBe(1); // 1 = Segunda-feira
      expect(next.getHours()).toBe(8);
      expect(next.getMinutes()).toBe(0);
    });
  });

  describe('enqueueAutomationJob', () => {
    it('deve adicionar job na fila com deduplicação de jobId', async () => {
      const res = await scheduler.enqueueAutomationJob('auto-1', 'tenant-1', false);

      expect(res.enqueued).toBe(true);
      expect(res.jobId).toContain('scheduled-auto-1-');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-automation',
        expect.objectContaining({
          automationId: 'auto-1',
          tenantId: 'tenant-1',
          isManual: false,
        }),
        expect.objectContaining({
          jobId: expect.stringContaining('scheduled-auto-1-'),
        }),
      );
    });

    it('deve criar jobId com prefixo manual em disparos manuais', async () => {
      const res = await scheduler.enqueueAutomationJob('auto-1', 'tenant-1', true);

      expect(res.enqueued).toBe(true);
      expect(res.jobId).toContain('manual-auto-1-');
    });
  });

  describe('calculateInitialExecution, timezone & checkAndDispatchDueAutomations', () => {
    it('deve agendar primeira execução em ~5s quando estiver dentro da janela horária', () => {
      const inside = new Date('2026-11-11T17:00:00Z'); // 14:00 BRT
      const initial = scheduler.calculateInitialExecution(
        {
          frequencyMinutes: 60,
          windowStartTime: '08:00',
          windowEndTime: '22:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          timezone: 'America/Sao_Paulo',
        },
        inside,
      );

      expect(initial.getTime() - inside.getTime()).toBe(5000);
    });

    it('deve agendar primeira execução para abertura da próxima janela se estiver fora do horário', () => {
      const lateNight = new Date('2026-11-12T02:30:00Z'); // 23:30 BRT do dia 11
      const initial = scheduler.calculateInitialExecution(
        {
          frequencyMinutes: 60,
          windowStartTime: '08:00',
          windowEndTime: '22:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          timezone: 'America/Sao_Paulo',
        },
        lateNight,
      );

      // 08:00 BRT = 11:00 UTC do dia 12
      expect(initial.toISOString()).toBe('2026-11-12T11:00:00.000Z');
    });

    it('checkAndDispatchDueAutomations deve fazer claim atômico, enfileirar job agendado e liberar lock', async () => {
      mockQueueService.acquireLock = jest.fn().mockResolvedValue(true);
      mockQueueService.releaseLock = jest.fn().mockResolvedValue(true);
      const dueDate = new Date(Date.now() - 60_000);
      mockPrisma.automation.findMany.mockResolvedValue([
        {
          id: 'auto-due-1',
          tenantId: 'tenant-1',
          frequencyMinutes: 30,
          windowStartTime: '00:00',
          windowEndTime: '23:59',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          nextExecutionAt: dueDate,
          tenant: { timezone: 'America/Sao_Paulo' },
        },
      ]);
      mockPrisma.automation.updateMany = jest.fn().mockResolvedValue({ count: 1 });

      const count = await scheduler.checkAndDispatchDueAutomations();

      expect(count).toBe(1);
      expect(mockQueueService.acquireLock).toHaveBeenCalledWith(
        'lock:scheduler:sweep',
        expect.any(String),
        20,
      );
      expect(mockPrisma.automation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'auto-due-1',
            nextExecutionAt: dueDate,
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-automation',
        expect.objectContaining({
          automationId: 'auto-due-1',
          tenantId: 'tenant-1',
          isManual: false,
        }),
        expect.any(Object),
      );
      expect(mockQueueService.releaseLock).toHaveBeenCalled();
    });

    it('checkAndDispatchDueAutomations deve reverter nextExecutionAt se enqueue falhar', async () => {
      const dueDate = new Date(Date.now() - 60_000);
      mockPrisma.automation.findMany.mockResolvedValue([
        {
          id: 'auto-fail-q',
          tenantId: 'tenant-1',
          frequencyMinutes: 30,
          windowStartTime: '00:00',
          windowEndTime: '23:59',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          nextExecutionAt: dueDate,
          tenant: { timezone: 'America/Sao_Paulo' },
        },
      ]);
      mockPrisma.automation.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      mockQueue.add.mockRejectedValueOnce(new Error('Redis offline'));
      mockPrisma.automation.update.mockResolvedValue({});

      const count = await scheduler.checkAndDispatchDueAutomations();

      expect(count).toBe(0);
      expect(mockPrisma.automation.update).toHaveBeenCalledWith({
        where: { id: 'auto-fail-q' },
        data: { nextExecutionAt: dueDate },
      });
    });
  });
});
