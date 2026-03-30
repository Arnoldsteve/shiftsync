import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { Action } from '../user/casl/types';

@ApiTags('Job Queue')
@ApiBearerAuth()
@Controller('api/jobs')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Get job status list - Admin
   * Requirements: 24.5
   */
  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get job status list' })
  async getJobs(
    @Query('queue') queueName: 'fairness-report' | 'overtime-report',
    @Query('state') state: 'waiting' | 'active' | 'completed' | 'failed' = 'active'
  ) {
    const jobs = await this.queueService.getJobsByState(queueName, state);

    return {
      queue: queueName,
      state,
      count: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        timestamp: job.timestamp,
      })),
    };
  }

  /**
   * Get specific job status
   * Requirements: 24.5
   */
  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get specific job status' })
  async getJobStatus(
    @Param('id') jobId: string,
    @Query('queue') queueName: 'fairness-report' | 'overtime-report'
  ) {
    return this.queueService.getJobStatus(queueName, jobId);
  }

  /**
   * Retry failed job - Admin
   * Requirements: 24.5
   */
  @Post(':id/retry')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  @ApiOperation({ summary: 'Retry failed job' })
  async retryJob(
    @Param('id') jobId: string,
    @Query('queue') queueName: 'fairness-report' | 'overtime-report'
  ) {
    await this.queueService.retryJob(queueName, jobId);

    return {
      jobId,
      message: 'Job retry initiated',
    };
  }
}
