import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

/**
 * Documentation for Create User endpoint
 */
export function ApiCreateUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a new user',
      description: 'Admin creates a new user with role, skills, and location certifications',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'User created successfully',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden - Admin only',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Insufficient permissions' },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'User already exists',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 409 },
          message: { type: 'string', example: 'User with this email already exists' },
        },
      },
    })
  );
}

/**
 * Documentation for Assign Role endpoint
 */
export function ApiAssignRoleDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Assign role to user',
      description: 'Admin assigns or updates a user role (ADMIN, MANAGER, STAFF)',
    }),
    ApiParam({
      name: 'id',
      description: 'User ID',
      example: 'clx-user-123',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Role assigned successfully',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden - Admin only',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
    })
  );
}

/**
 * Documentation for Add Skill endpoint
 */
export function ApiAddSkillDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Add skill to user',
      description:
        'Admin or Manager adds a skill to a user. Manager can only add skills to staff at their authorized locations.',
    }),
    ApiParam({
      name: 'id',
      description: 'User ID',
      example: 'clx-user-123',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Skill added successfully',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Insufficient permissions or location authorization failure',
      schema: {
        examples: {
          notAuthorized: {
            summary: 'Manager Not Authorized',
            value: {
              statusCode: 403,
              message: 'You are not authorized to manage staff at this location',
            },
          },
          insufficientPermissions: {
            summary: 'Insufficient Permissions',
            value: {
              statusCode: 403,
              message: 'Insufficient permissions',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User or skill not found',
    })
  );
}

/**
 * Documentation for Add Certification endpoint
 */
export function ApiAddCertificationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Add location certification to user',
      description:
        'Admin or Manager certifies a user for a location. Manager can only certify staff for their authorized locations.',
    }),
    ApiParam({
      name: 'id',
      description: 'User ID',
      example: 'clx-user-123',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Certification added successfully',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Insufficient permissions or location authorization failure',
      schema: {
        examples: {
          notAuthorized: {
            summary: 'Manager Not Authorized',
            value: {
              statusCode: 403,
              message: 'You are not authorized to certify staff for this location',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User or location not found',
    })
  );
}

/**
 * Documentation for Get User By ID endpoint
 */
export function ApiGetUserByIdDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get user by ID',
      description: 'Retrieve user details including skills, certifications, and availability',
    }),
    ApiParam({
      name: 'id',
      description: 'User ID',
      example: 'clx-user-123',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'User found',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
    })
  );
}

/**
 * Documentation for Get Current User endpoint
 */
export function ApiGetCurrentUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get current user profile',
      description: 'Retrieve authenticated user profile',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Current user profile',
    })
  );
}

/**
 * Documentation for Get Users By Location endpoint
 */
export function ApiGetUsersByLocationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get users by location',
      description: 'Retrieve all users certified for a specific location',
    }),
    ApiParam({
      name: 'locationId',
      description: 'Location ID',
      example: 'clx-location-1',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Users found',
    })
  );
}
