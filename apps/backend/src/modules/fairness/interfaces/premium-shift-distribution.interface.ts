export interface PremiumShiftDistribution {
  locationId: string;
  startDate: Date;
  endDate: Date;
  staffPremiumShifts: Array<{
    staffId: string;
    staffName: string;
    totalShifts: number;
    premiumShifts: number;
    premiumPercentage: number;
    isOutlier: boolean;
  }>;
  statistics: {
    meanPremiumCount: number;
    meanPremiumPercentage: number;
    standardDeviation: number;
  };
}
