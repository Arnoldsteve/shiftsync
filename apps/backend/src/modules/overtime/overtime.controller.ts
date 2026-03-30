import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OvertimeService } from './overtime.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { Action } from '../user/casl/types';

@ApiTags('Overtime')
@ApiBearerAuth()
@Controller('api/overtime')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  /**
   * Calculate overtime for staff
   * Requirements: 9.1, 9.2, 9.3
   */
  @Get(':staffId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Overtime'))
  @ApiOperation({ summary: 'Calculate overtime for staff' })
  async calculateOvertime(
    @Param('staffId') staffId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.overtimeService.calculateHours(staffId, new Date(startDate), new Date(endDate));
  }

  /**
   * Get overtime report for location
   * Requirements: 9.4
   */
  @Get('report/:locationId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Overtime'))
  @ApiOperation({ summary: 'Get overtime report for location' })
  async getOvertimeReport(
    @Param('locationId') locationId: string,
    @Query('weekStart') weekStart: string
  ) {
    return this.overtimeService.getOvertimeReport(locationId, new Date(weekStart));
  }
}
