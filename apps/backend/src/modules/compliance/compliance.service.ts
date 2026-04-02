import { Injectable } from '@nestjs/common';
import { RestPeriodValidationService } from './services/rest-period-validation.service';
import { DailyLimitValidationService } from './services/daily-limit-validation.service';
import { WeeklyLimitValidationService } from './services/weekly-limit-validation.service';
import { ConsecutiveDaysValidationService } from './services/consecutive-days-validation.service';
import { AvailabilityValidationService } from './services/availability-validation.service';
import { EnhancedComplianceValidationService } from './services/enhanced-compliance-validation.service';
import { ComplianceRepository } from './repositories/compliance.repository';
import { ValidationResult, GraduatedValidationResult } from './interfaces';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly restPeriodValidation: RestPeriodValidationService,
    private readonly dailyLimitValidation: DailyLimitValidationService,
    private readonly weeklyLimitValidation: WeeklyLimitValidationService,
    private readonly consecutiveDaysValidation: ConsecutiveDaysValidationService,
    private readonly availabilityValidation: AvailabilityValidationService,
    private readonly enhancedValidation: EnhancedComplianceValidationService,
    private readonly complianceRepository: ComplianceRepository
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
   * Requirements: 4.5, 31.3
   */
  async validateAll(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date,
    staffTimezone: string
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate rest period
    const restPeriodResult = await this.validateRestPeriod(staffId, newShiftStart, newShiftEnd);
    results.push(restPeriodResult);
    if (!restPeriodResult.isValid) {
      return results;
    }

    // Validate daily limit
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

    // Validate weekly limit
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

    // Validate consecutive days
    const consecutiveDaysResult = await this.validateConsecutiveDays(
      locationId,
      staffId,
      newShiftStart,
      staffTimezone
    );
    results.push(consecutiveDaysResult);
    if (!consecutiveDaysResult.isValid) {
      return results;
    }

    // Validate availability - fetch location timezone
    const location = await this.complianceRepository.findLocationById(locationId);
    const locationTimezone = location?.timezone || 'UTC';
    const availabilityResult = await this.validateAvailability(
      staffId,
      newShiftStart,
      newShiftEnd,
      locationTimezone
    );
    results.push(availabilityResult);
    if (!availabilityResult.isValid) {
      return results;
    }

    return results;
  }

  /**
   * Validate staff availability for shift
   * Requirements: 31.3, 31.4
   */
  async validateAvailability(
    staffId: string,
    shiftStart: Date,
    shiftEnd: Date,
    locationTimezone: string
  ): Promise<ValidationResult> {
    return this.availabilityValidation.validate(staffId, shiftStart, shiftEnd, locationTimezone);
  }

  /**
   * Validate with graduated warnings and errors
   * Requirements: 39.1, 39.2, 39.3, 39.4, 39.5
   */
  async validateWithGraduation(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date,
    staffTimezone: string,
    overrideReason?: string
  ): Promise<GraduatedValidationResult> {
    return this.enhancedValidation.validateWithGraduation(
      staffId,
      newShiftStart,
      newShiftEnd,
      staffTimezone,
      overrideReason
    );
  }
}
