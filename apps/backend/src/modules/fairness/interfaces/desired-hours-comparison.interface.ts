export interface DesiredHoursComparison {
  staffId: string;
  staffName: string;
  actualHours: number;
  desiredHours: number | null;
  difference: number | null; // actualHours - desiredHours (null if no desired hours set)
  percentageDifference: number | null; // ((actualHours - desiredHours) / desiredHours) * 100
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
