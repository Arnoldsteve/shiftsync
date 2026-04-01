import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlternativeStaffService } from './alternative-staff.service';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { ComplianceService } from '../../compliance/compliance.service';
import { ConflictService } from '../../conflict/conflict.service';
import { OvertimeService } from '../../overtime/overtime.service';
import { NotFoundException } from '@nestjs/common';

describe('AlternativeStaffService', () => {
  let service: AlternativeStaffService;
  let scheduleRepository: ScheduleRepository;
  let userRepository: UserRepository;
  let complianceService: ComplianceService;
  let conflictService: ConflictService;
  let overtimeService: OvertimeService;

  beforeEach(() => {
    scheduleRepository = {
      findShiftById: vi.fn(),
      findLocationById: vi.fn(),
    } as any;

    userRepository = {
      findByCertifiedLocation: vi.fn(),
    } as any;

    complianceService = {
      validateAvailability: vi.fn(),
      validateAll: vi.fn(),
    } as any;

    conflictService = {
      checkOverlap: vi.fn(),
    } as any;

    overtimeService = {
      calculateHours: vi.fn(),
    } as any;

    service = new AlternativeStaffService(
      scheduleRepository,
      userRepository,
      complianceService,
      conflictService,
      overtimeService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAlternativeStaff', () => {
    const mockShift = {
      id: 'shift-1',
      locationId: 'location-1',
      startTime: new Date('2025-01-15T09:00:00Z'),
      endTime: new Date('2025-01-15T17:00:00Z'),
      skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
    };

    const mockLocation = {
      id: 'location-1',
      name: 'Location 1',
      timezone: 'America/New_York',
    };

    it('should throw NotFoundException if shift not found', async () => {
      vi.mocked(scheduleRepository.findShiftById).mockResolvedValue(null);

      await expect(service.getAlternativeStaff('invalid-shift')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if location not found', async () => {
      vi.mocked(scheduleRepository.findShiftById).mockResolvedValue(mockShift as any);
      vi.mocked(scheduleRepository.findLocationById).mockResolvedValue(null);

      await expect(service.getAlternativeStaff('shift-1')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if no certified staff available', async () => {
      vi.mocked(scheduleRepository.findShiftById).mockResolvedValue(mockShift as any);
      vi.mocked(scheduleRepository.findLocationById).mockResolvedValue(mockLocation as any);
      vi.mocked(userRepository.findByCertifiedLocation).mockResolvedValue([]);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toEqual([]);
    });

    it('should filter out non-STAFF role users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'MANAGER',
          firstName: 'Manager',
          lastName: 'User',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
        {
          id: 'user-2',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'User',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      vi.mocked(scheduleRepository.findShiftById).mockResolvedValue(mockShift as any);
      vi.mocked(scheduleRepository.findLocationById).mockResolvedValue(mockLocation as any);
      vi.mocked(userRepository.findByCertifiedLocation).mockResolvedValue(mockUsers as any);
      vi.mocked(complianceService.validateAvailability).mockResolvedValue({ isValid: true } as any);
      vi.mocked(conflictService.checkOverlap).mockResolvedValue({ hasConflict: false } as any);
      vi.mocked(complianceService.validateAll).mockResolvedValue([{ isValid: true }] as any);
      vi.mocked(overtimeService.calculateHours).mockResolvedValue({ totalHours: 20 } as any);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('user-2');
    });

    it('should exclude specified staff member', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'One',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
        {
          id: 'user-2',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'Two',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      vi.mocked(scheduleRepository.findShiftById).mockResolvedValue(mockShift as any);
      vi.mocked(scheduleRepository.findLocationById).mockResolvedValue(mockLocation as any);
      vi.mocked(userRepository.findByCertifiedLocation).mockResolvedValue(mockUsers as any);
      vi.mocked(complianceService.validateAvailability).mockResolvedValue({ isValid: true } as any);
      vi.mocked(conflictService.checkOverlap).mockResolvedValue({ hasConflict: false } as any);
      vi.mocked(complianceService.validateAll).mockResolvedValue([{ isValid: true }] as any);
      vi.mocked(overtimeService.calculateHours).mockResolvedValue({ totalHours: 20 } as any);

      const result = await service.getAlternativeStaff('shift-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('user-2');
    });

    it('should filter out staff without required skills', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'One',
          skills: [{ skillId: 'skill-1' }], // Missing skill-2
          certifications: [{ locationId: 'location-1' }],
        },
        {
          id: 'user-2',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'Two',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      vi.mocked(scheduleRepository.findShiftById).mockResolvedValue(mockShift as any);
      vi.mocked(scheduleRepository.findLocationById).mockResolvedValue(mockLocation as any);
      vi.mocked(userRepository.findByCertifiedLocation).mockResolvedValue(mockUsers as any);
      vi.mocked(complianceService.validateAvailability).mockResolvedValue({ isValid: true } as any);
      vi.mocked(conflictService.checkOverlap).mockResolvedValue({ hasConflict: false } as any);
      vi.mocked(complianceService.validateAll).mockResolvedValue([{ isValid: true }] as any);
      vi.mocked(overtimeService.calculateHours).mockResolvedValue({ totalHours: 20 } as any);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('user-2');
    });

    it('should filter out staff who are not available', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'One',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      scheduleRepository.findShiftById.mockResolvedValue(mockShift as any);
      scheduleRepository.findLocationById.mockResolvedValue(mockLocation as any);
      userRepository.findByCertifiedLocation.mockResolvedValue(mockUsers as any);
      complianceService.validateAvailability.mockResolvedValue({
        isValid: false,
        message: 'Not available',
      } as any);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toEqual([]);
    });

    it('should filter out staff with scheduling conflicts', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'One',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      scheduleRepository.findShiftById.mockResolvedValue(mockShift as any);
      scheduleRepository.findLocationById.mockResolvedValue(mockLocation as any);
      userRepository.findByCertifiedLocation.mockResolvedValue(mockUsers as any);
      complianceService.validateAvailability.mockResolvedValue({ isValid: true } as any);
      conflictService.checkOverlap.mockResolvedValue({ hasConflict: true } as any);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toEqual([]);
    });

    it('should filter out staff who fail compliance checks', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'One',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      scheduleRepository.findShiftById.mockResolvedValue(mockShift as any);
      scheduleRepository.findLocationById.mockResolvedValue(mockLocation as any);
      userRepository.findByCertifiedLocation.mockResolvedValue(mockUsers as any);
      complianceService.validateAvailability.mockResolvedValue({ isValid: true } as any);
      conflictService.checkOverlap.mockResolvedValue({ hasConflict: false } as any);
      complianceService.validateAll.mockResolvedValue([
        { isValid: false, message: 'Rest period violation' },
      ] as any);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toEqual([]);
    });

    it('should rank staff by current hours (ascending)', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'One',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
        {
          id: 'user-2',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'Two',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
        {
          id: 'user-3',
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'Three',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      scheduleRepository.findShiftById.mockResolvedValue(mockShift as any);
      scheduleRepository.findLocationById.mockResolvedValue(mockLocation as any);
      userRepository.findByCertifiedLocation.mockResolvedValue(mockUsers as any);
      complianceService.validateAvailability.mockResolvedValue({ isValid: true } as any);
      conflictService.checkOverlap.mockResolvedValue({ hasConflict: false } as any);
      complianceService.validateAll.mockResolvedValue([{ isValid: true }] as any);

      // Mock different hour totals for each user
      overtimeService.calculateHours
        .mockResolvedValueOnce({ totalHours: 30 } as any) // user-1
        .mockResolvedValueOnce({ totalHours: 15 } as any) // user-2
        .mockResolvedValueOnce({ totalHours: 25 } as any); // user-3

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toHaveLength(3);
      expect(result[0].staffId).toBe('user-2'); // 15 hours
      expect(result[0].currentHours).toBe(15);
      expect(result[1].staffId).toBe('user-3'); // 25 hours
      expect(result[1].currentHours).toBe(25);
      expect(result[2].staffId).toBe('user-1'); // 30 hours
      expect(result[2].currentHours).toBe(30);
    });

    it('should return at most 5 suggestions', async () => {
      const mockUsers = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        role: 'STAFF',
        firstName: 'Staff',
        lastName: `User${i}`,
        skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
        certifications: [{ locationId: 'location-1' }],
      }));

      scheduleRepository.findShiftById.mockResolvedValue(mockShift as any);
      scheduleRepository.findLocationById.mockResolvedValue(mockLocation as any);
      userRepository.findByCertifiedLocation.mockResolvedValue(mockUsers as any);
      complianceService.validateAvailability.mockResolvedValue({ isValid: true } as any);
      conflictService.checkOverlap.mockResolvedValue({ hasConflict: false } as any);
      complianceService.validateAll.mockResolvedValue([{ isValid: true }] as any);
      overtimeService.calculateHours.mockResolvedValue({ totalHours: 20 } as any);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toHaveLength(5);
    });

    it('should include all required fields in suggestions', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'STAFF',
          firstName: 'John',
          lastName: 'Doe',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
          certifications: [{ locationId: 'location-1' }],
        },
      ];

      scheduleRepository.findShiftById.mockResolvedValue(mockShift as any);
      scheduleRepository.findLocationById.mockResolvedValue(mockLocation as any);
      userRepository.findByCertifiedLocation.mockResolvedValue(mockUsers as any);
      complianceService.validateAvailability.mockResolvedValue({ isValid: true } as any);
      conflictService.checkOverlap.mockResolvedValue({ hasConflict: false } as any);
      complianceService.validateAll.mockResolvedValue([{ isValid: true }] as any);
      overtimeService.calculateHours.mockResolvedValue({ totalHours: 25.5 } as any);

      const result = await service.getAlternativeStaff('shift-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        staffId: 'user-1',
        staffName: 'John Doe',
        currentHours: 25.5,
        isAvailable: true,
        hasRequiredSkills: true,
        hasLocationCertification: true,
        passesConstraints: true,
      });
    });
  });
});
