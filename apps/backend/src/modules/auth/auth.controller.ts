import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginDto } from '@shiftsync/shared';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint - public
   * Requirements: 30.1, 30.2
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user and get JWT token',
    description: 'Login with email and password to receive a JWT token for authenticated requests',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials',
    examples: {
      example1: {
        summary: 'Admin login',
        value: {
          email: 'admin@shiftsync.com',
          password: 'password123',
        },
      },
      example2: {
        summary: 'Manager login',
        value: {
          email: 'manager@shiftsync.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - Returns JWT token and user info',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            email: { type: 'string', example: 'admin@shiftsync.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', example: 'ADMIN' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
      },
    },
  })
  async login(@Body() data: LoginDto) {
    return this.authService.authenticate(data);
  }
}
