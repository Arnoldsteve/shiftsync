export interface LocationConfig {
  id: string;
  locationId: string;
  dailyLimitEnabled: boolean;
  dailyLimitHours?: number;
  weeklyLimitEnabled: boolean;
  weeklyLimitHours: number;
  consecutiveDaysEnabled: boolean;
  consecutiveDaysLimit?: number;
  restPeriodHours: number;
  premiumShiftCriteria?: PremiumShiftCriteria;
  createdAt: string;
  updatedAt: string;
}

export interface PremiumShiftCriteria {
  daysOfWeek?: number[];
  timeRanges?: Array<{ start: string; end: string }>;
  holidays?: string[];
}

export interface UpdateLocationConfigDto {
  dailyLimitEnabled?: boolean;
  dailyLimitHours?: number;
  weeklyLimitEnabled?: boolean;
  weeklyLimitHours?: number;
  consecutiveDaysEnabled?: boolean;
  consecutiveDaysLimit?: number;
  restPeriodHours?: number;
  premiumShiftCriteria?: PremiumShiftCriteria;
}
