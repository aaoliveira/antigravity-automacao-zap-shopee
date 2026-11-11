import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly redisConnection: Redis;
  private readonly workerRedisConnection: Redis;
  private readonly automationQueue: Queue;

  constructor() {
    const redisOptions: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    };

    const redisUrl = process.env.REDIS_URL?.trim();

    // Conexão dedicada para operações não-bloqueantes (Queue.add e Redis locks)
    this.redisConnection = redisUrl
      ? new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true })
      : new Redis(redisOptions);

    // Conexão separada obrigatória para o Worker do BullMQ (comandos bloqueantes BZPOPMIN)
    this.workerRedisConnection = redisUrl
      ? new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true })
      : new Redis(redisOptions);

    this.redisConnection.on('error', (err) => {
      this.logger.warn(`Erro na conexão Redis (Queue): ${err.message}`);
    });
    this.workerRedisConnection.on('error', (err) => {
      this.logger.warn(`Erro na conexão Redis (Worker): ${err.message}`);
    });

    this.automationQueue = new Queue('automations-execution-queue', {
      connection: this.redisConnection,
    });
  }

  async acquireLock(
    key: string,
    value: string,
    ttlSeconds = 600,
  ): Promise<boolean> {
    try {
      const result = await this.redisConnection.set(
        key,
        value,
        'EX',
        ttlSeconds,
        'NX',
      );
      return result === 'OK';
    } catch (error: any) {
      this.logger.error(`Erro ao adquirir lock ${key}: ${error.message}`);
      return false;
    }
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      const result = await this.redisConnection.eval(script, 1, key, value);
      return result === 1;
    } catch (error: any) {
      this.logger.error(`Erro ao liberar lock ${key}: ${error.message}`);
      return false;
    }
  }

  getAutomationQueue(): Queue {
    return this.automationQueue;
  }

  getRedisClient(): Redis {
    return this.redisConnection;
  }

  getWorkerRedisClient(): Redis {
    return this.workerRedisConnection;
  }

  async onModuleDestroy() {
    await this.automationQueue.close().catch(() => undefined);
    await Promise.all([
      this.workerRedisConnection.quit().catch(() => undefined),
      this.redisConnection.quit().catch(() => undefined),
    ]);
  }
}
