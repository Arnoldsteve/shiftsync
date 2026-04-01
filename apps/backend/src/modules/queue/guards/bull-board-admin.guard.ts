import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Admin Guard for BullBoard UI
 * Ensures only Admin users can access the job queue visualization dashboard
 * Requirements: 24.1 - Mount BullBoard UI at /admin/queues endpoint (Admin only)
 */
@Injectable()
export class BullBoardAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract JWT token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authentication token provided');
    }

    const token = authHeader.substring(7);

    try {
      // Verify and decode JWT token
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      // Check if user has Admin role
      if (payload.role !== Role.ADMIN) {
        throw new UnauthorizedException('Access denied. Admin role required.');
      }

      // Attach user to request for downstream use
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
