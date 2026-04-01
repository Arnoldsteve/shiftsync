import { Injectable } from '@nestjs/common';
import { ShiftManagementService } from './services/shift-management.service';
import { StaffAssignmentService } from './services/staff-assignment.service';
import { SchedulePublishingService } from './services/schedule-publishing.service';
import { ShiftPickupService } from './services/shift-pickup.service';
import { Shift, Assignment } from '@prisma/client';

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
    private readonly shiftPickupService: ShiftPickupService
  ) {}

  // ==================== Shift Management ====================

  async createShift(
    locationId: string,
    startTime: Date,
    endTime: Date,
    requiredSkillIds: string[],
    managerId: string,
    managerLocationIds?: string[]
  ): Promise<Shift> {
    return this.shiftManagementService.createShift(
      locationId,
      startTime,
      endTime,
      requiredSkillIds,
      managerId,
      managerLocationIds
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

  // ==================== Staff Assignment ====================

  async assignStaff(shiftId: string, staffId: string, assignedBy: string): Promise<Assignment> {
    return this.staffAssignmentService.assignStaff(shiftId, staffId, assignedBy);
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
}
