import { HourDistribution } from './hour-distribution.interface';
import { PremiumShiftDistribution } from './premium-shift-distribution.interface';
import { DesiredHoursAnalysis } from './desired-hours-comparison.interface';

export interface FairnessReport {
  locationId: string;
  startDate: Date;
  endDate: Date;
  hourDistribution: HourDistribution;
  premiumShiftDistribution: PremiumShiftDistribution;
  desiredHoursAnalysis?: DesiredHoursAnalysis; // Requirement 41.5
  generatedAt: Date;
}
