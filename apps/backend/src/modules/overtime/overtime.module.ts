import { Module } from '@nestjs/common';
import { OvertimeService } from './overtime.service';
import { OvertimeRepository } from './repositories/overtime.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OvertimeService, OvertimeRepository],
  exports: [OvertimeService],
})
export class OvertimeModule {}
