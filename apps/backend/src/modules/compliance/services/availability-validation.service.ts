import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ValidationResult } from '../interfaces';

/**
 * Availability Validation Service
 *
 * Validates that shift assignments fall within staff availability windows
 * Follows Single Responsibility Principle - only handles availability validation
 *
 * Requirements: 31.3, 31.4
 */
@Injectable()
export class AvailabilityValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that a shift falls within staff availability windows
   *
   * @param staffId - The staff member ID
   * @param shiftStart - Shift start time (UTC)
   * @param shiftEnd - Shift end time (UTC)
   * @param locationTimezone - Location timezone for day-of-week calculation
   * @returns ValidationResult indicating if shift is within availability
   */
  async validate(
    staffId: string,
    shiftStart: Date,
    shiftEnd: Date,
    locationTimezone: string
  ): Promise<ValidationResult> {
    // Get staff availability windows and exceptions
    const [windows, exceptions] = await Promise.all([
      this.prisma.availabilityWindow.findMany({
        where: { userId: staffId },
      }),
      this.prisma.availabilityException.findMany({
        where: { userId: staffId },
      }),
    ]);

    // If no availability windows defined, allow all shifts (no restrictions)
    if (windows.length === 0) {
      return {
        isValid: true,
        validationType: 'AVAILABILITY',
        message: 'No availability restrictions defined',
      };
    }

    // Convert shift times to location timezone for day-of-week calculation
    const shiftStartLocal = new Date(
      shiftStart.toLocaleString('en-US', { timeZone: locationTimezone })
    );
    const shiftEndLocal = new Date(
      shiftEnd.toLocaleString('en-US', { timeZone: locationTimezone })
    );

    const dayOfWeek = shiftStartLocal.getDay(); // 0 = Sunday, 6 = Saturday
    const shiftStartTime = this.formatTime(shiftStartLocal);
    const shiftEndTime = this.formatTime(shiftEndLocal);

    // Check for availability exceptions on this date
    const shiftDate = new Date(shiftStartLocal);
    shiftDate.setHours(0, 0, 0, 0);

    const exception = exceptions.find((ex) => {
      const exDate = new Date(ex.date);
      exDate.setHours(0, 0, 0, 0);
      return exDate.getTime() === shiftDate.getTime();
    });

    // If exception exists, check if shift falls within exception time
    if (exception) {
      // If no times specified, staff is unavailable all day
      if (!exception.startTime && !exception.endTime) {
        return {
          isValid: false,
          validationType: 'AVAILABILITY',
          message: `Staff is unavailable on ${shiftDate.toDateString()} (exception)`,
        };
      }

      // If times specified, check if shift overlaps with unavailable period
      if (exception.startTime && exception.endTime) {
        const hasOverlap = this.checkTimeOverlap(
          shiftStartTime,
          shiftEndTime,
          exception.startTime,
          exception.endTime
        );

        if (hasOverlap) {
          return {
            isValid: false,
            validationType: 'AVAILABILITY',
            message: `Shift overlaps with unavailable period (${exception.startTime} - ${exception.endTime}) on ${shiftDate.toDateString()}`,
          };
        }
      }
    }

    // Check recurring weekly availability windows
    const dayWindows = windows.filter((w) => w.dayOfWeek === dayOfWeek);

    if (dayWindows.length === 0) {
      return {
        isValid: false,
        validationType: 'AVAILABILITY',
        message: `Staff has no availability windows on ${this.getDayName(dayOfWeek)}`,
      };
    }

    // Check if shift falls within any availability window
    const isWithinWindow = dayWindows.some((window) => {
      return this.isShiftWithinWindow(
        shiftStartTime,
        shiftEndTime,
        window.startTime,
        window.endTime
      );
    });

    if (!isWithinWindow) {
      const availableWindows = dayWindows.map((w) => `${w.startTime}-${w.endTime}`).join(', ');

      return {
        isValid: false,
        validationType: 'AVAILABILITY',
        message: `Shift (${shiftStartTime}-${shiftEndTime}) is outside staff availability windows on ${this.getDayName(dayOfWeek)}. Available: ${availableWindows}`,
      };
    }

    return {
      isValid: true,
      validationType: 'AVAILABILITY',
      message: 'Shift is within staff availability',
    };
  }

  /**
   * Format Date to HH:MM string
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Check if shift time range is fully within availability window
   */
  private isShiftWithinWindow(
    shiftStart: string,
    shiftEnd: string,
    windowStart: string,
    windowEnd: string
  ): boolean {
    return shiftStart >= windowStart && shiftEnd <= windowEnd;
  }

  /**
   * Check if two time ranges overlap
   */
  private checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get day name from day number
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
}
