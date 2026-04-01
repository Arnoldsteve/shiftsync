import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ShiftManagementService } from './services/shift-management.service';
import { StaffAssignmentService } from './services/staff-assignment.service';
import { SchedulePublishingService } from './services/schedule-publishing.service';
import { ShiftPickupService } from './services/shift-pickup.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleRepository } from './repositories/schedule.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { ConflictModule } from '../conflict/conflict.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UserModule } from '../user/user.module';
import { SwapModule } from '../swap/swap.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CacheModule,
    ConflictModule,
    ComplianceModule,
    RealtimeModule,
    UserModule,
    SwapModule,
  ],
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    ShiftManagementService,
    StaffAssignmentService,
    SchedulePublishingService,
    ShiftPickupService,
    ScheduleRepository,
  ],
  exports: [ScheduleService],
})
export class ScheduleModule {}
