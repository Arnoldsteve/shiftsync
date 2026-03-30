import { HourDistribution } from './hour-distribution.interface';
import { PremiumShiftDistribution } from './premium-shift-distribution.interface';

export interface FairnessReport {
  locationId: string;
  startDate: Date;
  endDate: Date;
  hourDistribution: HourDistribution;
  premiumShiftDistribution: PremiumShiftDistribution;
  generatedAt: Date;
}
