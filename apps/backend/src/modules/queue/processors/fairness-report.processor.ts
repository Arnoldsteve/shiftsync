import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FairnessService } from '../../fairness/fairness.service';
import { CacheService } from '../../cache/cache.service';
import { FairnessReportJobData } from '../interfaces';

@Processor('fairness-report')
export class FairnessReportProcessor extends WorkerHost {
  private readonly logger = new Logger(FairnessReportProcessor.name);

  constructor(
    private readonly fairnessService: FairnessService,
    private readonly cacheService: CacheService
  ) {
    super();
  }

  async process(job: Job<FairnessReportJobData>): Promise<any> {
    this.logger.log(`Processing fairness report job ${job.id}`);

    const { locationId, startDate, endDate } = job.data;

    try {
      // Generate fairness report
      const report = await this.fairnessService.generateFairnessReport(
        locationId,
        new Date(startDate),
        new Date(endDate)
      );

      // Store report in cache for 1 hour
      const cacheKey = `fairness-report:${locationId}:${startDate}:${endDate}`;
      await this.cacheService.set(cacheKey, JSON.stringify(report), 3600);

      this.logger.log(`Fairness report job ${job.id} completed successfully`);

      return {
        success: true,
        reportId: cacheKey,
        report,
      };
    } catch (error) {
      this.logger.error(`Fairness report job ${job.id} failed:`, error);
      throw error;
    }
  }
}
