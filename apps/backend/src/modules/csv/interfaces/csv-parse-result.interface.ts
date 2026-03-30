import { CsvScheduleRow } from './csv-schedule-row.interface';

export interface CsvParseResult {
  success: boolean;
  data: CsvScheduleRow[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}
