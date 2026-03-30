export interface LocationConfigUpdate {
  dailyLimitEnabled?: boolean;
  dailyLimitHours?: number;
  weeklyLimitEnabled?: boolean;
  weeklyLimitHours?: number;
  consecutiveDaysEnabled?: boolean;
  consecutiveDaysLimit?: number;
}
