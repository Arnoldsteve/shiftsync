import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SwapService } from './swap.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { Action } from '../user/casl/types';
import {
  ApiCreateSwapRequestDocs,
  ApiApproveSwapDocs,
  ApiRejectSwapDocs,
  ApiGetPendingSwapsDocs,
  ApiGetSwapsByStaffDocs,
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
}
