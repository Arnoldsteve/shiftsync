export interface CsvScheduleRow {
  shiftId?: string;
  locationId: string;
  startTime: string;
  endTime: string;
  staffId?: string;
  skills: string; // Comma-separated skill IDs
}
