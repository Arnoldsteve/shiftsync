import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CreateUserDto, AssignRoleDto, AddSkillDto, AddCertificationDto } from '@shiftsync/shared';
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
}
