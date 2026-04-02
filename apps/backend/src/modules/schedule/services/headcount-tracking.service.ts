import { Injectable } from '@nestjs/common';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { HeadcountStatus } from '../interfaces';

/**
 * Headcount Tracking Service
 * Handles shift headcount tracking and status
 * Requirements: 42.1, 42.2, 42.3, 42.4, 42.5
 */
@Injectable()
export class HeadcountTrackingService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  /**
   * Get headcount status for a shift
   * Requirements: 42.3
   */
  async getShiftHeadcountStatus(shiftId: string): Promise<HeadcountStatus> {
    const shift = await this.scheduleRepository.findShiftById(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    const filledHeadcount = shift.assignments.length;
    const requiredHeadcount = shift.requiredHeadcount;
    const isFullyCovered = filledHeadcount >= requiredHeadcount;
    const isPartiallyCovered = filledHeadcount > 0 && filledHeadcount < requiredHeadcount;

    return {
      shiftId: shift.id,
      requiredHeadcount,
      filledHeadcount,
      isFullyCovered,
      isPartiallyCovered,
    };
  }
}
