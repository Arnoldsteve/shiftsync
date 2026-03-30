import { Injectable } from '@nestjs/common';
import { CalloutReportingService } from './services/callout-reporting.service';
import { CoverageGapService } from './services/coverage-gap.service';
import { DashboardService } from './services/dashboard.service';
import { Callout } from '@prisma/client';
import { AvailableStaff, LocationCoverage, UpcomingShift } from './interfaces';

/**
 * Main CalloutService that delegates to specialized services
 * Following Single Responsibility Principle
 */
@Injectable()
export class CalloutService {
  constructor(
    private readonly calloutReportingService: CalloutReportingService,
    private readonly coverageGapService: CoverageGapService,
    private readonly dashboardService: DashboardService
  ) {}

  // Callout Reporting Methods
  async reportCallout(shiftId: string, staffId: string, reason?: string): Promise<Callout> {
    const callout = await this.calloutReportingService.reportCallout(shiftId, staffId, reason);

    // Update dashboard after callout
    const shift = await this.coverageGapService['coverageGapRepository'].findShiftById(shiftId);
    if (shift) {
      await this.dashboardService.updateDashboardData(shift.locationId);
    }

    return callout;
  }

  // Coverage Gap Methods
  async findAvailableStaff(shiftId: string): Promise<AvailableStaff[]> {
    return this.coverageGapService.findAvailableStaff(shiftId);
  }

  async sendShiftOffer(shiftId: string, staffId: string): Promise<void> {
    return this.coverageGapService.sendShiftOffer(shiftId, staffId);
  }

  async notifyCoverageGap(shiftId: string): Promise<void> {
    return this.coverageGapService.notifyCoverageGap(shiftId);
  }

  // Dashboard Methods
  async getCurrentCoverage(): Promise<LocationCoverage[]> {
    return this.dashboardService.getCurrentCoverage();
  }

  async getUpcomingShifts(): Promise<UpcomingShift[]> {
    return this.dashboardService.getUpcomingShifts();
  }

  async updateDashboardData(locationId: string): Promise<void> {
    return this.dashboardService.updateDashboardData(locationId);
  }
}
