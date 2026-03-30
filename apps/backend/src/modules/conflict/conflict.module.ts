import { Module } from '@nestjs/common';
import { ConflictService } from './conflict.service';
import { ConflictRepository } from './repositories/conflict.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { LockModule } from '../lock/lock.module';

@Module({
  imports: [PrismaModule, LockModule],
  providers: [ConflictService, ConflictRepository],
  exports: [ConflictService],
})
export class ConflictModule {}
