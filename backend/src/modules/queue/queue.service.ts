import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly redisConnection: Redis;
  private readonly automationQueue: Queue;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.redisConnection = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.automationQueue = new Queue('automations-execution-queue', {
      connection: this.redisConnection,
    });
  }

  async acquireLock(key: string, value: string, ttlSeconds = 600): Promise<boolean> {
    try {
      const result = await this.redisConnection.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
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
    } catch (error) {
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

  async onModuleDestroy() {
    await this.automationQueue.close();
    await this.redisConnection.quit();
  }
}
