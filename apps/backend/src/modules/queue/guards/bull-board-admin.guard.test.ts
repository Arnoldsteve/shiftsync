import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BullBoardAdminGuard } from './bull-board-admin.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('BullBoardAdminGuard', () => {
  let guard: BullBoardAdminGuard;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: vi.fn(),
    } as any;

    configService = {
      get: vi.fn().mockReturnValue('test-secret'),
    } as any;

    guard = new BullBoardAdminGuard(jwtService, configService);

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as any;
  });

  describe('canActivate', () => {
    it('should allow access for Admin users with valid token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      const mockPayload = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest['user']).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
    });

    it('should deny access for Manager users', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer manager-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      const mockPayload = {
        userId: 'user-456',
        email: 'manager@example.com',
        role: Role.MANAGER,
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should deny access for Staff users', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer staff-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      const mockPayload = {
        userId: 'user-789',
        email: 'staff@example.com',
        role: Role.STAFF,
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should deny access when no authorization header is present', async () => {
      const mockRequest = {
        headers: {},
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'No authentication token provided'
      );
    });

    it('should deny access when authorization header does not start with Bearer', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Basic some-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'No authentication token provided'
      );
    });

    it('should deny access when token is invalid', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid or expired authentication token'
      );
    });

    it('should deny access when token is expired', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer expired-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('Token expired'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid or expired authentication token'
      );
    });

    it('should use JWT secret from config service', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      const customSecret = 'custom-jwt-secret';
      vi.mocked(configService.get).mockReturnValue(customSecret);

      const mockPayload = {
        userId: 'user-123',
        role: Role.ADMIN,
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      await guard.canActivate(mockContext);

      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: customSecret,
      });
    });

    it('should attach user payload to request', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      const mockPayload = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      await guard.canActivate(mockContext);

      expect(mockRequest['user']).toEqual(mockPayload);
    });
  });

  describe('edge cases', () => {
    it('should handle empty Bearer token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer ',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle malformed authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle case-sensitive Bearer prefix', async () => {
      const mockRequest = {
        headers: {
          authorization: 'bearer valid-token',
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'No authentication token provided'
      );
    });
  });
});
