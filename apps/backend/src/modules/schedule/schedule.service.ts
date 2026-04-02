import { Injectable } from '@nestjs/common';
import { ShiftManagementService } from './services/shift-management.service';
import { StaffAssignmentService } from './services/staff-assignment.service';
import { SchedulePublishingService } from './services/schedule-publishing.service';
import { ShiftPickupService } from './services/shift-pickup.service';
import { AlternativeStaffService } from './services/alternative-staff.service';
import { HeadcountTrackingService } from './services/headcount-tracking.service';
import { Shift, Assignment } from '@prisma/client';
import { StaffSuggestion, HeadcountStatus } from './interfaces';

/**
 * Schedule Service (Orchestrator)
 *
 * Lightweight facade that delegates to specialized services:
 * - ShiftManagementService: Shift CRUD operations
 * - StaffAssignmentService: Staff assignment/unassignment
 * - SchedulePublishingService: Schedule publishing/unpublishing
 * - ShiftPickupService: Staff self-service shift pickup
 *
 * This orchestrator pattern improves maintainability by:
 * - Single Responsibility: Each service has one clear purpose
 * - Testability: Services can be tested independently
 * - Scalability: Easy to add new features without bloating one file
 */
@Injectable()
export class ScheduleService {
  constructor(
    private readonly shiftManagementService: ShiftManagementService,
    private readonly staffAssignmentService: StaffAssignmentService,
    private readonly schedulePublishingService: SchedulePublishingService,
    private readonly shiftPickupService: ShiftPickupService,
    private readonly alternativeStaffService: AlternativeStaffService,
    private readonly headcountTrackingService: HeadcountTrackingService
  ) {}

  // ==================== Shift Management ====================

  async createShift(
    locationId: string,
    startTime: Date,
    endTime: Date,
    requiredSkillIds: string[],
    managerId: string,
    managerLocationIds?: string[],
    requiredHeadcount?: number
  ): Promise<Shift> {
    return this.shiftManagementService.createShift(
      locationId,
      startTime,
      endTime,
      requiredSkillIds,
      managerId,
      managerLocationIds,
      requiredHeadcount
    );
  }

  async getSchedule(
    currentUser: any,
    locationId?: string,
    startDate?: Date,
    endDate?: Date,
    page?: number,
    pageSize?: number
  ): Promise<{ shifts: any[]; total: number }> {
    return this.shiftManagementService.getSchedule(
      currentUser,
      locationId,
      startDate,
      endDate,
      page,
      pageSize
    );
  }

  async getStaffSchedule(staffId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    return this.shiftManagementService.getStaffSchedule(staffId, startDate, endDate);
  }

  async getStaffSchedulePublished(
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    return this.shiftManagementService.getStaffSchedulePublished(staffId, startDate, endDate);
  }

  async updateShift(
    shiftId: string,
    managerId: string,
    updates: {
      startTime?: Date;
      endTime?: Date;
      locationId?: string;
      requiredHeadcount?: number;
    },
    managerLocationIds?: string[]
  ): Promise<{ shift: Shift; cancelledSwapsCount: number }> {
    return this.shiftManagementService.updateShift(shiftId, managerId, updates, managerLocationIds);
  }

  // ==================== Staff Assignment ====================

  async assignStaff(
    shiftId: string,
    staffId: string,
    assignedBy: string,
    overrideReason?: string
  ): Promise<Assignment> {
    return this.staffAssignmentService.assignStaff(shiftId, staffId, assignedBy, overrideReason);
  }

  async unassignStaff(shiftId: string, unassignedBy: string): Promise<void> {
    return this.staffAssignmentService.unassignStaff(shiftId, unassignedBy);
  }

  // ==================== Schedule Publishing ====================

  async publishSchedule(
    locationId: string,
    weekStartDate: Date,
    managerId: string,
    managerLocationIds?: string[]
  ): Promise<{ publishedCount: number }> {
    return this.schedulePublishingService.publishSchedule(
      locationId,
      weekStartDate,
      managerId,
      managerLocationIds
    );
  }

  async unpublishSchedule(
    locationId: string,
    weekStartDate: Date,
    managerId: string,
    managerLocationIds?: string[]
  ): Promise<{ unpublishedCount: number }> {
    return this.schedulePublishingService.unpublishSchedule(
      locationId,
      weekStartDate,
      managerId,
      managerLocationIds
    );
  }

  // ==================== Shift Pickup ====================

  async getAvailableShifts(staffId: string): Promise<any[]> {
    return this.shiftPickupService.getAvailableShifts(staffId);
  }

  async pickupShift(shiftId: string, staffId: string): Promise<Assignment> {
    return this.shiftPickupService.pickupShift(shiftId, staffId);
  }

  // ==================== Alternative Staff Suggestions ====================

  /**
   * Get alternative staff suggestions for a shift
   * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5
   */
  async getAlternativeStaff(shiftId: string, excludeStaffId?: string): Promise<StaffSuggestion[]> {
    return this.alternativeStaffService.getAlternativeStaff(shiftId, excludeStaffId);
  }

  // ==================== Headcount Tracking ====================

  /**
   * Get shift headcount status
   * Requirements: 42.3, 42.4, 42.5
   */
  async getShiftHeadcountStatus(shiftId: string): Promise<HeadcountStatus> {
    return this.headcountTrackingService.getShiftHeadcountStatus(shiftId);
  }

  // ==================== On-Duty Staff ====================

  /**
   * Get currently on-duty staff
   * Requirements: 6.3
   */
  async getOnDutyStaff(managerLocationIds?: string[]): Promise<any[]> {
    return this.shiftManagementService.getOnDutyStaff(managerLocationIds);
  }
}
