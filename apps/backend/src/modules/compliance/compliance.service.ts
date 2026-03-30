import { Injectable } from '@nestjs/common';
import { RestPeriodValidationService } from './services/rest-period-validation.service';
import { DailyLimitValidationService } from './services/daily-limit-validation.service';
import { WeeklyLimitValidationService } from './services/weekly-limit-validation.service';
import { ConsecutiveDaysValidationService } from './services/consecutive-days-validation.service';
import { ValidationResult } from './interfaces';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly restPeriodValidation: RestPeriodValidationService,
    private readonly dailyLimitValidation: DailyLimitValidationService,
    private readonly weeklyLimitValidation: WeeklyLimitValidationService,
    private readonly consecutiveDaysValidation: ConsecutiveDaysValidationService
  ) {}

  /**
   * Validate rest period between shifts
   * Requirements: 4.4, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  async validateRestPeriod(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<ValidationResult> {
    return this.restPeriodValidation.validate(staffId, newShiftStart, newShiftEnd);
  }

  /**
   * Validate daily hour limit
   * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
   */
  async validateDailyLimit(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<ValidationResult> {
    return this.dailyLimitValidation.validate(locationId, staffId, newShiftStart, newShiftEnd);
  }

  /**
   * Validate weekly hour limit
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  async validateWeeklyLimit(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<ValidationResult> {
    return this.weeklyLimitValidation.validate(locationId, staffId, newShiftStart, newShiftEnd);
  }

  /**
   * Validate consecutive days limit
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   */
  async validateConsecutiveDays(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    staffTimezone: string
  ): Promise<ValidationResult> {
    return this.consecutiveDaysValidation.validate(
      locationId,
      staffId,
      newShiftStart,
      staffTimezone
    );
  }

  /**
   * Validate all compliance rules
   * Requirements: 4.5
   */
  async validateAll(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date,
    staffTimezone: string
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    const restPeriodResult = await this.validateRestPeriod(staffId, newShiftStart, newShiftEnd);
    results.push(restPeriodResult);
    if (!restPeriodResult.isValid) {
      return results;
    }

    const dailyLimitResult = await this.validateDailyLimit(
      locationId,
      staffId,
      newShiftStart,
      newShiftEnd
    );
    results.push(dailyLimitResult);
    if (!dailyLimitResult.isValid) {
      return results;
    }

    const weeklyLimitResult = await this.validateWeeklyLimit(
      locationId,
      staffId,
      newShiftStart,
      newShiftEnd
    );
    results.push(weeklyLimitResult);
    if (!weeklyLimitResult.isValid) {
      return results;
    }

    const consecutiveDaysResult = await this.validateConsecutiveDays(
      locationId,
      staffId,
      newShiftStart,
      staffTimezone
    );
    results.push(consecutiveDaysResult);

    return results;
  }
}
