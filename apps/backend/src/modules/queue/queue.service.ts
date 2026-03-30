import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { FairnessReportJobData, OvertimeReportJobData } from './interfaces';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('fairness-report')
    private readonly fairnessReportQueue: Queue<FairnessReportJobData>,
    @InjectQueue('overtime-report')
    private readonly overtimeReportQueue: Queue<OvertimeReportJobData>
  ) {}

  /**
   * Queue a fairness report generation job
   * Requirements: 24.2
   */
  async queueFairnessReport(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Job<FairnessReportJobData>> {
    this.logger.log(
      `Queueing fairness report for location ${locationId} from ${startDate} to ${endDate}`
    );

    return this.fairnessReportQueue.add('generate-fairness-report', {
      locationId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  }

  /**
   * Queue an overtime report generation job
   * Requirements: 24.3
   */
  async queueOvertimeReport(
    locationId: string,
    payPeriods: Array<{ weekStart: Date }>
  ): Promise<Job<OvertimeReportJobData>> {
    this.logger.log(
      `Queueing overtime report for location ${locationId} with ${payPeriods.length} pay periods`
    );

    return this.overtimeReportQueue.add('generate-overtime-report', {
      locationId,
      payPeriods: payPeriods.map((p) => ({
        weekStart: p.weekStart.toISOString(),
      })),
    });
  }

  /**
   * Get job status by ID
   * Requirements: 24.5
   */
  async getJobStatus(
    queueName: 'fairness-report' | 'overtime-report',
    jobId: string
  ): Promise<{
    id: string;
    state: string;
    progress: any;
    returnvalue: any;
    failedReason?: string;
  }> {
    const queue =
      queueName === 'fairness-report' ? this.fairnessReportQueue : this.overtimeReportQueue;

    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnvalue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id!,
      state,
      progress,
      returnvalue,
      failedReason,
    };
  }

  /**
   * Get all jobs in a queue by state
   * Requirements: 24.5
   */
  async getJobsByState(
    queueName: 'fairness-report' | 'overtime-report',
    state: 'waiting' | 'active' | 'completed' | 'failed'
  ): Promise<Job[]> {
    const queue =
      queueName === 'fairness-report' ? this.fairnessReportQueue : this.overtimeReportQueue;

    switch (state) {
      case 'waiting':
        return queue.getWaiting();
      case 'active':
        return queue.getActive();
      case 'completed':
        return queue.getCompleted();
      case 'failed':
        return queue.getFailed();
      default:
        return [];
    }
  }

  /**
   * Retry a failed job
   * Requirements: 24.5
   */
  async retryJob(queueName: 'fairness-report' | 'overtime-report', jobId: string): Promise<void> {
    const queue =
      queueName === 'fairness-report' ? this.fairnessReportQueue : this.overtimeReportQueue;

    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.retry();
    this.logger.log(`Retrying job ${jobId} in queue ${queueName}`);
  }
}
