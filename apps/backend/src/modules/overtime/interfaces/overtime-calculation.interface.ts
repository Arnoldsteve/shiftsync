export interface OvertimeCalculation {
  staffId: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  weekStart: Date;
  weekEnd: Date;
}
