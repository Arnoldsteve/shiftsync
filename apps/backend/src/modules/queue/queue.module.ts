import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { FairnessReportProcessor } from './processors/fairness-report.processor';
import { OvertimeReportProcessor } from './processors/overtime-report.processor';
import { queueConfig } from './queue.config';
import { FairnessModule } from '../fairness/fairness.module';
import { OvertimeModule } from '../overtime/overtime.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    // Register BullMQ queues
    BullModule.forRoot({
      connection: queueConfig.connection,
    }),
    BullModule.registerQueue(
      {
        name: 'fairness-report',
        defaultJobOptions: queueConfig.defaultJobOptions,
      },
      {
        name: 'overtime-report',
        defaultJobOptions: queueConfig.defaultJobOptions,
      }
    ),
    // Register BullBoard for queue visualization
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'fairness-report',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'overtime-report',
      adapter: BullMQAdapter,
    }),
    // Import required modules
    FairnessModule,
    OvertimeModule,
    CacheModule,
  ],
  controllers: [QueueController],
  providers: [QueueService, FairnessReportProcessor, OvertimeReportProcessor],
  exports: [QueueService],
})
export class QueueModule {}
