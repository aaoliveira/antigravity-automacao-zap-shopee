import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private readonly redisClient: Redis;

  constructor(private readonly prisma: PrismaService) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    this.redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Public()
  @Get()
  async check() {
    let dbStatus = 'down';
    let redisStatus = 'down';

    // 1. Check PostgreSQL
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch (e) {
      dbStatus = 'down';
    }

    // 2. Check Redis
    try {
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }
      const pong = await this.redisClient.ping();
      if (pong === 'PONG') {
        redisStatus = 'up';
      }
    } catch (e) {
      redisStatus = 'down';
    }

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
        },
        redis: {
          status: redisStatus,
        },
      },
    };
  }
}
