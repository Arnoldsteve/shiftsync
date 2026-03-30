import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  beforeEach(() => {
    userService = {
      getUserByEmail: vi.fn(),
      verifyPassword: vi.fn(),
      getUserById: vi.fn(),
    } as any;

    jwtService = {
      sign: vi.fn(),
      verify: vi.fn(),
    } as any;

    authService = new AuthService(userService, jwtService);
  });

  describe('authenticate', () => {
    it('should authenticate user and return token', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = 'jwt_token';

      vi.mocked(userService.getUserByEmail).mockResolvedValue(user as any);
      vi.mocked(userService.verifyPassword).mockResolvedValue(true);
      vi.mocked(jwtService.sign).mockReturnValue(token);

      const result = await authService.authenticate(loginDto);

      expect(userService.getUserByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(userService.verifyPassword).toHaveBeenCalledWith(user.passwordHash, loginDto.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      vi.mocked(userService.getUserByEmail).mockRejectedValue(new Error('User not found'));

      await expect(authService.authenticate(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      const user = {
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(userService.getUserByEmail).mockResolvedValue(user as any);
      vi.mocked(userService.verifyPassword).mockResolvedValue(false);

      await expect(authService.authenticate(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should validate token and return user', async () => {
      const token = 'valid_token';
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'STAFF',
      };

      const user = {
        id: payload.sub,
        email: payload.email,
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(jwtService.verify).mockReturnValue(payload as any);
      vi.mocked(userService.getUserById).mockResolvedValue(user as any);

      const result = await authService.validateToken(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(userService.getUserById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const token = 'invalid_token';

      vi.mocked(jwtService.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateToken(token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should validate user from JWT payload', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'STAFF',
      };

      const user = {
        id: payload.sub,
        email: payload.email,
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(userService.getUserById).mockResolvedValue(user as any);

      const result = await authService.validateUser(payload as any);

      expect(userService.getUserById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual(user);
    });
  });
});
