import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ManagerLocation, Prisma } from '@prisma/client';

@Injectable()
export class ManagerLocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ManagerLocationCreateInput): Promise<ManagerLocation> {
    return this.prisma.managerLocation.create({
      data,
      include: {
        location: true,
      },
    });
  }

  async findByManagerAndLocation(
    managerId: string,
    locationId: string
  ): Promise<ManagerLocation | null> {
    return this.prisma.managerLocation.findUnique({
      where: {
        managerId_locationId: {
          managerId,
          locationId,
        },
      },
    });
  }

  async findByManagerId(managerId: string): Promise<ManagerLocation[]> {
    return this.prisma.managerLocation.findMany({
      where: { managerId },
      include: {
        location: true,
      },
    });
  }

  async deleteByManagerId(managerId: string): Promise<void> {
    await this.prisma.managerLocation.deleteMany({
      where: { managerId },
    });
  }

  async exists(managerId: string, locationId: string): Promise<boolean> {
    const count = await this.prisma.managerLocation.count({
      where: {
        managerId,
        locationId,
      },
    });
    return count > 0;
  }

  async getAuthorizedLocationIds(managerId: string): Promise<string[]> {
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { managerId },
      select: { locationId: true },
    });
    return managerLocations.map((ml) => ml.locationId);
  }
}
