import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OvertimeService } from '../../overtime/overtime.service';
import { CacheService } from '../../cache/cache.service';

export interface OvertimeReportJobData {
  locationId: string;
  payPeriods: Array<{
    weekStart: string;
  }>;
}

@Processor('overtime-report')
export class OvertimeReportProcessor extends WorkerHost {
  private readonly logger = new Logger(OvertimeReportProcessor.name);

  constructor(
    private readonly overtimeService: OvertimeService,
    private readonly cacheService: CacheService
  ) {
    super();
  }

  async process(job: Job<OvertimeReportJobData>): Promise<any> {
    this.logger.log(`Processing overtime report job ${job.id}`);

    const { locationId, payPeriods } = job.data;

    try {
      const reports = [];

      // Generate overtime report for each pay period
      for (const period of payPeriods) {
        const report = await this.overtimeService.getOvertimeReport(
          locationId,
          new Date(period.weekStart)
        );
        reports.push(report);
      }

      // Store reports in cache for 1 hour
      const cacheKey = `overtime-report:${locationId}:${Date.now()}`;
      await this.cacheService.set(cacheKey, JSON.stringify(reports), 3600);

      this.logger.log(`Overtime report job ${job.id} completed successfully`);

      return {
        success: true,
        reportId: cacheKey,
        reports,
      };
    } catch (error) {
      this.logger.error(`Overtime report job ${job.id} failed:`, error);
      throw error;
    }
  }
}
