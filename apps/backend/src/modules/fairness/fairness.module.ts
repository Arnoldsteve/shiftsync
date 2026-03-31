import { Module, forwardRef } from '@nestjs/common';
import { FairnessService } from './fairness.service';
import { FairnessController } from './fairness.controller';
import { FairnessRepository } from './repositories/fairness.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, forwardRef(() => QueueModule), UserModule],
  controllers: [FairnessController],
  providers: [FairnessService, FairnessRepository],
  exports: [FairnessService],
})
export class FairnessModule {}
