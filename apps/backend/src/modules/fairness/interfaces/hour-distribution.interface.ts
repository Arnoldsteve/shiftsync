export interface HourDistribution {
  locationId: string;
  startDate: Date;
  endDate: Date;
  staffHours: Array<{
    staffId: string;
    staffName: string;
    totalHours: number;
    isOutlier: boolean;
  }>;
  statistics: {
    mean: number;
    standardDeviation: number;
    min: number;
    max: number;
  };
}
