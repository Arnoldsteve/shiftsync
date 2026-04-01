import { Injectable } from '@nestjs/common';
import { LocationRepository } from './repositories/location.repository';

@Injectable()
export class LocationService {
  constructor(private readonly locationRepository: LocationRepository) {}

  /**
   * Get all locations
   */
  async getAllLocations() {
    return this.locationRepository.findAll();
  }

  /**
   * Get locations by IDs (for manager authorization filtering)
   * Requirements: 1.3
   */
  async getLocationsByIds(locationIds: string[]) {
    return this.locationRepository.findByIds(locationIds);
  }
}
