import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { Action } from '../user/casl/types';
import {
  ApiCreateShiftDocs,
  ApiAssignStaffDocs,
  ApiGetShiftsDocs,
  ApiGetStaffScheduleDocs,
  ApiUnassignStaffDocs,
} from './schedule.docs';

@ApiTags('Schedule')
@ApiBearerAuth()
@Controller('schedule')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * Create shift - Manager only
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   * PBAC: Verified at service level via managerLocationIds
   */
  @Post('shifts')
  @CheckPolicies((ability) => ability.can(Action.Create, 'Shift'))
  @ApiCreateShiftDocs()
  async createShift(
    @Body()
    data: {
      locationId: string;
      startTime: string;
      endTime: string;
      requiredSkillIds: string[];
      requiredHeadcount?: number;
    },
    @CurrentUser() user: any
  ) {
    return this.scheduleService.createShift(
      data.locationId,
      new Date(data.startTime),
      new Date(data.endTime),
      data.requiredSkillIds,
      user.id,
      user.managedLocationIds, // Pass authorized IDs for immediate validation
      data.requiredHeadcount
    );
  }

  /**
   * Get shifts by location and date range
   * Senior Refactor: locationId is now optional to support "Global" (All) view.
   * Requirements: 17.1, 17.4, 25.4 (High-Capacity Monitoring)
   */
  @Get('shifts')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Shift'))
  @ApiGetShiftsDocs()
  async getShifts(
    @CurrentUser() user: any, // Pass the full user object for PBAC filtering
    @Query('locationId') locationId?: string, // Now optional (?)
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.scheduleService.getSchedule(
      user,
      locationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 50
    );
  }

  /**
   * Get specific staff member's schedule
   * Requirements: 17.4
   */
  @Get('staff/:id/shifts')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Shift'))
  @ApiGetStaffScheduleDocs()
  async getStaffSchedule(
    @Param('id') staffId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.scheduleService.getStaffSchedule(
      staffId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  /**
   * Assign staff to shift - Manager only
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 39.4
   * Triggers ConflictService & ComplianceService checks
   */
  @Post('shifts/:id/assign')
  @CheckPolicies((ability) => ability.can(Action.Create, 'Assignment'))
  @ApiAssignStaffDocs()
  async assignStaff(
    @Param('id') shiftId: string,
    @Body() data: { staffId: string; overrideReason?: string },
    @CurrentUser('id') assignedBy: string
  ) {
    return this.scheduleService.assignStaff(shiftId, data.staffId, assignedBy, data.overrideReason);
  }

  /**
   * Unassign staff from shift - Manager only
   * Requirements: 8.4
   */
  @Delete('assignments/:id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'Assignment'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUnassignStaffDocs()
  async unassignStaff(@Param('id') shiftId: string, @CurrentUser('id') unassignedBy: string) {
    await this.scheduleService.unassignStaff(shiftId, unassignedBy);
  }

  /**
   * Publish schedule for a week - Manager only
   * Requirements: 32.1, 32.5
   */
  @Post('publish')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Shift'))
  async publishSchedule(
    @Body() data: { locationId: string; weekStartDate: string },
    @CurrentUser() user: any
  ) {
    return this.scheduleService.publishSchedule(
      data.locationId,
      new Date(data.weekStartDate),
      user.id,
      user.managedLocationIds
    );
  }

  /**
   * Unpublish schedule for a week - Manager only
   * Requirements: 32.4
   */
  @Post('unpublish')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Shift'))
  async unpublishSchedule(
    @Body() data: { locationId: string; weekStartDate: string },
    @CurrentUser() user: any
  ) {
    return this.scheduleService.unpublishSchedule(
      data.locationId,
      new Date(data.weekStartDate),
      user.id,
      user.managedLocationIds
    );
  }

  /**
   * Get published schedule for staff - Staff role
   * Requirements: 32.2, 32.3
   */
  @Get('staff/:id/published-shifts')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Shift'))
  async getPublishedStaffSchedule(
    @Param('id') staffId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.scheduleService.getStaffSchedulePublished(
      staffId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  /**
   * Get available shifts for pickup - Staff role
   * Requirements: 34.1, 34.2
   * Returns unassigned published shifts that match staff qualifications
   */
  @Get('available-shifts')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Shift'))
  async getAvailableShifts(@CurrentUser('id') staffId: string) {
    return this.scheduleService.getAvailableShifts(staffId);
  }

  /**
   * Pick up an available shift - Staff role
   * Requirements: 34.3, 34.4, 34.5
   */
  @Post('shifts/:id/pickup')
  @CheckPolicies((ability) => ability.can(Action.Create, 'Assignment'))
  async pickupShift(@Param('id') shiftId: string, @CurrentUser('id') staffId: string) {
    return this.scheduleService.pickupShift(shiftId, staffId);
  }

  /**
   * Get alternative staff suggestions for a shift - Manager only
   * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5
   */
  @Get('shifts/:id/alternatives')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Shift'))
  async getAlternativeStaff(
    @Param('id') shiftId: string,
    @Query('excludeStaffId') excludeStaffId?: string
  ) {
    return this.scheduleService.getAlternativeStaff(shiftId, excludeStaffId);
  }

  /**
   * Get shift headcount status - Manager only
   * Requirements: 42.3, 42.4
   */
  @Get('shifts/:id/headcount')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Shift'))
  async getShiftHeadcountStatus(@Param('id') shiftId: string) {
    return this.scheduleService.getShiftHeadcountStatus(shiftId);
  }
}
