import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { UserSkillRepository } from './repositories/user-skill.repository';
import { LocationCertificationRepository } from './repositories/location-certification.repository';
import { ManagerLocationRepository } from './repositories/manager-location.repository';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';

vi.mock('argon2');

describe('UserService', () => {
  let userService: UserService;
  let userRepository: UserRepository;
  let userSkillRepository: UserSkillRepository;
  let locationCertificationRepository: LocationCertificationRepository;
  let managerLocationRepository: ManagerLocationRepository;

  beforeEach(() => {
    userRepository = {
      exists: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      updateRole: vi.fn(),
      findByCertifiedLocation: vi.fn(),
    } as any;

    userSkillRepository = {
      exists: vi.fn(),
      create: vi.fn(),
    } as any;

    locationCertificationRepository = {
      exists: vi.fn(),
      create: vi.fn(),
    } as any;

    managerLocationRepository = {
      create: vi.fn(),
      deleteByManagerId: vi.fn(),
      getAuthorizedLocationIds: vi.fn(),
    } as any;

    userService = new UserService(
      userRepository,
      userSkillRepository,
      locationCertificationRepository,
      managerLocationRepository
    );
  });

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STAFF' as const,
      };

      const hashedPassword = 'hashed_password';
      const createdUser = {
        id: '1',
        email: createUserDto.email,
        passwordHash: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: Role.STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(userRepository.exists).mockResolvedValue(false);
      vi.mocked(argon2.hash).mockResolvedValue(hashedPassword);
      vi.mocked(userRepository.create).mockResolvedValue(createdUser);

      const result = await userService.createUser(createUserDto);

      expect(userRepository.exists).toHaveBeenCalledWith(createUserDto.email);
      expect(argon2.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: createUserDto.email,
        passwordHash: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: Role.STAFF,
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STAFF' as const,
      };

      vi.mocked(userRepository.exists).mockResolvedValue(true);

      await expect(userService.createUser(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if manager role without locations', async () => {
      const createUserDto = {
        email: 'manager@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Manager',
        role: 'MANAGER' as const,
      };

      vi.mocked(userRepository.exists).mockResolvedValue(false);

      await expect(userService.createUser(createUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addSkill', () => {
    it('should add skill to user', async () => {
      const userId = 'user-1';
      const skillId = 'skill-1';
      const assignedBy = 'admin-1';

      const user = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const userSkill = {
        id: 'user-skill-1',
        userId,
        skillId,
        assignedAt: new Date(),
        assignedBy,
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user as any);
      vi.mocked(userSkillRepository.exists).mockResolvedValue(false);
      vi.mocked(userSkillRepository.create).mockResolvedValue(userSkill as any);

      const result = await userService.addSkill(userId, { skillId }, assignedBy);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userSkillRepository.exists).toHaveBeenCalledWith(userId, skillId);
      expect(userSkillRepository.create).toHaveBeenCalled();
      expect(result).toEqual(userSkill);
    });

    it('should throw NotFoundException if user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        userService.addSkill('user-1', { skillId: 'skill-1' }, 'admin-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if skill already assigned', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user as any);
      vi.mocked(userSkillRepository.exists).mockResolvedValue(true);

      await expect(
        userService.addSkill('user-1', { skillId: 'skill-1' }, 'admin-1')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const passwordHash = 'hashed_password';
      const password = 'password123';

      vi.mocked(argon2.verify).mockResolvedValue(true);

      const result = await userService.verifyPassword(passwordHash, password);

      expect(argon2.verify).toHaveBeenCalledWith(passwordHash, password);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const passwordHash = 'hashed_password';
      const password = 'wrong_password';

      vi.mocked(argon2.verify).mockResolvedValue(false);

      const result = await userService.verifyPassword(passwordHash, password);

      expect(result).toBe(false);
    });
  });
});
