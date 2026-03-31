import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { CreateUserDto, AssignRoleDto, AddSkillDto, AddCertificationDto } from '@shiftsync/shared';
import { UserRepository } from './repositories/user.repository';
import { UserSkillRepository } from './repositories/user-skill.repository';
import { LocationCertificationRepository } from './repositories/location-certification.repository';
import { ManagerLocationRepository } from './repositories/manager-location.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSkillRepository: UserSkillRepository,
    private readonly locationCertificationRepository: LocationCertificationRepository,
    private readonly managerLocationRepository: ManagerLocationRepository
  ) {}

  /**
   * Create a new user with hashed password
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  async createUser(data: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.exists(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate manager role requires location authorization
    if (data.role === 'MANAGER' && (!data.locationIds || data.locationIds.length === 0)) {
      throw new BadRequestException('Manager role requires at least one authorized location');
    }

    // Hash password using Argon2
    const passwordHash = await argon2.hash(data.password);

    // Create user with explicit role casting
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as unknown as Role,
    });

    // If manager, assign location authorizations
    if (data.role === 'MANAGER' && data.locationIds) {
      for (const locationId of data.locationIds) {
        await this.managerLocationRepository.create({
          manager: { connect: { id: user.id } },
          location: { connect: { id: locationId } },
        });
      }
    }

    return user;
  }

  /**
   * Assign role to user with location authorization for managers
   * Requirements: 1.2, 1.3
   */
  async assignRole(userId: string, data: AssignRoleDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate manager role requires location authorization
    if (data.role === 'MANAGER' && (!data.locationIds || data.locationIds.length === 0)) {
      throw new BadRequestException('Manager role requires at least one authorized location');
    }

    // Update user role with explicit casting
    const updatedUser = await this.userRepository.updateRole(userId, data.role as unknown as Role);

    // If manager, update location authorizations
    if (data.role === 'MANAGER' && data.locationIds) {
      // Remove existing manager locations
      await this.managerLocationRepository.deleteByManagerId(userId);

      // Add new manager locations
      for (const locationId of data.locationIds) {
        await this.managerLocationRepository.create({
          manager: { connect: { id: userId } },
          location: { connect: { id: locationId } },
        });
      }
    } else if (data.role !== 'MANAGER') {
      // If changing from manager to another role, remove all manager locations
      await this.managerLocationRepository.deleteByManagerId(userId);
    }

    return updatedUser;
  }

  /**
   * Add skill to user
   * Requirements: 2.1, 2.3
   * PBAC: Manager can only add skills to staff at their authorized locations
   */
  async addSkill(
    userId: string,
    data: AddSkillDto,
    assignedBy: string,
    managerLocationIds?: string[]
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If manager, verify they can manage this user (user must be certified at one of manager's locations)
    if (managerLocationIds) {
      const userCertifications = await this.locationCertificationRepository.findByUserId(userId);
      const userLocationIds = userCertifications.map((cert) => cert.locationId);
      const hasCommonLocation = userLocationIds.some((locId) => managerLocationIds.includes(locId));

      if (!hasCommonLocation) {
        throw new ForbiddenException(
          'You can only manage skills for staff at your authorized locations'
        );
      }
    }

    // Check if skill already assigned
    const exists = await this.userSkillRepository.exists(userId, data.skillId);
    if (exists) {
      throw new ConflictException('Skill already assigned to user');
    }

    // Create user skill assignment
    const userSkill = await this.userSkillRepository.create({
      user: { connect: { id: userId } },
      skill: { connect: { id: data.skillId } },
      assignedBy,
    });

    return userSkill;
  }

  /**
   * Add location certification to user
   * Requirements: 2.2, 2.4
   * PBAC: Manager can only add certifications for their authorized locations
   */
  async addLocationCertification(
    userId: string,
    data: AddCertificationDto,
    certifiedBy: string,
    managerLocationIds?: string[]
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If manager, verify they can certify for this location
    if (managerLocationIds && !managerLocationIds.includes(data.locationId)) {
      throw new ForbiddenException(
        'You can only certify staff for locations you are authorized to manage'
      );
    }

    // Check if certification already exists
    const exists = await this.locationCertificationRepository.exists(userId, data.locationId);
    if (exists) {
      throw new ConflictException('Location certification already assigned to user');
    }

    // Create location certification
    const certification = await this.locationCertificationRepository.create({
      user: { connect: { id: userId } },
      location: { connect: { id: data.locationId } },
      certifiedBy,
    });

    return certification;
  }

  /**
   * Get user by ID with relations
   * Requirements: 1.5
   */
  async getUserById(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Get all users
   * Requirements: 1.5
   */
  async getAllUsers() {
    return this.userRepository.findAll();
  }

  /**
   * Get user by email
   * Requirements: 30.1
   */
  async getUserByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Get users by location (for managers)
   * Requirements: 2.5
   */
  async getUsersByLocation(locationId: string) {
    return this.userRepository.findByCertifiedLocation(locationId);
  }

  /**
   * Verify password
   * Requirements: 1.4, 30.1
   */
  async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    return argon2.verify(passwordHash, password);
  }

  /**
   * Get authorized location IDs for a manager
   * Requirements: 1.3, 2.5
   */
  async getAuthorizedLocationIds(managerId: string): Promise<string[]> {
    return this.managerLocationRepository.getAuthorizedLocationIds(managerId);
  }
}
