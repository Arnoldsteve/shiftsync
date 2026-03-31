import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CreateUserDto, AssignRoleDto, AddSkillDto, AddCertificationDto } from '@shiftsync/shared';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from './casl/policies.guard';
import { CheckPolicies } from './decorators/check-policies.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Action } from './casl/types';

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
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createUser(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  /**
   * Assign role to user - Admin only (PBAC)
   * Requirements: 1.2, 1.3
   */
  @Post(':id/role')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
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
  @ApiOperation({ summary: 'Add skill to user' })
  @ApiResponse({ status: 201, description: 'Skill added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
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
  @ApiOperation({ summary: 'Add location certification to user' })
  @ApiResponse({ status: 201, description: 'Certification added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
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
   * Get user by ID - PBAC: All authenticated users can read
   * Requirements: 1.5
   */
  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  /**
   * Get current user profile - PBAC: All authenticated users can read their own profile
   * Requirements: 30.4
   */
  @Get('me')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getCurrentUser(@CurrentUser('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  /**
   * Get users by location - PBAC: Admin or Manager can read users
   * Requirements: 2.5
   */
  @Get('location/:locationId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get users by location' })
  @ApiResponse({ status: 200, description: 'Users found' })
  async getUsersByLocation(@Param('locationId') locationId: string) {
    return this.userService.getUsersByLocation(locationId);
  }
}
