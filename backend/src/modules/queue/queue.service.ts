import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly redisConnection: Redis;
  private readonly workerRedisConnection: Redis;
  private readonly automationQueue: Queue;
  private isDestroyed = false;

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
    if (this.isDestroyed) return false;
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
      if (!this.isDestroyed) {
        this.logger.error(`Erro ao adquirir lock ${key}: ${error.message}`);
      }
      return false;
    }
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    if (this.isDestroyed) return false;
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
      if (!this.isDestroyed) {
        this.logger.error(`Erro ao liberar lock ${key}: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Retorna o timestamp epoch (ms) até quando a instância está em cooldown global entre mensagens.
   */
  async getInstanceCooldownUntil(instanceId: string): Promise<number | null> {
    if (this.isDestroyed) return null;
    const key = `cooldown:instance:${instanceId}`;
    try {
      const raw = await this.redisConnection.get(key);
      if (!raw) return null;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    } catch (error: any) {
      if (!this.isDestroyed) {
        this.logger.warn(
          `Erro ao consultar cooldown da instância ${instanceId}: ${error.message}`,
        );
      }
      return null;
    }
  }

  /**
   * Registra cooldown mínimo global entre mensagens para o número WhatsApp (instanceId).
   */
  async setInstanceCooldown(
    instanceId: string,
    cooldownSeconds: number,
  ): Promise<void> {
    if (this.isDestroyed || !cooldownSeconds || cooldownSeconds <= 0) {
      return;
    }
    const key = `cooldown:instance:${instanceId}`;
    const untilMs = Date.now() + Math.round(cooldownSeconds * 1000);
    const ttlSeconds = Math.max(10, Math.ceil(cooldownSeconds * 2));
    try {
      await this.redisConnection.set(key, String(untilMs), 'EX', ttlSeconds);
    } catch (error: any) {
      if (!this.isDestroyed) {
        this.logger.warn(
          `Erro ao registrar cooldown da instância ${instanceId}: ${error.message}`,
        );
      }
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
    this.isDestroyed = true;
    await this.automationQueue.close().catch(() => undefined);
    await Promise.all([
      this.workerRedisConnection.quit().catch(() => undefined),
      this.redisConnection.quit().catch(() => undefined),
    ]);
  }
}
