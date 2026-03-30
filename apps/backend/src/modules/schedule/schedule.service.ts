import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduleRepository } from './repositories/schedule.repository';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { ConflictService } from '../conflict/conflict.service';
import { ComplianceService } from '../compliance/compliance.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Shift, Assignment } from '@prisma/client';
import { ShiftWithDetails } from './interfaces';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly conflictService: ConflictService,
    private readonly complianceService: ComplianceService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  /**
   * Create a new shift
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 18.1
   */
  async createShift(
    locationId: string,
    startTime: Date,
    endTime: Date,
    requiredSkillIds: string[],
    managerId: string,
    managerLocationIds?: string[]
  ): Promise<Shift> {
    try {
      if (!locationId || !startTime || !endTime) {
        throw new BadRequestException('Missing required fields for shift creation');
      }

      const startUTC = new Date(startTime);
      const endUTC = new Date(endTime);

      if (endUTC <= startUTC) {
        throw new BadRequestException('Shift end time must be after start time');
      }

      if (managerLocationIds && !managerLocationIds.includes(locationId)) {
        throw new BadRequestException('Manager not authorized for this location');
      }

      const shift = await this.scheduleRepository.createShift({
        location: {
          connect: { id: locationId },
        },
        startTime: startUTC,
        endTime: endUTC,
        createdBy: managerId,
        skills: {
          create: requiredSkillIds.map((skillId) => ({
            skill: {
              connect: { id: skillId },
            },
          })),
        },
      });

      await this.auditService.logShiftChange('CREATE', shift.id, managerId, {
        newState: {
          locationId,
          startTime: startUTC,
          endTime: endUTC,
          requiredSkillIds,
        },
      });

      await this.cacheService.delete(`schedule:location:${locationId}`);

      // Emit real-time event
      this.realtimeGateway.emitShiftCreated(locationId, shift);

      return shift;
    } catch (error) {
      this.logger.error(`Error creating shift:`, error);
      throw error;
    }
  }

  /**
   * Assign staff to a shift
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 26.1, 26.2, 26.3
   */
  async assignStaff(shiftId: string, staffId: string, assignedBy: string): Promise<Assignment> {
    try {
      const shift = await this.scheduleRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      const existingAssignment = shift.assignments.find((a) => a.shiftId === shiftId);
      if (existingAssignment) {
        throw new BadRequestException('Shift already has a staff assignment');
      }

      const conflictResult = await this.conflictService.checkOverlap(
        staffId,
        shift.startTime,
        shift.endTime
      );

      if (conflictResult.hasConflict) {
        throw new BadRequestException(
          `Staff has overlapping shifts: ${conflictResult.conflictingShifts.length} conflict(s) found`
        );
      }

      const location = await this.scheduleRepository.findLocationById(shift.locationId);
      const staffTimezone = location?.timezone || 'UTC';

      const complianceResults = await this.complianceService.validateAll(
        shift.locationId,
        staffId,
        shift.startTime,
        shift.endTime,
        staffTimezone
      );

      const failedValidation = complianceResults.find((result) => !result.isValid);
      if (failedValidation) {
        throw new BadRequestException(`Compliance validation failed: ${failedValidation.message}`);
      }

      const assignment = await this.scheduleRepository.createAssignment({
        shift: {
          connect: { id: shiftId },
        },
        staff: {
          connect: { id: staffId },
        },
        assignedBy,
        version: 1,
      });

      await this.auditService.logAssignmentChange('CREATE', assignment.id, assignedBy, {
        newState: {
          shiftId,
          staffId,
          assignedBy,
        },
      });

      await this.cacheService.delete(`schedule:staff:${staffId}`);
      await this.cacheService.delete(`schedule:location:${shift.locationId}`);

      // Emit real-time event
      this.realtimeGateway.emitAssignmentChanged(shift.locationId, staffId, assignment);

      return assignment;
    } catch (error) {
      this.logger.error(`Error assigning staff to shift:`, error);
      throw error;
    }
  }

  /**
   * Unassign staff from a shift
   * Requirements: 8.4, 26.1
   */
  async unassignStaff(shiftId: string, unassignedBy: string): Promise<void> {
    try {
      const assignment = await this.scheduleRepository.findAssignmentByShift(shiftId);
      if (!assignment) {
        throw new NotFoundException('Assignment not found for this shift');
      }

      const shift = await this.scheduleRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      await this.scheduleRepository.deleteAssignment(assignment.id);

      await this.auditService.logAssignmentChange('DELETE', assignment.id, unassignedBy, {
        previousState: {
          shiftId,
          staffId: assignment.staffId,
        },
      });

      await this.cacheService.delete(`schedule:staff:${assignment.staffId}`);
      await this.cacheService.delete(`schedule:location:${shift.locationId}`);

      // Emit real-time event
      this.realtimeGateway.emitAssignmentChanged(shift.locationId, assignment.staffId, {
        shiftId,
        staffId: assignment.staffId,
        action: 'unassigned',
      });
    } catch (error) {
      this.logger.error(`Error unassigning staff from shift:`, error);
      throw error;
    }
  }

  /**
   * Get schedule for a location and date range
   * Requirements: 17.1, 17.4, 25.4
   */
  async getSchedule(
    locationId: string,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ shifts: ShiftWithDetails[]; total: number }> {
    try {
      const cacheKey = `schedule:location:${locationId}:${startDate.toISOString()}:${endDate.toISOString()}:${page}`;

      const cached = await this.cacheService.get<{ shifts: ShiftWithDetails[]; total: number }>(
        cacheKey
      );
      if (cached) {
        return cached;
      }

      const skip = (page - 1) * pageSize;
      const shifts = await this.scheduleRepository.findShiftsByLocation(
        locationId,
        startDate,
        endDate,
        skip,
        pageSize
      );

      const result = {
        shifts,
        total: shifts.length,
      };

      await this.cacheService.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      this.logger.error(`Error getting schedule for location ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Get staff schedule
   * Requirements: 17.4
   */
  async getStaffSchedule(
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<Shift & { assignment: Assignment }>> {
    try {
      const cacheKey = `schedule:staff:${staffId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      const cached =
        await this.cacheService.get<Array<Shift & { assignment: Assignment }>>(cacheKey);
      if (cached) {
        return cached;
      }

      const shifts = await this.scheduleRepository.findShiftsByStaff(staffId, startDate, endDate);

      await this.cacheService.set(cacheKey, shifts, 300);

      return shifts;
    } catch (error) {
      this.logger.error(`Error getting staff schedule for ${staffId}:`, error);
      throw error;
    }
  }
}
