import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ScheduleRepository } from './repositories/schedule.repository';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { ConflictService } from '../conflict/conflict.service';
import { ComplianceService } from '../compliance/compliance.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Shift, Assignment, Role } from '@prisma/client';

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

      // PBAC: Check if manager is actually assigned to this location
      if (managerLocationIds && !managerLocationIds.includes(locationId)) {
        throw new ForbiddenException('Manager not authorized to create shifts for this location');
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
          startTime: startUTC.toISOString(),
          endTime: endUTC.toISOString(),
          requiredSkillIds,
        },
      });

      await this.cacheService.invalidateSchedule(locationId);
      this.realtimeGateway.emitShiftCreated(locationId, shift);

      return shift;
    } catch (error) {
      this.logger.error(`Error creating shift:`, error);
      throw error;
    }
  }

  /**
   * Get schedule for a location (or all authorized locations) and date range
   * Senior Refactor: Implements PBAC Filtering and Per-Shift Timezone Handling
   */
  async getSchedule(
    currentUser: any,
    locationId?: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ shifts: any[]; total: number }> {
    try {
      const start = startDate || new Date();
      const end = endDate || new Date(new Date().setDate(start.getDate() + 7));

      // 1. Determine Authorization Context (PBAC Logic)
      let targetLocationIds: string | string[] | undefined = undefined;

      if (currentUser.role === Role.ADMIN) {
        // Admin: Return specific location or everything if missing
        targetLocationIds = locationId || undefined;
      } else {
        // Manager: Restricted to their specific assigned locations
        const managedIds = currentUser.managedLocationIds || [];
        
        if (locationId) {
          // Verify manager owns the specific location they requested
          if (!managedIds.includes(locationId)) {
            throw new ForbiddenException('You do not have permission to view this location');
          }
          targetLocationIds = locationId;
        } else {
          // "Global" View: Return only the locations this manager runs
          targetLocationIds = managedIds;
        }
      }

      const skip = (page - 1) * pageSize;

      // 2. Fetch using dynamic repository method (Step 1)
      const rawShifts = await this.scheduleRepository.findShiftsByLocation(
        targetLocationIds,
        start,
        end,
        skip,
        pageSize
      );

      // 3. Collect Unique Staff IDs for name hydration
      const staffIds = new Set<string>();
      rawShifts.forEach((shift) => {
        if (shift.assignments?.[0]) {
          staffIds.add(shift.assignments[0].staffId);
        }
      });

      const staffMap = await this.scheduleRepository.findStaffByIds(Array.from(staffIds));

      // 4. Transform: Mapping Per-Shift Timezones and Names
      const shifts = rawShifts.map((shift) => {
        // We pull the specific timezone/name from the joined location object
        const locationData = (shift as any).location;
        
        return {
          id: shift.id,
          locationId: shift.locationId,
          locationName: locationData?.name || 'Unknown Location',
          startTime: shift.startTime.toISOString(),
          endTime: shift.endTime.toISOString(),
          timezone: locationData?.timezone || 'UTC',
          requiredSkills: shift.skills.map((s) => s.skill.name),
          assignment: shift.assignments?.[0]
            ? {
                id: shift.assignments[0].id,
                shiftId: shift.id,
                staffId: shift.assignments[0].staffId,
                staffName: staffMap.get(shift.assignments[0].staffId) || 'Unknown Staff',
                createdAt: shift.assignments[0].assignedAt.toISOString(),
              }
            : undefined,
          createdAt: shift.createdAt.toISOString(),
          updatedAt: shift.updatedAt.toISOString(),
        };
      });

      return {
        shifts,
        total: shifts.length, // Pagination logic: in production, use count()
      };
    } catch (error) {
      this.logger.error(`Error getting schedule:`, error);
      throw error;
    }
  }

  /**
   * Assign staff to a shift with Conflict & Compliance checks
   */
  async assignStaff(shiftId: string, staffId: string, assignedBy: string): Promise<Assignment> {
    try {
      const shift = await this.scheduleRepository.findShiftById(shiftId);
      if (!shift) throw new NotFoundException('Shift not found');

      const existingAssignment = shift.assignments.find((a) => a.shiftId === shiftId);
      if (existingAssignment) throw new BadRequestException('Shift is already covered');

      // Double-booking check
      const conflictResult = await this.conflictService.checkOverlap(staffId, shift.startTime, shift.endTime);
      if (conflictResult.hasConflict) {
        throw new BadRequestException(`Schedule Conflict: User is already working at ${conflictResult.conflictingShifts[0].locationId}`);
      }

      // Labor Compliance (10h rest, 12h daily limit, etc.)
      const location = await this.scheduleRepository.findLocationById(shift.locationId);
      const tz = location?.timezone || 'UTC';
      const compliance = await this.complianceService.validateAll(shift.locationId, staffId, shift.startTime, shift.endTime, tz);

      const failure = compliance.find((r) => !r.isValid);
      if (failure) throw new BadRequestException(`Compliance Violation: ${failure.message}`);

      const assignment = await this.scheduleRepository.createAssignment({
        shift: { connect: { id: shiftId } },
        staff: { connect: { id: staffId } },
        assignedBy,
        version: 1,
      });

      await this.auditService.logAssignmentChange('CREATE', assignment.id, assignedBy, {
        newState: { shiftId, staffId, assignedBy },
      });

      this.realtimeGateway.emitAssignmentChanged(shift.locationId, staffId, assignment);
      return assignment;
    } catch (error) {
      this.logger.error(`Error assigning staff:`, error);
      throw error;
    }
  }

  async unassignStaff(shiftId: string, unassignedBy: string): Promise<void> {
    try {
      const assignment = await this.scheduleRepository.findAssignmentByShift(shiftId);
      if (!assignment) throw new NotFoundException('Assignment not found');

      await this.scheduleRepository.deleteAssignment(assignment.id);

      await this.auditService.logAssignmentChange('DELETE', assignment.id, unassignedBy, {
        previousState: { shiftId, staffId: assignment.staffId },
      });

      this.realtimeGateway.emitAssignmentChanged(assignment.shiftId, assignment.staffId, { action: 'unassigned' });
    } catch (error) {
      this.logger.error(`Error unassigning staff:`, error);
      throw error;
    }
  }

  async getStaffSchedule(staffId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    return this.scheduleRepository.findShiftsByStaff(staffId, startDate, endDate);
  }
}