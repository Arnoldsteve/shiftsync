import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SwapService } from '../../swap/swap.service';

/**
 * Drop Request Expiration Processor
 * Runs periodically to expire drop requests that have passed their expiration time
 * Requirements: 33.3, 33.5
 */
@Processor('DROP_REQUEST_EXPIRATION')
export class DropRequestExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(DropRequestExpirationProcessor.name);

  constructor(private readonly swapService: SwapService) {
    super();
  }

  async process(job: Job<void>): Promise<any> {
    this.logger.log(`Processing drop request expiration job ${job.id}`);

    try {
      // Call the service method to expire drop requests
      const expiredCount = await this.swapService.expireDropRequests();

      this.logger.log(
        `Drop request expiration job ${job.id} completed successfully. Expired ${expiredCount} requests.`
      );

      return {
        success: true,
        expiredCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Drop request expiration job ${job.id} failed:`, error);
      throw error;
    }
  }
}
