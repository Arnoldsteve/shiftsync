import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalloutService } from './callout.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { Action } from '../user/casl/types';

@ApiTags('Callouts')
@ApiBearerAuth()
@Controller('callouts')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CalloutController {
  constructor(private readonly calloutService: CalloutService) {}

  /**
   * Report callout - Staff
   * Requirements: 22.1, 22.2, 22.3, 22.4
   */
  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'User'))
  @ApiOperation({ summary: 'Report callout for a shift' })
  async reportCallout(
    @Body() data: { shiftId: string; reason?: string },
    @CurrentUser('id') staffId: string
  ) {
    return this.calloutService.reportCallout(data.shiftId, staffId, data.reason);
  }

  /**
   * Get current coverage for all locations - Manager/Admin
   * Requirements: 21.1, 21.2, 21.3
   */
  @Get('dashboard/coverage')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get current coverage for all locations' })
  async getCurrentCoverage() {
    return this.calloutService.getCurrentCoverage();
  }

  /**
   * Get upcoming shifts in next 24 hours - Manager/Admin
   * Requirements: 21.4
   */
  @Get('dashboard/upcoming')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get upcoming shifts in next 24 hours' })
  async getUpcomingShifts() {
    return this.calloutService.getUpcomingShifts();
  }

  /**
   * Find available staff for uncovered shift - Manager
   * Requirements: 23.1, 23.2, 23.3
   */
  @Get('shifts/:id/available-staff')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Find available staff for uncovered shift' })
  async findAvailableStaff(@Param('id') shiftId: string) {
    return this.calloutService.findAvailableStaff(shiftId);
  }

  /**
   * Send shift offer to specific staff - Manager
   * Requirements: 23.4, 23.5
   */
  @Post('shifts/:id/offer')
  @CheckPolicies((ability) => ability.can(Action.Create, 'User'))
  @ApiOperation({ summary: 'Send shift offer to specific staff' })
  async sendShiftOffer(@Param('id') shiftId: string, @Body() data: { staffId: string }) {
    await this.calloutService.sendShiftOffer(shiftId, data.staffId);
    return { message: 'Shift offer sent successfully' };
  }
}
