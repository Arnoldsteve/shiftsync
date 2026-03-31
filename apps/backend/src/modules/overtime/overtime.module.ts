import { Module } from '@nestjs/common';
import { OvertimeService } from './overtime.service';
import { OvertimeController } from './overtime.controller';
import { OvertimeRepository } from './repositories/overtime.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [OvertimeController],
  providers: [OvertimeService, OvertimeRepository],
  exports: [OvertimeService],
})
export class OvertimeModule {}
