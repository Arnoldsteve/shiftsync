import { Module } from '@nestjs/common';
import { FairnessService } from './fairness.service';
import { FairnessController } from './fairness.controller';
import { FairnessRepository } from './repositories/fairness.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [FairnessController],
  providers: [FairnessService, FairnessRepository],
  exports: [FairnessService],
})
export class FairnessModule {}
