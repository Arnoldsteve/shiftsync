import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { Action } from '../user/casl/types';
import { LocationConfigUpdate } from './interfaces';

@ApiTags('Configuration')
@ApiBearerAuth()
@Controller('api/locations')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get location configuration - Manager/Admin
   * Requirements: 27.1
   */
  @Get(':id/config')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Get location configuration' })
  async getLocationConfig(@Param('id') locationId: string) {
    return this.configService.getLocationConfig(locationId);
  }

  /**
   * Update location configuration - Admin
   * Requirements: 27.2, 27.3, 27.4, 27.5
   */
  @Put(':id/config')
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
  @ApiOperation({ summary: 'Update location configuration' })
  async updateLocationConfig(
    @Param('id') locationId: string,
    @Body() updates: LocationConfigUpdate,
    @CurrentUser('id') updatedBy: string
  ) {
    return this.configService.updateLocationConfig(locationId, updates, updatedBy);
  }
}
