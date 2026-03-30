import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CsvScheduleRow, CsvParseResult } from './interfaces';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);

  // CSV Schema: shiftId,locationId,startTime,endTime,staffId,skills
  private readonly REQUIRED_FIELDS = ['locationId', 'startTime', 'endTime', 'skills'];
  private readonly CSV_HEADERS = [
    'shiftId',
    'locationId',
    'startTime',
    'endTime',
    'staffId',
    'skills',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse CSV content for schedule import
   * Requirements: 28.1, 28.2, 28.3
   */
  parseCsv(csvContent: string): CsvParseResult {
    const errors: Array<{ row: number; field?: string; message: string }> = [];
    const data: CsvScheduleRow[] = [];

    try {
      const lines = csvContent.trim().split('\n');

      if (lines.length === 0) {
        return {
          success: false,
          data: [],
          errors: [{ row: 0, message: 'CSV file is empty' }],
        };
      }

      // Parse header
      const headers = lines[0].split(',').map((h) => h.trim());

      // Validate headers
      const missingHeaders = this.CSV_HEADERS.filter((h) => !headers.includes(h));
      if (missingHeaders.length > 0) {
        return {
          success: false,
          data: [],
          errors: [
            {
              row: 0,
              message: `Missing required headers: ${missingHeaders.join(', ')}`,
            },
          ],
        };
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(',').map((v) => v.trim());

        if (values.length !== headers.length) {
          errors.push({
            row: i + 1,
            message: `Expected ${headers.length} columns, got ${values.length}`,
          });
          continue;
        }

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        // Validate required fields
        const validationErrors = this.validateRow(row, i + 1);
        if (validationErrors.length > 0) {
          errors.push(...validationErrors);
          continue;
        }

        data.push({
          shiftId: row.shiftId || undefined,
          locationId: row.locationId,
          startTime: row.startTime,
          endTime: row.endTime,
          staffId: row.staffId || undefined,
          skills: row.skills,
        });
      }

      return {
        success: errors.length === 0,
        data,
        errors,
      };
    } catch (error) {
      this.logger.error('Error parsing CSV:', error);
      return {
        success: false,
        data: [],
        errors: [{ row: 0, message: `CSV parsing error: ${(error as Error).message}` }],
      };
    }
  }

  /**
   * Validate a CSV row
   * Requirements: 28.2, 28.3
   */
  private validateRow(
    row: any,
    rowNumber: number
  ): Array<{ row: number; field?: string; message: string }> {
    const errors: Array<{ row: number; field?: string; message: string }> = [];

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!row[field] || row[field] === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `Required field '${field}' is missing or empty`,
        });
      }
    }

    // Validate date formats
    if (row.startTime && !this.isValidDateTime(row.startTime)) {
      errors.push({
        row: rowNumber,
        field: 'startTime',
        message: 'Invalid date/time format for startTime (expected ISO 8601)',
      });
    }

    if (row.endTime && !this.isValidDateTime(row.endTime)) {
      errors.push({
        row: rowNumber,
        field: 'endTime',
        message: 'Invalid date/time format for endTime (expected ISO 8601)',
      });
    }

    // Validate end time is after start time
    if (row.startTime && row.endTime) {
      const start = new Date(row.startTime);
      const end = new Date(row.endTime);
      if (end <= start) {
        errors.push({
          row: rowNumber,
          message: 'End time must be after start time',
        });
      }
    }

    return errors;
  }

  /**
   * Validate ISO 8601 date/time format
   */
  private isValidDateTime(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Export schedule to CSV format
   * Requirements: 28.4
   */
  async exportScheduleToCsv(
    locationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    try {
      const shifts = await this.prisma.shift.findMany({
        where: {
          ...(locationId && { locationId }),
          ...(startDate &&
            endDate && {
              startTime: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
        include: {
          assignments: {
            include: {
              staff: true,
            },
          },
          skills: {
            include: {
              skill: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Build CSV content
      const csvLines: string[] = [];

      // Add header
      csvLines.push(this.CSV_HEADERS.join(','));

      // Add data rows
      for (const shift of shifts) {
        const assignment = shift.assignments[0];
        const skillIds = shift.skills.map((s) => s.skillId).join(';');

        csvLines.push(
          [
            shift.id,
            shift.locationId,
            shift.startTime.toISOString(),
            shift.endTime.toISOString(),
            assignment?.staffId || '',
            skillIds,
          ].join(',')
        );
      }

      return csvLines.join('\n');
    } catch (error) {
      this.logger.error('Error exporting schedule to CSV:', error);
      throw error;
    }
  }
}
