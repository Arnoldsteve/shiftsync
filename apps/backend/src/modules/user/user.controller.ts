import { Controller, Post, Get, Body, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CreateUserDto,
  AssignRoleDto,
  AddSkillDto,
  AddCertificationDto,
  SetAvailabilityWindowDto,
  AddAvailabilityExceptionDto,
  SetDesiredHoursDto,
} from '@shiftsync/shared';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from './casl/policies.guard';
import { CheckPolicies } from './decorators/check-policies.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Action } from './casl/types';
import {
  ApiCreateUserDocs,
  ApiAssignRoleDocs,
  ApiAddSkillDocs,
  ApiAddCertificationDocs,
  ApiGetUserByIdDocs,
  ApiGetCurrentUserDocs,
  ApiGetUsersByLocationDocs,
} from './user.docs';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Create user - Admin only (PBAC)
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'User'))
  @ApiCreateUserDocs()
  async createUser(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  /**
   * Assign role to user - Admin only (PBAC)
   * Requirements: 1.2, 1.3
   */
  @Post(':id/role')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  @ApiAssignRoleDocs()
  async assignRole(@Param('id') userId: string, @Body() data: AssignRoleDto) {
    return this.userService.assignRole(userId, data);
  }

  /**
   * Add skill to user - Admin or Manager (with location authorization check)
   * Requirements: 2.1, 2.3
   * PBAC: Manager can only add skills to staff at their authorized locations
   */
  @Post(':id/skills')
  @CheckPolicies((ability) => ability.can(Action.Create, 'UserSkill'))
  @ApiAddSkillDocs()
  async addSkill(
    @Param('id') userId: string,
    @Body() data: AddSkillDto,
    @CurrentUser('id') assignedBy: string,
    @CurrentUser() currentUser: any
  ) {
    const managerLocationIds =
      currentUser.role === Role.MANAGER
        ? await this.userService.getAuthorizedLocationIds(currentUser.id)
        : undefined;

    return this.userService.addSkill(userId, data, assignedBy, managerLocationIds);
  }

  /**
   * Add location certification to user - Admin or Manager (with location authorization check)
   * Requirements: 2.2, 2.4
   * PBAC: Manager can only certify staff for their authorized locations
   */
  @Post(':id/certifications')
  @CheckPolicies((ability) => ability.can(Action.Create, 'LocationCertification'))
  @ApiAddCertificationDocs()
  async addCertification(
    @Param('id') userId: string,
    @Body() data: AddCertificationDto,
    @CurrentUser('id') certifiedBy: string,
    @CurrentUser() currentUser: any
  ) {
    const managerLocationIds =
      currentUser.role === Role.MANAGER
        ? await this.userService.getAuthorizedLocationIds(currentUser.id)
        : undefined;

    return this.userService.addLocationCertification(userId, data, certifiedBy, managerLocationIds);
  }

  /**
   * Get all users - PBAC: Admin or Manager can read users
   * Requirements: 1.5
   */
  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  /**
   * Get current user profile - PBAC: All authenticated users can read their own profile
   * Requirements: 30.4
   */
  @Get('me')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiGetCurrentUserDocs()
  async getCurrentUser(@CurrentUser('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  /**
   * Get all skills - PBAC: All authenticated users can read
   * Requirements: 2.1
   */
  @Get('skills/all')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getAllSkills() {
    return this.userService.getAllSkills();
  }

  /**
   * Get user by ID - PBAC: All authenticated users can read
   * Requirements: 1.5
   */
  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiGetUserByIdDocs()
  async getUserById(@Param('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  /**
   * Get users by location - PBAC: Admin or Manager can read users
   * Requirements: 2.5
   */
  @Get('location/:locationId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiGetUsersByLocationDocs()
  async getUsersByLocation(@Param('locationId') locationId: string) {
    return this.userService.getUsersByLocation(locationId);
  }

  // ============================================
  // Availability Management Endpoints (Requirement 31)
  // ============================================

  /**
   * Set availability window for current user
   * Requirements: 31.1, 31.5
   * PBAC: Staff can only set their own availability
   */
  @Post('me/availability/windows')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  async setAvailabilityWindow(
    @CurrentUser('id') userId: string,
    @Body() data: any // Will be validated by Zod in service
  ) {
    return this.userService.setAvailabilityWindow(userId, data);
  }

  /**
   * Remove availability window
   * Requirements: 31.5
   * PBAC: Staff can only remove their own availability windows
   */
  @Post('me/availability/windows/:windowId/remove')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  async removeAvailabilityWindow(
    @CurrentUser('id') userId: string,
    @Param('windowId') windowId: string
  ) {
    return this.userService.removeAvailabilityWindow(windowId, userId);
  }

  /**
   * Add availability exception for current user
   * Requirements: 31.2
   * PBAC: Staff can only add exceptions for themselves
   */
  @Post('me/availability/exceptions')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  async addAvailabilityException(
    @CurrentUser('id') userId: string,
    @Body() data: any // Will be validated by Zod in service
  ) {
    return this.userService.addAvailabilityException(userId, data);
  }

  /**
   * Get availability for current user
   * Requirements: 31.1, 31.2
   * PBAC: Staff can read their own availability
   */
  @Get('me/availability')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getAvailability(@CurrentUser('id') userId: string) {
    return this.userService.getAvailability(userId);
  }

  /**
   * Get availability for a specific user (Admin/Manager)
   * Requirements: 31.1, 31.2
   * PBAC: Admin and Manager can read staff availability
   */
  @Get(':id/availability')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getUserAvailability(@Param('id') userId: string) {
    return this.userService.getAvailability(userId);
  }

  // ============================================
  // Desired Hours Endpoints (Requirement 41)
  // ============================================

  /**
   * Set desired weekly hours for current user
   * Requirements: 41.1
   * PBAC: Staff can set their own desired hours
   */
  @Post('me/desired-hours')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  async setDesiredWeeklyHours(
    @CurrentUser('id') userId: string,
    @Body() data: any // Will be validated by Zod in service
  ) {
    return this.userService.setDesiredWeeklyHours(userId, data);
  }

  /**
   * Get desired weekly hours for current user
   * Requirements: 41.1
   * PBAC: Staff can read their own desired hours
   */
  @Get('me/desired-hours')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getDesiredWeeklyHours(@CurrentUser('id') userId: string) {
    const hours = await this.userService.getDesiredWeeklyHours(userId);
    return { desiredWeeklyHours: hours };
  }

  /**
   * Get desired weekly hours for a specific user (Admin/Manager)
   * Requirements: 41.1
   * PBAC: Admin and Manager can read staff desired hours
   */
  @Get(':id/desired-hours')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getUserDesiredWeeklyHours(@Param('id') userId: string) {
    const hours = await this.userService.getDesiredWeeklyHours(userId);
    return { desiredWeeklyHours: hours };
  }
}
