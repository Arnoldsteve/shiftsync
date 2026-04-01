import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Get locations based on user role
   * - Admin: Returns all locations
   * - Manager: Returns only authorized locations
   * - Staff: Returns all locations (for viewing purposes)
   * Requirements: 1.3, 3.5
   */
  @Get()
  async getAllLocations(@CurrentUser() user: any) {
    // If user is a manager, filter by their authorized locations
    if (user.role === 'MANAGER' && user.managedLocationIds) {
      return this.locationService.getLocationsByIds(user.managedLocationIds);
    }

    // Admin and Staff see all locations
    return this.locationService.getAllLocations();
  }
}
