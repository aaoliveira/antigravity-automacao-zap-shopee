import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { QueueService } from '../queue/queue.service';
import { AutomationsExecutorService } from './automations-executor.service';

@Injectable()
export class AutomationsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationsProcessor.name);
  private worker: Worker;

  constructor(
    private readonly queueService: QueueService,
    private readonly executorService: AutomationsExecutorService,
  ) {}

  onModuleInit() {
    const redisClient = this.queueService.getRedisClient();

    this.worker = new Worker(
      'automations-execution-queue',
      async (job: Job) => {
        this.logger.log(`Processando job ${job.id} (${job.name})`);
        const { automationId, tenantId, isManual } = job.data;

        if (!automationId || !tenantId) {
          throw new Error('Payload inválido: automationId e tenantId são obrigatórios.');
        }

        const result = await this.executorService.execute(
          automationId,
          tenantId,
          Boolean(isManual),
        );

        return result;
      },
      {
        connection: redisClient,
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job: Job, result: any) => {
      this.logger.log(
        `Job ${job.id} finalizado com sucesso. Status: ${result?.status}`,
      );
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.error(`Job ${job?.id} falhou: ${err.message}`, err.stack);
    });

    this.logger.log('BullMQ Worker de automações inicializado com sucesso.');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('BullMQ Worker de automações finalizado.');
    }
  }
}
