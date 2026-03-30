import { Injectable, Logger } from '@nestjs/common';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { ValidationResult } from '../interfaces';

@Injectable()
export class RestPeriodValidationService {
  private readonly logger = new Logger(RestPeriodValidationService.name);
  private readonly REST_PERIOD_HOURS = 10;

  constructor(private readonly complianceRepository: ComplianceRepository) {}

  /**
   * Validate rest period between shifts
   * Requirements: 4.4, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  async validate(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<ValidationResult> {
    try {
      const newStartUTC = new Date(newShiftStart);
      const newEndUTC = new Date(newShiftEnd);

      const { previousShift, nextShift } = await this.complianceRepository.findAdjacentShifts(
        staffId,
        newStartUTC,
        newEndUTC
      );

      if (previousShift) {
        const previousEndUTC = new Date(previousShift.endTime);
        const gapBeforeHours =
          (newStartUTC.getTime() - previousEndUTC.getTime()) / (1000 * 60 * 60);

        if (gapBeforeHours < this.REST_PERIOD_HOURS) {
          return {
            isValid: false,
            validationType: 'REST_PERIOD',
            message: `Insufficient rest period before shift. Required: ${this.REST_PERIOD_HOURS} hours, Found: ${gapBeforeHours.toFixed(2)} hours`,
            details: {
              currentValue: gapBeforeHours,
              limitValue: this.REST_PERIOD_HOURS,
              violatingShiftId: previousShift.id,
              previousShiftEnd: previousShift.endTime,
              newShiftStart: newStartUTC,
            },
          };
        }
      }

      if (nextShift) {
        const nextStartUTC = new Date(nextShift.startTime);
        const gapAfterHours = (nextStartUTC.getTime() - newEndUTC.getTime()) / (1000 * 60 * 60);

        if (gapAfterHours < this.REST_PERIOD_HOURS) {
          return {
            isValid: false,
            validationType: 'REST_PERIOD',
            message: `Insufficient rest period after shift. Required: ${this.REST_PERIOD_HOURS} hours, Found: ${gapAfterHours.toFixed(2)} hours`,
            details: {
              currentValue: gapAfterHours,
              limitValue: this.REST_PERIOD_HOURS,
              violatingShiftId: nextShift.id,
              newShiftEnd: newEndUTC,
              nextShiftStart: nextShift.startTime,
            },
          };
        }
      }

      return {
        isValid: true,
        validationType: 'REST_PERIOD',
        message: 'Rest period validation passed',
      };
    } catch (error) {
      this.logger.error(`Error validating rest period for staff ${staffId}:`, error);
      throw error;
    }
  }
}
