import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

/**
 * Swagger documentation for login endpoint
 * Composed decorator pattern - keeps controller clean
 */
export function ApiLoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Authenticate user and get JWT token',
      description:
        'Login with email and password to receive a JWT token for authenticated requests',
    }),
    ApiBody({
      description: 'User credentials',
      schema: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      examples: {
        admin: {
          summary: 'Admin login',
          value: {
            email: 'admin@shiftsync.com',
            password: 'Admin123!@#',
          },
        },
        manager: {
          summary: 'Manager login',
          value: {
            email: 'manager@shiftsync.com',
            password: 'password123',
          },
        },
        staff: {
          summary: 'Staff login',
          value: {
            email: 'staff@shiftsync.com',
            password: 'password123',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
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
              role: { type: 'string', example: 'ADMIN', enum: ['ADMIN', 'MANAGER', 'STAFF'] },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Invalid credentials',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid credentials' },
        },
      },
    })
  );
}
