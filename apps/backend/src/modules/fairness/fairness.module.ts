import { Module } from '@nestjs/common';
import { FairnessService } from './fairness.service';
import { FairnessRepository } from './repositories/fairness.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FairnessService, FairnessRepository],
  exports: [FairnessService],
})
export class FairnessModule {}
