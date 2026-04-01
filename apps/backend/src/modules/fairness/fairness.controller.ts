import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FairnessService } from './fairness.service';
import { QueueService } from '../queue/queue.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { Action } from '../user/casl/types';

@ApiTags('Fairness')
@ApiBearerAuth()
@Controller('fairness')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class FairnessController {
  constructor(
    private readonly fairnessService: FairnessService,
    private readonly queueService: QueueService
  ) {}

  /**
   * Get hour distribution for location
   * Requirements: 13.1, 13.2, 13.3
   */
  @Get(':locationId/hours')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get hour distribution for location' })
  async getHourDistribution(
    @Param('locationId') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.fairnessService.calculateHourDistribution(
      locationId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  /**
   * Get premium shift distribution for location
   * Requirements: 14.1, 14.2, 14.3, 14.4
   */
  @Get(':locationId/premium')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get premium shift distribution for location' })
  async getPremiumShiftDistribution(
    @Param('locationId') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.fairnessService.calculatePremiumShiftDistribution(
      locationId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  /**
   * Get desired hours comparison for location
   * Requirements: 41.2, 41.3, 41.4, 41.5
   */
  @Get(':locationId/desired-hours')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Compare actual vs desired hours for location' })
  async getDesiredHoursComparison(
    @Param('locationId') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.fairnessService.compareActualToDesiredHours(
      locationId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  /**
   * Get under-scheduled staff for location
   * Requirements: 41.2, 41.3, 41.4
   */
  @Get(':locationId/under-scheduled')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get under-scheduled staff for location' })
  async getUnderScheduledStaff(
    @Param('locationId') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const result = await this.fairnessService.compareActualToDesiredHours(
      locationId,
      new Date(startDate),
      new Date(endDate)
    );
    return result.underScheduled;
  }

  /**
   * Get over-scheduled staff for location
   * Requirements: 41.2, 41.3, 41.4
   */
  @Get(':locationId/over-scheduled')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get over-scheduled staff for location' })
  async getOverScheduledStaff(
    @Param('locationId') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const result = await this.fairnessService.compareActualToDesiredHours(
      locationId,
      new Date(startDate),
      new Date(endDate)
    );
    return result.overScheduled;
  }

  /**
   * Generate fairness report (background job)
   * Requirements: 13.4, 13.5, 24.2
   */
  @Post(':locationId/report')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Generate fairness report as background job' })
  async generateFairnessReport(
    @Param('locationId') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const job = await this.queueService.queueFairnessReport(
      locationId,
      new Date(startDate),
      new Date(endDate)
    );

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Fairness report generation queued',
    };
  }
}
