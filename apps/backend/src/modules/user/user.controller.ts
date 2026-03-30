import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CreateUserDto,
  AssignRoleDto,
  AddSkillDto,
  AddCertificationDto,
  LoginDto,
} from '@shiftsync/shared';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PoliciesGuard } from './casl/policies.guard';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CheckPolicies } from './decorators/check-policies.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Action } from './casl/casl-ability.factory';

@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {}

  /**
   * Login endpoint - public
   * Requirements: 30.1, 30.2
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: LoginDto) {
    return this.authService.authenticate(data);
  }

  /**
   * Create user - Admin only
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  @Post()
  @Roles(Role.ADMIN)
  async createUser(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  /**
   * Assign role to user - Admin only
   * Requirements: 1.2, 1.3
   */
  @Post(':id/role')
  @Roles(Role.ADMIN)
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
   * Get user by ID
   * Requirements: 1.5
   */
  @Get(':id')
  async getUserById(@Param('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  /**
   * Get current user profile
   * Requirements: 30.4
   */
  @Get('me')
  async getCurrentUser(@CurrentUser('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  /**
   * Get users by location - Admin or Manager
   * Requirements: 2.5
   */
  @Get('location/:locationId')
  @Roles(Role.ADMIN, Role.MANAGER)
  async getUsersByLocation(@Param('locationId') locationId: string) {
    return this.userService.getUsersByLocation(locationId);
  }
}
