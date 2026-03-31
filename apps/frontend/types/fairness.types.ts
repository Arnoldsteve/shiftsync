export interface HourDistribution {
  staffId: string;
  staffName: string;
  totalHours: number;
  deviation: number;
  isOutlier: boolean;
}

export interface PremiumShiftDistribution {
  staffId: string;
  staffName: string;
  totalShifts: number;
  premiumShifts: number;
  premiumPercentage: number;
  isOutlier: boolean;
}

export interface FairnessReport {
  locationId: string;
  startDate: string;
  endDate: string;
  hourDistribution: {
    mean: number;
    standardDeviation: number;
    staff: HourDistribution[];
  };
  premiumShiftDistribution: {
    staff: PremiumShiftDistribution[];
  };
}

export interface FairnessFilters {
  locationId: string;
  startDate: string;
  endDate: string;
}
