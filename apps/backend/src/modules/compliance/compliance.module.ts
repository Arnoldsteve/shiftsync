import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceRepository } from './repositories/compliance.repository';
import { RestPeriodValidationService } from './services/rest-period-validation.service';
import { DailyLimitValidationService } from './services/daily-limit-validation.service';
import { WeeklyLimitValidationService } from './services/weekly-limit-validation.service';
import { ConsecutiveDaysValidationService } from './services/consecutive-days-validation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    ComplianceService,
    ComplianceRepository,
    RestPeriodValidationService,
    DailyLimitValidationService,
    WeeklyLimitValidationService,
    ConsecutiveDaysValidationService,
  ],
  exports: [ComplianceService],
})
export class ComplianceModule {}
