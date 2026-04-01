import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SwapService } from './swap.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { Action } from '../user/casl/types';
import { CreateDropRequestDto } from '@shiftsync/shared';
import {
  ApiCreateSwapRequestDocs,
  ApiApproveSwapDocs,
  ApiRejectSwapDocs,
  ApiGetPendingSwapsDocs,
  ApiGetSwapsByStaffDocs,
  ApiCreateDropRequestDocs,
  ApiGetDropRequestsByStaffDocs,
  ApiGetPendingRequestCountDocs,
} from './swap.docs';

@ApiTags('Swaps')
@ApiBearerAuth()
@Controller('swaps')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  /**
   * Create swap request - Staff
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'SwapRequest'))
  @ApiCreateSwapRequestDocs()
  async createSwapRequest(
    @Body() data: { shiftId: string; targetStaffId: string },
    @CurrentUser('id') requestorId: string
  ) {
    return this.swapService.createSwapRequest(data.shiftId, requestorId, data.targetStaffId);
  }

  /**
   * Get pending swaps - Manager
   * Requirements: 8.1
   */
  @Get('pending')
  @CheckPolicies((ability) => ability.can(Action.Read, 'SwapRequest'))
  @ApiGetPendingSwapsDocs()
  async getPendingSwaps() {
    return this.swapService.getPendingSwaps();
  }

  /**
   * Get drop requests by staff - Staff
   * Requirements: 33.1
   */
  @Get('staff/:id/drops')
  @CheckPolicies((ability) => ability.can(Action.Read, 'DropRequest'))
  @ApiGetDropRequestsByStaffDocs()
  async getDropRequestsByStaff(@Param('id') staffId: string) {
    return this.swapService.getDropRequestsByStaff(staffId);
  }

  /**
   * Get pending request count - Staff
   * Requirements: 35.1
   */
  @Get('staff/:id/pending-count')
  @CheckPolicies((ability) => ability.can(Action.Read, 'DropRequest'))
  @ApiGetPendingRequestCountDocs()
  async getPendingRequestCount(@Param('id') staffId: string) {
    const count = await this.swapService.getPendingRequestCount(staffId);
    return { count };
  }

  /**
   * Get swaps by staff - Staff
   * Requirements: 8.1
   */
  @Get('staff/:id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'SwapRequest'))
  @ApiGetSwapsByStaffDocs()
  async getSwapsByStaff(@Param('id') staffId: string) {
    return this.swapService.getSwapsByStaff(staffId);
  }

  /**
   * Approve swap - Manager
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  @Put(':id/approve')
  @CheckPolicies((ability) => ability.can(Action.Update, 'SwapRequest'))
  @ApiApproveSwapDocs()
  async approveSwap(@Param('id') swapRequestId: string, @CurrentUser('id') approverId: string) {
    return this.swapService.approveSwap(swapRequestId, approverId);
  }

  /**
   * Reject swap - Manager
   * Requirements: 8.5
   */
  @Put(':id/reject')
  @CheckPolicies((ability) => ability.can(Action.Update, 'SwapRequest'))
  @ApiRejectSwapDocs()
  async rejectSwap(
    @Param('id') swapRequestId: string,
    @Body() data: { reason: string },
    @CurrentUser('id') rejectedBy: string
  ) {
    return this.swapService.rejectSwap(swapRequestId, rejectedBy, data.reason);
  }

  /**
   * Cancel swap request - Staff (requestor only)
   * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
   */
  @Put(':id/cancel')
  @CheckPolicies((ability) => ability.can(Action.Update, 'SwapRequest'))
  async cancelSwapRequest(
    @Param('id') swapRequestId: string,
    @CurrentUser('id') requestorId: string
  ) {
    return this.swapService.cancelSwapRequest(swapRequestId, requestorId);
  }

  /**
   * Create drop request - Staff
   * Requirements: 33.1, 35.1, 37.1
   */
  @Post('drops')
  @CheckPolicies((ability) => ability.can(Action.Create, 'DropRequest'))
  @ApiCreateDropRequestDocs()
  async createDropRequest(
    @Body() data: CreateDropRequestDto,
    @CurrentUser('id') requestorId: string
  ) {
    return this.swapService.createDropRequest(data.shiftId, requestorId, data.reason);
  }

  /**
   * Cancel drop request - Staff (requestor only)
   * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
   */
  @Put('drops/:id/cancel')
  @CheckPolicies((ability) => ability.can(Action.Update, 'DropRequest'))
  async cancelDropRequest(
    @Param('id') dropRequestId: string,
    @CurrentUser('id') requestorId: string
  ) {
    return this.swapService.cancelDropRequest(dropRequestId, requestorId);
  }

  /**
   * Accept swap request - Staff (target only)
   * Requirements: 7.6
   */
  @Put(':id/accept')
  @CheckPolicies((ability) => ability.can(Action.Update, 'SwapRequest'))
  async acceptSwapRequest(
    @Param('id') swapRequestId: string,
    @CurrentUser('id') targetStaffId: string
  ) {
    return this.swapService.acceptSwapRequest(swapRequestId, targetStaffId);
  }

  /**
   * Decline swap request - Staff (target only)
   * Requirements: 7.6
   */
  @Put(':id/decline')
  @CheckPolicies((ability) => ability.can(Action.Update, 'SwapRequest'))
  async declineSwapRequest(
    @Param('id') swapRequestId: string,
    @CurrentUser('id') targetStaffId: string
  ) {
    return this.swapService.declineSwapRequest(swapRequestId, targetStaffId);
  }
}
