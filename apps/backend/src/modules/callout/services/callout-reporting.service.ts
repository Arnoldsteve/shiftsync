import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { CalloutRepository } from '../repositories/callout.repository';
import { AuditService } from '../../audit/audit.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { Callout } from '@prisma/client';

@Injectable()
export class CalloutReportingService {
  private readonly logger = new Logger(CalloutReportingService.name);

  constructor(
    private readonly calloutRepository: CalloutRepository,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  /**
   * Report a callout for a shift
   * Requirements: 22.1, 22.2, 22.3, 22.4
   */
  async reportCallout(shiftId: string, staffId: string, reason?: string): Promise<Callout> {
    try {
      if (!shiftId) {
        throw new BadRequestException('Shift ID is required for callout reporting');
      }

      const shift = await this.calloutRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Create callout record
      const callout = await this.calloutRepository.createCallout({
        shiftId,
        staffId,
        reason,
      });

      // Mark shift as uncovered
      await this.calloutRepository.markShiftUncovered(shiftId);

      // Log callout in audit trail
      await this.auditService.logShiftChange('UPDATE', shiftId, staffId, {
        previousState: {
          status: 'covered',
        },
        newState: {
          status: 'uncovered',
          calloutId: callout.id,
          reason,
        },
      });

      // Emit real-time event
      this.realtimeGateway.emitCalloutReported(shift.locationId, {
        calloutId: callout.id,
        shiftId,
        staffId,
        reason,
        shift: {
          id: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          locationId: shift.locationId,
        },
      });

      // Notify managers authorized for this location
      const managers = await this.calloutRepository.findManagersForLocation(shift.locationId);
      this.logger.log(`Notifying ${managers.length} managers about callout for shift ${shiftId}`);

      // TODO: Implement actual notification mechanism (email, SMS, push notification)
      for (const manager of managers) {
        this.logger.log(`Would notify manager ${manager.email} about callout for shift ${shiftId}`);
      }

      return callout;
    } catch (error) {
      this.logger.error(`Error reporting callout:`, error);
      throw error;
    }
  }
}
