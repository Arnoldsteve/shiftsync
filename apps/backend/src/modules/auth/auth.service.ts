import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '@shiftsync/shared';
import { UserService } from '../user/user.service';
import { JwtPayload, AuthResponse } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Authenticate user and return JWT token
   * Requirements: 30.1, 30.2
   */
  async authenticate(data: LoginDto): Promise<AuthResponse> {
    // Find user by email
    const user = await this.userService.getUserByEmail(data.email).catch(() => {
      throw new UnauthorizedException('Invalid credentials');
    });

    // Verify password
    const isPasswordValid = await this.userService.verifyPassword(user.passwordHash, data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get manager location IDs if user is a manager
    let managerLocationIds: string[] | undefined;
    if (user.role === 'MANAGER') {
      managerLocationIds = await this.userService.getAuthorizedLocationIds(user.id);
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        ...(managerLocationIds && { managerLocationIds }),
      },
    };
  }

  /**
   * Validate JWT token and return user
   * Requirements: 30.3, 30.4
   */
  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.userService.getUserById(payload.sub);
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Validate user from JWT payload (used by Passport strategy)
   * Requirements: 30.4
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.userService.getUserById(payload.sub);

    // Get manager location IDs if user is a manager
    let managedLocationIds: string[] | undefined;
    if (user.role === 'MANAGER') {
      managedLocationIds = await this.userService.getAuthorizedLocationIds(user.id);
    }

    return {
      ...user,
      ...(managedLocationIds && { managedLocationIds }),
    };
  }
}
