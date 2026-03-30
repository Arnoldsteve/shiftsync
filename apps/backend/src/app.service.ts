import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async getHealth() {
    const redisHealth = await this.redis.healthCheck();

    let dbHealth = { status: 'unknown' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbHealth = { status: 'healthy' };
    } catch (error) {
      dbHealth = { status: 'unhealthy' };
    }

    const overallStatus =
      dbHealth.status === 'healthy' && redisHealth.status === 'healthy' ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    };
  }
}
