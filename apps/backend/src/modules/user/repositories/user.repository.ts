import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role, User, Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        certifications: {
          include: {
            location: true,
          },
        },
        managerLocations: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        certifications: {
          include: {
            location: true,
          },
        },
        managerLocations: {
          include: {
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        certifications: {
          include: {
            location: true,
          },
        },
        managerLocations: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  async findByCertifiedLocation(locationId: string): Promise<User[]> {
    const certifications = await this.prisma.locationCertification.findMany({
      where: { locationId },
      include: {
        user: {
          include: {
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    return certifications.map((cert) => cert.user);
  }

  async updateRole(id: string, role: Role): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async exists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Update user with partial data
   * Used for updating fields like desiredWeeklyHours
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        certifications: {
          include: {
            location: true,
          },
        },
        managerLocations: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  /**
   * Find managers assigned to a specific location
   */
  async findManagersByLocation(locationId: string): Promise<User[]> {
    const managerAssignments = await this.prisma.managerLocation.findMany({
      where: { locationId },
      include: {
        manager: true,
      },
    });

    return managerAssignments.map((assignment) => assignment.manager);
  }
}
