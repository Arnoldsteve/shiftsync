import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleRepository } from './repositories/schedule.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { ConflictModule } from '../conflict/conflict.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CacheModule,
    ConflictModule,
    ComplianceModule,
    RealtimeModule,
  ],
  providers: [ScheduleService, ScheduleRepository],
  exports: [ScheduleService],
})
export class ScheduleModule {}
