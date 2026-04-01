import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUES, JOB_NAMES } from './queue.constants';
import { FairnessReportJobData, OvertimeReportJobData } from './interfaces';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUES.FAIRNESS_REPORT)
    private readonly fairnessReportQueue: Queue<FairnessReportJobData>,
    @InjectQueue(QUEUES.OVERTIME_REPORT)
    private readonly overtimeReportQueue: Queue<OvertimeReportJobData>,
    @InjectQueue(QUEUES.DROP_REQUEST_EXPIRATION)
    private readonly dropRequestExpirationQueue: Queue<void>
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

    return this.fairnessReportQueue.add(JOB_NAMES.GENERATE_FAIRNESS_REPORT, {
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

    return this.overtimeReportQueue.add(JOB_NAMES.GENERATE_OVERTIME_REPORT, {
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
    queueName: QUEUES,
    jobId: string
  ): Promise<{
    id: string;
    state: string;
    progress: any;
    returnvalue: any;
    failedReason?: string;
  }> {
    let queue: Queue;

    switch (queueName) {
      case QUEUES.FAIRNESS_REPORT:
        queue = this.fairnessReportQueue;
        break;
      case QUEUES.OVERTIME_REPORT:
        queue = this.overtimeReportQueue;
        break;
      case QUEUES.DROP_REQUEST_EXPIRATION:
        queue = this.dropRequestExpirationQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

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
    queueName: QUEUES,
    state: 'waiting' | 'active' | 'completed' | 'failed'
  ): Promise<Job[]> {
    let queue: Queue;

    switch (queueName) {
      case QUEUES.FAIRNESS_REPORT:
        queue = this.fairnessReportQueue;
        break;
      case QUEUES.OVERTIME_REPORT:
        queue = this.overtimeReportQueue;
        break;
      case QUEUES.DROP_REQUEST_EXPIRATION:
        queue = this.dropRequestExpirationQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

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
  async retryJob(queueName: QUEUES, jobId: string): Promise<void> {
    let queue: Queue;

    switch (queueName) {
      case QUEUES.FAIRNESS_REPORT:
        queue = this.fairnessReportQueue;
        break;
      case QUEUES.OVERTIME_REPORT:
        queue = this.overtimeReportQueue;
        break;
      case QUEUES.DROP_REQUEST_EXPIRATION:
        queue = this.dropRequestExpirationQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.retry();
    this.logger.log(`Retrying job ${jobId} in queue ${queueName}`);
  }

  /**
   * Schedule recurring drop request expiration job
   * Runs every 15 minutes to check for expired drop requests
   * Requirements: 33.3, 33.5
   */
  async scheduleDropRequestExpiration(): Promise<void> {
    this.logger.log('Scheduling drop request expiration job to run every 15 minutes');

    // Add a repeatable job that runs every 15 minutes
    await this.dropRequestExpirationQueue.add(
      JOB_NAMES.EXPIRE_DROP_REQUESTS,
      undefined, // No data needed for void type
      {
        repeat: {
          pattern: '*/15 * * * *', // Every 15 minutes (cron format)
        },
        jobId: 'drop-request-expiration-recurring', // Unique ID to prevent duplicates
      }
    );

    this.logger.log('Drop request expiration job scheduled successfully');
  }

  /**
   * Manually trigger drop request expiration check
   * Useful for testing and admin operations
   * Requirements: 33.3, 33.5
   */
  async triggerDropRequestExpiration(): Promise<Job<void>> {
    this.logger.log('Manually triggering drop request expiration check');

    return this.dropRequestExpirationQueue.add(JOB_NAMES.EXPIRE_DROP_REQUESTS, undefined);
  }
}
