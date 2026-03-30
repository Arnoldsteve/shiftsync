import { Module } from '@nestjs/common';
import { CalloutService } from './callout.service';
import { CalloutController } from './callout.controller';
import { CalloutReportingService } from './services/callout-reporting.service';
import { CoverageGapService } from './services/coverage-gap.service';
import { DashboardService } from './services/dashboard.service';
import { CalloutRepository } from './repositories/callout.repository';
import { CoverageGapRepository } from './repositories/coverage-gap.repository';
import { DashboardRepository } from './repositories/dashboard.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { ConflictModule } from '../conflict/conflict.module';

@Module({
  imports: [PrismaModule, AuditModule, RealtimeModule, ComplianceModule, ConflictModule],
  controllers: [CalloutController],
  providers: [
    // Main service
    CalloutService,
    // Specialized services
    CalloutReportingService,
    CoverageGapService,
    DashboardService,
    // Repositories
    CalloutRepository,
    CoverageGapRepository,
    DashboardRepository,
  ],
  exports: [CalloutService],
})
export class CalloutModule {}
