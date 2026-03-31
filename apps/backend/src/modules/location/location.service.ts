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
}
