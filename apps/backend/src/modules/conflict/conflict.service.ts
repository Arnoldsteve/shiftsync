import { Injectable, Logger } from '@nestjs/common';
import { LockService } from '../lock/lock.service';
import { Shift, Assignment } from '@prisma/client';
import { ConflictRepository } from './repositories/conflict.repository';
import { ConflictCheckResult } from './interfaces';

@Injectable()
export class ConflictService {
  private readonly logger = new Logger(ConflictService.name);

  constructor(
    private readonly conflictRepository: ConflictRepository,
    private readonly lockService: LockService
  ) {}

  /**
   * Check for overlapping shifts for a staff member
   * Requirements: 4.3, 5.1, 5.2, 5.3, 16.1, 16.2, 17.3
   *
   * @param staffId - Staff member ID
   * @param startTime - New shift start time (UTC)
   * @param endTime - New shift end time (UTC)
   * @param excludeShiftId - Optional shift ID to exclude (for swap scenarios)
   * @returns Conflict check result with conflicting shifts
   */
  async checkOverlap(
    staffId: string,
    startTime: Date,
    endTime: Date,
    excludeShiftId?: string
  ): Promise<ConflictCheckResult> {
    try {
      // Use distributed lock to serialize concurrent operations for this staff member
      const result = await this.lockService.withStaffLock(staffId, async () => {
        return await this.findOverlappingShifts(staffId, startTime, endTime, excludeShiftId);
      });

      if (result === null) {
        // Lock could not be acquired, but we should still check for conflicts
        this.logger.warn(
          `Could not acquire lock for staff ${staffId}, checking conflicts without lock`
        );
        return await this.findOverlappingShifts(staffId, startTime, endTime, excludeShiftId);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error checking overlap for staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Find overlapping shifts for a staff member
   * Requirements: 5.1, 5.2, 5.3, 17.3
   *
   * @private
   */
  private async findOverlappingShifts(
    staffId: string,
    startTime: Date,
    endTime: Date,
    excludeShiftId?: string
  ): Promise<ConflictCheckResult> {
    const assignments = await this.conflictRepository.findOverlappingAssignments(
      staffId,
      startTime,
      endTime,
      excludeShiftId
    );

    const conflictingShifts = assignments.map((assignment) => ({
      ...assignment.shift,
      assignment,
    }));

    return {
      hasConflict: conflictingShifts.length > 0,
      conflictingShifts,
    };
  }

  /**
   * Check if a specific time range overlaps with any existing shifts
   * Requirements: 5.1, 5.2
   *
   * @param staffId - Staff member ID
   * @param startTime - Start time (UTC)
   * @param endTime - End time (UTC)
   * @returns True if there is an overlap
   */
  async hasOverlap(
    staffId: string,
    startTime: Date,
    endTime: Date,
    excludeShiftId?: string
  ): Promise<boolean> {
    const result = await this.checkOverlap(staffId, startTime, endTime, excludeShiftId);
    return result.hasConflict;
  }

  /**
   * Get conflicting shift details
   * Requirements: 5.3
   *
   * @param staffId - Staff member ID
   * @param startTime - Start time (UTC)
   * @param endTime - End time (UTC)
   * @returns Array of conflicting shifts with details
   */
  async getConflictingShifts(
    staffId: string,
    startTime: Date,
    endTime: Date,
    excludeShiftId?: string
  ): Promise<Array<Shift & { assignment: Assignment | null }>> {
    const result = await this.checkOverlap(staffId, startTime, endTime, excludeShiftId);
    return result.conflictingShifts;
  }
}
