export interface OvertimeReport {
  locationId: string;
  weekStart: Date;
  weekEnd: Date;
  staffOvertimeData: Array<{
    staffId: string;
    staffName: string;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
  }>;
}
