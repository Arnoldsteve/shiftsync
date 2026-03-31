import { Global, Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { FairnessReportProcessor } from './processors/fairness-report.processor';
import { OvertimeReportProcessor } from './processors/overtime-report.processor';
import { QUEUES } from './queue.constants';
import { QueueRateLimiter } from './rate-limiter';
import { FairnessModule } from '../fairness/fairness.module';
import { OvertimeModule } from '../overtime/overtime.module';
import { CacheModule } from '../cache/cache.module';
import { UserModule } from '../user/user.module';

/**
 * Enterprise Queues Module
 * Configures the connection to Redis and registers all system queues globally.
 *
 * ⚡ Global Module: Available across the entire application
 * ⚡ Rate Limited: Protects database from overwhelming concurrent jobs
 * ⚡ BullBoard: Visual queue monitoring at /admin/queues
 */
@Global()
@Module({
  imports: [
    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined in the environment variables');
        }

        return {
          connection: {
            url: redisUrl,
            // ⚡ Handle secure Redis (rediss://)
            tls: redisUrl.startsWith('rediss') ? {} : undefined,
            // ⚡ Required for BullMQ blocking operations
            maxRetriesPerRequest: null,
            // ⚡ Performance: Disable ready check for cloud providers
            enableReadyCheck: false,
            connectTimeout: 30000,
            keepAlive: 30000,
          },
          defaultJobOptions: {
            // ⚡ Resilience: Exponential backoff for failed jobs
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            // ⚡ Housekeeping: Keep history for debugging but clean up old data
            removeOnComplete: {
              age: 24 * 3600, // Keep completed jobs for 24 hours
              count: 1000, // Keep max 1000 completed jobs
            },
            removeOnFail: {
              age: 7 * 24 * 3600, // Keep failed jobs for 7 days
              count: 500,
            },
          },
        };
      },
    }),

    // Register all queues defined in constants
    BullModule.registerQueue({ name: QUEUES.FAIRNESS_REPORT }, { name: QUEUES.OVERTIME_REPORT }),

    // Register BullBoard for queue visualization
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUES.FAIRNESS_REPORT,
      adapter: BullMQAdapter as any,
    }),
    BullBoardModule.forFeature({
      name: QUEUES.OVERTIME_REPORT,
      adapter: BullMQAdapter as any,
    }),

    // Import required modules
    forwardRef(() => FairnessModule),
    forwardRef(() => OvertimeModule),
    CacheModule,
    UserModule,
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    FairnessReportProcessor,
    OvertimeReportProcessor,
    {
      provide: QueueRateLimiter,
      useValue: new QueueRateLimiter(50, 10), // 50 jobs/sec, 10 concurrent
    },
  ],
  exports: [BullModule, QueueService, QueueRateLimiter],
})
export class QueueModule {}
