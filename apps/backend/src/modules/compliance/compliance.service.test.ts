import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceService } from './compliance.service';
import { RestPeriodValidationService } from './services/rest-period-validation.service';
import { DailyLimitValidationService } from './services/daily-limit-validation.service';
import { WeeklyLimitValidationService } from './services/weekly-limit-validation.service';
import { ConsecutiveDaysValidationService } from './services/consecutive-days-validation.service';
import { AvailabilityValidationService } from './services/availability-validation.service';
import { EnhancedComplianceValidationService } from './services/enhanced-compliance-validation.service';
import { ComplianceRepository } from './repositories/compliance.repository';
import { ValidationResult } from './interfaces';

describe('ComplianceService', () => {
  let complianceService: ComplianceService;
  let restPeriodValidation: RestPeriodValidationService;
  let dailyLimitValidation: DailyLimitValidationService;
  let weeklyLimitValidation: WeeklyLimitValidationService;
  let consecutiveDaysValidation: ConsecutiveDaysValidationService;
  let availabilityValidation: AvailabilityValidationService;
  let enhancedValidation: EnhancedComplianceValidationService;
  let complianceRepository: ComplianceRepository;

  beforeEach(() => {
    restPeriodValidation = {
      validate: vi.fn(),
    } as any;

    dailyLimitValidation = {
      validate: vi.fn(),
    } as any;

    weeklyLimitValidation = {
      validate: vi.fn(),
    } as any;

    consecutiveDaysValidation = {
      validate: vi.fn(),
    } as any;

    availabilityValidation = {
      validate: vi.fn(),
    } as any;

    enhancedValidation = {
      validateWithGraduation: vi.fn(),
    } as any;

    complianceRepository = {
      findLocationById: vi.fn(),
    } as any;

    complianceService = new ComplianceService(
      restPeriodValidation,
      dailyLimitValidation,
      weeklyLimitValidation,
      consecutiveDaysValidation,
      availabilityValidation,
      enhancedValidation,
      complianceRepository
    );
  });

  describe('validateAll', () => {
    const locationId = 'location-1';
    const staffId = 'staff-1';
    const newShiftStart = new Date('2024-01-15T09:00:00Z');
    const newShiftEnd = new Date('2024-01-15T17:00:00Z');
    const staffTimezone = 'America/New_York';

    it('should call all validation methods and return all results when all pass', async () => {
      // Arrange
      const restPeriodResult: ValidationResult = {
        isValid: true,
        validationType: 'REST_PERIOD',
      };
      const dailyLimitResult: ValidationResult = {
        isValid: true,
        validationType: 'DAILY_LIMIT',
      };
      const weeklyLimitResult: ValidationResult = {
        isValid: true,
        validationType: 'WEEKLY_LIMIT',
      };
      const consecutiveDaysResult: ValidationResult = {
        isValid: true,
        validationType: 'CONSECUTIVE_DAYS',
      };
      const availabilityResult: ValidationResult = {
        isValid: true,
        validationType: 'AVAILABILITY',
      };

      vi.mocked(restPeriodValidation.validate).mockResolvedValue(restPeriodResult);
      vi.mocked(dailyLimitValidation.validate).mockResolvedValue(dailyLimitResult);
      vi.mocked(weeklyLimitValidation.validate).mockResolvedValue(weeklyLimitResult);
      vi.mocked(consecutiveDaysValidation.validate).mockResolvedValue(consecutiveDaysResult);
      vi.mocked(availabilityValidation.validate).mockResolvedValue(availabilityResult);
      vi.mocked(complianceRepository.findLocationById).mockResolvedValue({
        id: locationId,
        name: 'Test Location',
        timezone: 'America/Los_Angeles',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const results = await complianceService.validateAll(
        locationId,
        staffId,
        newShiftStart,
        newShiftEnd,
        staffTimezone
      );

      // Assert
      expect(results).toHaveLength(5);
      expect(results[0]).toEqual(restPeriodResult);
      expect(results[1]).toEqual(dailyLimitResult);
      expect(results[2]).toEqual(weeklyLimitResult);
      expect(results[3]).toEqual(consecutiveDaysResult);
      expect(results[4]).toEqual(availabilityResult);

      expect(restPeriodValidation.validate).toHaveBeenCalledWith(
        staffId,
        newShiftStart,
        newShiftEnd
      );
      expect(dailyLimitValidation.validate).toHaveBeenCalledWith(
        locationId,
        staffId,
        newShiftStart,
        newShiftEnd
      );
      expect(weeklyLimitValidation.validate).toHaveBeenCalledWith(
        locationId,
        staffId,
        newShiftStart,
        newShiftEnd
      );
      expect(consecutiveDaysValidation.validate).toHaveBeenCalledWith(
        locationId,
        staffId,
        newShiftStart,
        staffTimezone
      );
      expect(availabilityValidation.validate).toHaveBeenCalledWith(
        staffId,
        newShiftStart,
        newShiftEnd,
        'America/Los_Angeles'
      );
    });

    it('should short-circuit on first failure (rest period)', async () => {
      // Arrange
      const restPeriodResult: ValidationResult = {
        isValid: false,
        validationType: 'REST_PERIOD',
        message: 'Rest period violation',
      };

      vi.mocked(restPeriodValidation.validate).mockResolvedValue(restPeriodResult);

      // Act
      const results = await complianceService.validateAll(
        locationId,
        staffId,
        newShiftStart,
        newShiftEnd,
        staffTimezone
      );

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(restPeriodResult);
      expect(restPeriodValidation.validate).toHaveBeenCalled();
      expect(dailyLimitValidation.validate).not.toHaveBeenCalled();
      expect(weeklyLimitValidation.validate).not.toHaveBeenCalled();
      expect(consecutiveDaysValidation.validate).not.toHaveBeenCalled();
      expect(availabilityValidation.validate).not.toHaveBeenCalled();
    });

    it('should short-circuit on daily limit failure', async () => {
      // Arrange
      const restPeriodResult: ValidationResult = {
        isValid: true,
        validationType: 'REST_PERIOD',
      };
      const dailyLimitResult: ValidationResult = {
        isValid: false,
        validationType: 'DAILY_LIMIT',
        message: 'Daily limit exceeded',
      };

      vi.mocked(restPeriodValidation.validate).mockResolvedValue(restPeriodResult);
      vi.mocked(dailyLimitValidation.validate).mockResolvedValue(dailyLimitResult);

      // Act
      const results = await complianceService.validateAll(
        locationId,
        staffId,
        newShiftStart,
        newShiftEnd,
        staffTimezone
      );

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(restPeriodResult);
      expect(results[1]).toEqual(dailyLimitResult);
      expect(weeklyLimitValidation.validate).not.toHaveBeenCalled();
      expect(consecutiveDaysValidation.validate).not.toHaveBeenCalled();
      expect(availabilityValidation.validate).not.toHaveBeenCalled();
    });

    it('should short-circuit on availability failure', async () => {
      // Arrange
      const restPeriodResult: ValidationResult = {
        isValid: true,
        validationType: 'REST_PERIOD',
      };
      const dailyLimitResult: ValidationResult = {
        isValid: true,
        validationType: 'DAILY_LIMIT',
      };
      const weeklyLimitResult: ValidationResult = {
        isValid: true,
        validationType: 'WEEKLY_LIMIT',
      };
      const consecutiveDaysResult: ValidationResult = {
        isValid: true,
        validationType: 'CONSECUTIVE_DAYS',
      };
      const availabilityResult: ValidationResult = {
        isValid: false,
        validationType: 'AVAILABILITY',
        message: 'Staff not available during shift time',
      };

      vi.mocked(restPeriodValidation.validate).mockResolvedValue(restPeriodResult);
      vi.mocked(dailyLimitValidation.validate).mockResolvedValue(dailyLimitResult);
      vi.mocked(weeklyLimitValidation.validate).mockResolvedValue(weeklyLimitResult);
      vi.mocked(consecutiveDaysValidation.validate).mockResolvedValue(consecutiveDaysResult);
      vi.mocked(availabilityValidation.validate).mockResolvedValue(availabilityResult);
      vi.mocked(complianceRepository.findLocationById).mockResolvedValue({
        id: locationId,
        name: 'Test Location',
        timezone: 'America/Los_Angeles',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const results = await complianceService.validateAll(
        locationId,
        staffId,
        newShiftStart,
        newShiftEnd,
        staffTimezone
      );

      // Assert
      expect(results).toHaveLength(5);
      expect(results[4]).toEqual(availabilityResult);
    });

    it('should use UTC timezone when location not found', async () => {
      // Arrange
      const restPeriodResult: ValidationResult = {
        isValid: true,
        validationType: 'REST_PERIOD',
      };
      const dailyLimitResult: ValidationResult = {
        isValid: true,
        validationType: 'DAILY_LIMIT',
      };
      const weeklyLimitResult: ValidationResult = {
        isValid: true,
        validationType: 'WEEKLY_LIMIT',
      };
      const consecutiveDaysResult: ValidationResult = {
        isValid: true,
        validationType: 'CONSECUTIVE_DAYS',
      };
      const availabilityResult: ValidationResult = {
        isValid: true,
        validationType: 'AVAILABILITY',
      };

      vi.mocked(restPeriodValidation.validate).mockResolvedValue(restPeriodResult);
      vi.mocked(dailyLimitValidation.validate).mockResolvedValue(dailyLimitResult);
      vi.mocked(weeklyLimitValidation.validate).mockResolvedValue(weeklyLimitResult);
      vi.mocked(consecutiveDaysValidation.validate).mockResolvedValue(consecutiveDaysResult);
      vi.mocked(availabilityValidation.validate).mockResolvedValue(availabilityResult);
      vi.mocked(complianceRepository.findLocationById).mockResolvedValue(null);

      // Act
      const results = await complianceService.validateAll(
        locationId,
        staffId,
        newShiftStart,
        newShiftEnd,
        staffTimezone
      );

      // Assert
      expect(results).toHaveLength(5);
      expect(availabilityValidation.validate).toHaveBeenCalledWith(
        staffId,
        newShiftStart,
        newShiftEnd,
        'UTC'
      );
    });
  });
});
