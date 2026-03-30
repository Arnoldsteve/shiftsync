export interface OvertimeReportJobData {
  locationId: string;
  payPeriods: Array<{
    weekStart: string;
  }>;
}
