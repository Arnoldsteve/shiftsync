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

export interface DesiredHoursComparison {
  staffId: string;
  staffName: string;
  actualHours: number;
  desiredHours: number | null;
  difference: number | null;
  percentageDifference: number | null;
  status: 'under-scheduled' | 'over-scheduled' | 'on-target' | 'no-preference';
}

export interface DesiredHoursAnalysis {
  locationId: string;
  startDate: Date;
  endDate: Date;
  comparisons: DesiredHoursComparison[];
  underScheduled: DesiredHoursComparison[];
  overScheduled: DesiredHoursComparison[];
  onTarget: DesiredHoursComparison[];
  noPreference: DesiredHoursComparison[];
}
