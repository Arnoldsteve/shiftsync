import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Location } from '@prisma/client';

@Injectable()
export class LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Location[]> {
    return this.prisma.location.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string): Promise<Location | null> {
    return this.prisma.location.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[]): Promise<Location[]> {
    return this.prisma.location.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
