import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FairnessService } from './fairness.service';
import { FairnessRepository } from './repositories/fairness.repository';

describe('FairnessService - Desired Hours Comparison (Requirement 41)', () => {
  let fairnessService: FairnessService;
  let fairnessRepository: FairnessRepository;

  beforeEach(() => {
    fairnessRepository = {
      findStaffWithShiftsInLocation: vi.fn(),
      findShiftsInRange: vi.fn(),
      findUserWithDesiredHours: vi.fn(),
      findUserById: vi.fn(),
      findPremiumShiftCriteria: vi.fn(),
    } as any;

    fairnessService = new FairnessService(fairnessRepository);
  });

  describe('compareActualToDesiredHours', () => {
    const locationId = 'loc-1';
    const startDate = new Date('2024-01-01T00:00:00Z');
    const endDate = new Date('2024-01-08T00:00:00Z'); // 1 week

    it('should calculate actual vs desired hours comparison accurately (41.2)', async () => {
      // Staff with 40 desired hours, scheduled for 40 hours
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      // 5 shifts of 8 hours each = 40 hours
      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
        },
        {
          id: 'shift-2',
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T17:00:00Z'),
        },
        {
          id: 'shift-3',
          startTime: new Date('2024-01-03T09:00:00Z'),
          endTime: new Date('2024-01-03T17:00:00Z'),
        },
        {
          id: 'shift-4',
          startTime: new Date('2024-01-04T09:00:00Z'),
          endTime: new Date('2024-01-04T17:00:00Z'),
        },
        {
          id: 'shift-5',
          startTime: new Date('2024-01-05T09:00:00Z'),
          endTime: new Date('2024-01-05T17:00:00Z'),
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'John',
        lastName: 'Doe',
        desiredWeeklyHours: 40,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons).toHaveLength(1);
      expect(result.comparisons[0]).toMatchObject({
        staffId,
        staffName: 'John Doe',
        actualHours: 40,
        desiredHours: 40,
        difference: 0,
        percentageDifference: 0,
        status: 'on-target',
      });
    });

    it('should identify under-scheduled staff (actual significantly below desired) (41.3)', async () => {
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      // 2 shifts of 8 hours each = 16 hours (desired is 40)
      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
        },
        {
          id: 'shift-2',
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T17:00:00Z'),
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Jane',
        lastName: 'Smith',
        desiredWeeklyHours: 40,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons[0]).toMatchObject({
        staffId,
        actualHours: 16,
        desiredHours: 40,
        difference: -24,
        status: 'under-scheduled',
      });

      expect(result.underScheduled).toHaveLength(1);
      expect(result.underScheduled[0].staffId).toBe(staffId);
    });

    it('should identify over-scheduled staff (actual significantly above desired) (41.4)', async () => {
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      // 7 shifts of 8 hours each = 56 hours (desired is 40)
      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
        },
        {
          id: 'shift-2',
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T17:00:00Z'),
        },
        {
          id: 'shift-3',
          startTime: new Date('2024-01-03T09:00:00Z'),
          endTime: new Date('2024-01-03T17:00:00Z'),
        },
        {
          id: 'shift-4',
          startTime: new Date('2024-01-04T09:00:00Z'),
          endTime: new Date('2024-01-04T17:00:00Z'),
        },
        {
          id: 'shift-5',
          startTime: new Date('2024-01-05T09:00:00Z'),
          endTime: new Date('2024-01-05T17:00:00Z'),
        },
        {
          id: 'shift-6',
          startTime: new Date('2024-01-06T09:00:00Z'),
          endTime: new Date('2024-01-06T17:00:00Z'),
        },
        {
          id: 'shift-7',
          startTime: new Date('2024-01-07T09:00:00Z'),
          endTime: new Date('2024-01-07T17:00:00Z'),
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Bob',
        lastName: 'Johnson',
        desiredWeeklyHours: 40,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons[0]).toMatchObject({
        staffId,
        actualHours: 56,
        desiredHours: 40,
        difference: 16,
        status: 'over-scheduled',
      });

      expect(result.overScheduled).toHaveLength(1);
      expect(result.overScheduled[0].staffId).toBe(staffId);
    });

    it('should handle staff without desired hours set', async () => {
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Alice',
        lastName: 'Brown',
        desiredWeeklyHours: null,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons[0]).toMatchObject({
        staffId,
        actualHours: 8,
        desiredHours: null,
        difference: null,
        percentageDifference: null,
        status: 'no-preference',
      });

      expect(result.noPreference).toHaveLength(1);
    });

    it('should handle staff with zero hours scheduled', async () => {
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([]);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Charlie',
        lastName: 'Davis',
        desiredWeeklyHours: 40,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons[0]).toMatchObject({
        staffId,
        actualHours: 0,
        desiredHours: 40,
        difference: -40,
        status: 'under-scheduled',
      });
    });

    it('should handle exact match between actual and desired hours', async () => {
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      // 3 shifts of 10 hours each = 30 hours
      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T19:00:00Z'),
        },
        {
          id: 'shift-2',
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T19:00:00Z'),
        },
        {
          id: 'shift-3',
          startTime: new Date('2024-01-03T09:00:00Z'),
          endTime: new Date('2024-01-03T19:00:00Z'),
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Eve',
        lastName: 'Wilson',
        desiredWeeklyHours: 30,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons[0]).toMatchObject({
        staffId,
        actualHours: 30,
        desiredHours: 30,
        difference: 0,
        percentageDifference: 0,
        status: 'on-target',
      });

      expect(result.onTarget).toHaveLength(1);
    });

    it('should use 20% threshold for significant deviation', async () => {
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      // 37 hours scheduled, 40 desired = 7.5% deviation and 3 hours difference (not significant)
      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T18:00:00Z'), // 9 hours
        },
        {
          id: 'shift-2',
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T16:00:00Z'), // 7 hours
        },
        {
          id: 'shift-3',
          startTime: new Date('2024-01-03T09:00:00Z'),
          endTime: new Date('2024-01-03T19:00:00Z'), // 10 hours
        },
        {
          id: 'shift-4',
          startTime: new Date('2024-01-04T09:00:00Z'),
          endTime: new Date('2024-01-04T20:00:00Z'), // 11 hours
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Frank',
        lastName: 'Miller',
        desiredWeeklyHours: 40,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons[0].status).toBe('on-target');
    });

    it('should use 5 hours absolute threshold for significant deviation', async () => {
      const staffId = 'staff-1';

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      // 6 hours scheduled, 10 desired = 40% deviation but only 4 hours difference
      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T15:00:00Z'), // 6 hours
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Grace',
        lastName: 'Lee',
        desiredWeeklyHours: 10,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      // 40% deviation should trigger under-scheduled
      expect(result.comparisons[0].status).toBe('under-scheduled');
    });

    it('should handle multi-week date ranges correctly', async () => {
      const staffId = 'staff-1';
      const twoWeekEndDate = new Date('2024-01-15T00:00:00Z'); // 2 weeks

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      // 10 shifts of 8 hours each = 80 hours over 2 weeks
      const shifts = Array.from({ length: 10 }, (_, i) => ({
        id: `shift-${i + 1}`,
        startTime: new Date(`2024-01-0${Math.floor(i / 2) + 1}T09:00:00Z`),
        endTime: new Date(`2024-01-0${Math.floor(i / 2) + 1}T17:00:00Z`),
      }));

      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue(shifts as any);

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'Henry',
        lastName: 'Taylor',
        desiredWeeklyHours: 40,
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        twoWeekEndDate
      );

      expect(result.comparisons[0]).toMatchObject({
        staffId,
        actualHours: 80,
        desiredHours: 80, // 40 hours/week * 2 weeks
        difference: 0,
        status: 'on-target',
      });
    });

    it('should categorize multiple staff correctly', async () => {
      const staffIds = ['staff-1', 'staff-2', 'staff-3', 'staff-4'];

      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue(staffIds);

      // Staff 1: under-scheduled (16 hours, wants 40)
      vi.mocked(fairnessRepository.findShiftsInRange).mockImplementation(async (staffId) => {
        if (staffId === 'staff-1') {
          return [
            {
              id: 'shift-1',
              startTime: new Date('2024-01-01T09:00:00Z'),
              endTime: new Date('2024-01-01T17:00:00Z'),
            },
            {
              id: 'shift-2',
              startTime: new Date('2024-01-02T09:00:00Z'),
              endTime: new Date('2024-01-02T17:00:00Z'),
            },
          ] as any;
        }
        // Staff 2: over-scheduled (56 hours, wants 40)
        if (staffId === 'staff-2') {
          return Array.from({ length: 7 }, (_, i) => ({
            id: `shift-${i + 1}`,
            startTime: new Date(`2024-01-0${i + 1}T09:00:00Z`),
            endTime: new Date(`2024-01-0${i + 1}T17:00:00Z`),
          })) as any;
        }
        // Staff 3: on-target (40 hours, wants 40)
        if (staffId === 'staff-3') {
          return Array.from({ length: 5 }, (_, i) => ({
            id: `shift-${i + 1}`,
            startTime: new Date(`2024-01-0${i + 1}T09:00:00Z`),
            endTime: new Date(`2024-01-0${i + 1}T17:00:00Z`),
          })) as any;
        }
        // Staff 4: no preference (24 hours, no desired set)
        return Array.from({ length: 3 }, (_, i) => ({
          id: `shift-${i + 1}`,
          startTime: new Date(`2024-01-0${i + 1}T09:00:00Z`),
          endTime: new Date(`2024-01-0${i + 1}T17:00:00Z`),
        })) as any;
      });

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockImplementation(async (staffId) => {
        const users = {
          'staff-1': { id: 'staff-1', firstName: 'A', lastName: 'User', desiredWeeklyHours: 40 },
          'staff-2': { id: 'staff-2', firstName: 'B', lastName: 'User', desiredWeeklyHours: 40 },
          'staff-3': { id: 'staff-3', firstName: 'C', lastName: 'User', desiredWeeklyHours: 40 },
          'staff-4': {
            id: 'staff-4',
            firstName: 'D',
            lastName: 'User',
            desiredWeeklyHours: null,
          },
        };
        return users[staffId as keyof typeof users];
      });

      const result = await fairnessService.compareActualToDesiredHours(
        locationId,
        startDate,
        endDate
      );

      expect(result.comparisons).toHaveLength(4);
      expect(result.underScheduled).toHaveLength(1);
      expect(result.overScheduled).toHaveLength(1);
      expect(result.onTarget).toHaveLength(1);
      expect(result.noPreference).toHaveLength(1);
    });
  });

  describe('generateFairnessReport - includes desired hours (41.5)', () => {
    it('should include desired hours analysis in fairness report', async () => {
      const locationId = 'loc-1';
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-08T00:00:00Z');

      const staffId = 'staff-1';

      // Mock for hour distribution
      vi.mocked(fairnessRepository.findStaffWithShiftsInLocation).mockResolvedValue([staffId]);

      vi.mocked(fairnessRepository.findShiftsInRange).mockResolvedValue([
        {
          id: 'shift-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
        },
      ] as any);

      vi.mocked(fairnessRepository.findUserById).mockResolvedValue({
        id: staffId,
        firstName: 'John',
        lastName: 'Doe',
      });

      vi.mocked(fairnessRepository.findUserWithDesiredHours).mockResolvedValue({
        id: staffId,
        firstName: 'John',
        lastName: 'Doe',
        desiredWeeklyHours: 40,
      });

      // Mock for premium shift distribution
      vi.mocked(fairnessRepository.findPremiumShiftCriteria).mockResolvedValue([]);

      const report = await fairnessService.generateFairnessReport(locationId, startDate, endDate);

      expect(report.desiredHoursAnalysis).toBeDefined();
      expect(report.desiredHoursAnalysis?.comparisons).toHaveLength(1);
      expect(report.desiredHoursAnalysis?.comparisons[0]).toMatchObject({
        staffId,
        staffName: 'John Doe',
        actualHours: 8,
        desiredHours: 40,
        status: 'under-scheduled',
      });
    });
  });
});
