import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ShiftManagementService } from './services/shift-management.service';
import { StaffAssignmentService } from './services/staff-assignment.service';
import { SchedulePublishingService } from './services/schedule-publishing.service';
import { ShiftPickupService } from './services/shift-pickup.service';
import { AlternativeStaffService } from './services/alternative-staff.service';
import { HeadcountTrackingService } from './services/headcount-tracking.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleRepository } from './repositories/schedule.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { ConflictModule } from '../conflict/conflict.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { SwapModule } from '../swap/swap.module';
import { OvertimeModule } from '../overtime/overtime.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CacheModule,
    ConflictModule,
    ComplianceModule,
    RealtimeModule,
    NotificationModule,
    UserModule,
    SwapModule,
    OvertimeModule,
  ],
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    ShiftManagementService,
    StaffAssignmentService,
    SchedulePublishingService,
    ShiftPickupService,
    AlternativeStaffService,
    HeadcountTrackingService,
    ScheduleRepository,
  ],
  exports: [ScheduleService],
})
export class ScheduleModule {}
