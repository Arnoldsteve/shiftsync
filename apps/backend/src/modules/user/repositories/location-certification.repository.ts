import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LocationCertification, Prisma } from '@prisma/client';

@Injectable()
export class LocationCertificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LocationCertificationCreateInput): Promise<LocationCertification> {
    return this.prisma.locationCertification.create({
      data,
      include: {
        location: true,
      },
    });
  }

  async findByUserAndLocation(
    userId: string,
    locationId: string
  ): Promise<LocationCertification | null> {
    return this.prisma.locationCertification.findUnique({
      where: {
        userId_locationId: {
          userId,
          locationId,
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<LocationCertification[]> {
    return this.prisma.locationCertification.findMany({
      where: { userId },
      include: {
        location: true,
      },
    });
  }

  async exists(userId: string, locationId: string): Promise<boolean> {
    const count = await this.prisma.locationCertification.count({
      where: {
        userId,
        locationId,
      },
    });
    return count > 0;
  }
}
