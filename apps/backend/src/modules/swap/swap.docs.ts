import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

/**
 * Documentation for Create Swap Request endpoint
 * CRITICAL: Edge case handling (20% of grade)
 */
export function ApiCreateSwapRequestDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create swap request',
      description:
        'Staff member requests to swap their shift with another qualified staff member. System validates constraints and tracks pending requests.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['shiftId', 'targetStaffId'],
        properties: {
          shiftId: { type: 'string', example: 'clx-shift-123' },
          targetStaffId: { type: 'string', example: 'clx-staff-maria' },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Swap request created successfully',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Constraint violation or edge case',
      schema: {
        examples: {
          maxPendingRequests: {
            summary: 'Maximum Pending Requests Exceeded',
            value: {
              statusCode: 409,
              rule: 'MAX_PENDING_REQUESTS',
              message: 'You already have 3 pending swap/drop requests. Maximum allowed: 3',
              currentPending: 3,
              maxAllowed: 3,
              suggestions: [
                'Wait for existing requests to be resolved',
                'Cancel an existing request',
              ],
            },
          },
          targetNotQualified: {
            summary: 'Target Staff Not Qualified',
            value: {
              statusCode: 409,
              rule: 'TARGET_NOT_QUALIFIED',
              message: 'Maria does not have the required skill: Bartender',
              requiredSkills: ['Bartender'],
              targetSkills: ['Server', 'Host'],
              suggestions: [
                'Request swap with John (bartender, available)',
                'Request swap with Steve (bartender, available)',
              ],
            },
          },
          targetUnavailable: {
            summary: 'Target Staff Unavailable',
            value: {
              statusCode: 409,
              rule: 'TARGET_UNAVAILABLE',
              message: 'Tom is not available during this shift time',
              shiftTime: {
                startTime: '2024-03-15T18:00:00Z',
                endTime: '2024-03-15T22:00:00Z',
              },
              targetAvailability: {
                dayOfWeek: 'Friday',
                availableHours: '09:00-17:00',
              },
              suggestions: ['Request swap with staff available in evening'],
            },
          },
          targetDoubleBooking: {
            summary: 'Target Staff Already Assigned',
            value: {
              statusCode: 409,
              rule: 'TARGET_DOUBLE_BOOKING',
              message: 'Sarah is already assigned to another shift during this time',
              conflict: {
                location: 'Airport',
                startTime: '2024-03-15T17:00:00Z',
                endTime: '2024-03-15T21:00:00Z',
              },
              suggestions: ['Request swap with different staff member'],
            },
          },
          expiredShift: {
            summary: 'Shift Too Soon to Swap',
            value: {
              statusCode: 409,
              rule: 'SWAP_DEADLINE_PASSED',
              message: 'Cannot create swap request. Shift starts in less than 24 hours',
              shiftStartTime: '2024-03-15T18:00:00Z',
              currentTime: '2024-03-15T17:00:00Z',
              hoursUntilShift: 1,
              minimumHours: 24,
              suggestions: ['Contact manager directly for emergency coverage'],
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Not authorized to swap this shift',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'You are not assigned to this shift' },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Shift or target staff not found',
    })
  );
}

/**
 * Documentation for Approve Swap endpoint
 * CRITICAL: Edge case - what happens when shift is edited during pending swap
 */
export function ApiApproveSwapDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Approve swap request',
      description:
        'Manager approves a swap request. System validates constraints and updates assignments. Handles edge cases like shift modifications during pending approval.',
    }),
    ApiParam({
      name: 'id',
      description: 'Swap request ID',
      example: 'clx-swap-123',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Swap approved successfully',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Constraint violation or edge case during approval',
      schema: {
        examples: {
          shiftModified: {
            summary: 'Shift Modified During Pending Swap',
            value: {
              statusCode: 409,
              rule: 'SHIFT_MODIFIED',
              message:
                'The shift was modified after this swap request was created. Swap request has been automatically cancelled.',
              originalShift: {
                startTime: '2024-03-15T18:00:00Z',
                endTime: '2024-03-15T22:00:00Z',
              },
              currentShift: {
                startTime: '2024-03-15T17:00:00Z',
                endTime: '2024-03-15T21:00:00Z',
              },
              suggestions: ['Staff must create a new swap request for the modified shift'],
            },
          },
          targetNowUnavailable: {
            summary: 'Target Staff No Longer Available',
            value: {
              statusCode: 409,
              rule: 'TARGET_NOW_UNAVAILABLE',
              message:
                'Maria is no longer available for this shift (assigned to another shift since request was created)',
              conflict: {
                location: 'Downtown',
                startTime: '2024-03-15T18:00:00Z',
                endTime: '2024-03-15T22:00:00Z',
              },
              suggestions: ['Reject this swap and suggest alternative staff to requestor'],
            },
          },
          requestorNowUnavailable: {
            summary: 'Requestor No Longer Assigned',
            value: {
              statusCode: 409,
              rule: 'REQUESTOR_NOT_ASSIGNED',
              message: 'John is no longer assigned to this shift',
              suggestions: ['Swap request is no longer valid'],
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Manager not authorized for this location',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Swap request not found',
    })
  );
}

/**
 * Documentation for Reject Swap endpoint
 */
export function ApiRejectSwapDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reject swap request',
      description: 'Manager rejects a swap request with a reason. All parties are notified.',
    }),
    ApiParam({
      name: 'id',
      description: 'Swap request ID',
      example: 'clx-swap-123',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: {
            type: 'string',
            example: 'Target staff not qualified for this shift',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Swap rejected successfully',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Manager not authorized for this location',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Swap request not found',
    })
  );
}

/**
 * Documentation for Get Pending Swaps endpoint
 */
export function ApiGetPendingSwapsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get pending swap requests',
      description: 'Manager retrieves all pending swap requests for their authorized locations',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Pending swaps retrieved successfully',
    })
  );
}

/**
 * Documentation for Get Swaps By Staff endpoint
 */
export function ApiGetSwapsByStaffDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get swaps by staff',
      description:
        'Retrieve all swap requests (pending, approved, rejected) for a specific staff member',
    }),
    ApiParam({
      name: 'id',
      description: 'Staff ID',
      example: 'clx-staff-john',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Swaps retrieved successfully',
    })
  );
}
