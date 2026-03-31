export interface OvertimeCalculation {
  staffId: string;
  staffName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
}

export interface OvertimeReport {
  locationId: string;
  weekStart: string;
  weekEnd: string;
  staff: OvertimeCalculation[];
}

export interface OvertimeFilters {
  locationId: string;
  startDate: string;
  endDate: string;
}
