export interface OvertimeWarning {
  hasWarning: boolean;
  currentHours: number;
  projectedHours: number;
  overtimeAmount: number;
  message?: string;
}
