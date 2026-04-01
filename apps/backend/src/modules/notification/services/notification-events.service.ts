import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationCrudService } from './notification-crud.service';
import { NotificationTypes } from '../interfaces/notification-types.interface';

@Injectable()
export class NotificationEventsService {
  constructor(private readonly notificationCrudService: NotificationCrudService) {}

  /**
   * Notify staff user when a shift is assigned to them
   * Requirements: 38.4
   */
  async notifyShiftAssignment(
    staffId: string,
    shiftId: string,
    shiftDetails: { startTime: Date; endTime: Date; locationName: string }
  ): Promise<Notification> {
    const title = 'New Shift Assigned';
    const message = `You have been assigned to a shift at ${shiftDetails.locationName} from ${shiftDetails.startTime.toLocaleString()} to ${shiftDetails.endTime.toLocaleString()}`;

    return this.notificationCrudService.createNotification(
      staffId,
      NotificationTypes.SHIFT_ASSIGNED,
      title,
      message,
      {
        shiftId,
        ...shiftDetails,
      }
    );
  }

  /**
   * Notify staff user when their shift is modified or deleted
   * Requirements: 38.5
   */
  async notifyShiftModification(
    staffId: string,
    shiftId: string,
    changeType: 'modified' | 'deleted',
    shiftDetails?: { startTime?: Date; endTime?: Date; locationName?: string }
  ): Promise<Notification> {
    const type =
      changeType === 'deleted' ? NotificationTypes.SHIFT_DELETED : NotificationTypes.SHIFT_MODIFIED;

    const title = changeType === 'deleted' ? 'Shift Deleted' : 'Shift Modified';

    let message: string;
    if (changeType === 'deleted') {
      message = shiftDetails?.locationName
        ? `Your shift at ${shiftDetails.locationName} has been deleted`
        : 'One of your shifts has been deleted';
    } else {
      message = shiftDetails?.locationName
        ? `Your shift at ${shiftDetails.locationName} has been modified`
        : 'One of your shifts has been modified';
    }

    return this.notificationCrudService.createNotification(staffId, type, title, message, {
      shiftId,
      changeType,
      ...shiftDetails,
    });
  }

  /**
   * Notify relevant users about swap request actions
   * Requirements: 38.6
   */
  async notifySwapRequest(
    requestorId: string,
    targetId: string,
    managerId: string,
    swapId: string,
    action: 'created' | 'approved' | 'rejected'
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    if (action === 'created') {
      // Notify target staff
      notifications.push(
        await this.notificationCrudService.createNotification(
          targetId,
          NotificationTypes.SWAP_REQUEST_CREATED,
          'New Swap Request',
          'You have received a new shift swap request',
          { swapId, requestorId, action }
        )
      );

      // Notify manager
      notifications.push(
        await this.notificationCrudService.createNotification(
          managerId,
          NotificationTypes.SWAP_REQUEST_CREATED,
          'New Swap Request',
          'A new shift swap request has been created',
          { swapId, requestorId, targetId, action }
        )
      );
    } else if (action === 'approved') {
      // Notify requestor
      notifications.push(
        await this.notificationCrudService.createNotification(
          requestorId,
          NotificationTypes.SWAP_REQUEST_APPROVED,
          'Swap Request Approved',
          'Your shift swap request has been approved',
          { swapId, action }
        )
      );

      // Notify target staff
      notifications.push(
        await this.notificationCrudService.createNotification(
          targetId,
          NotificationTypes.SWAP_REQUEST_APPROVED,
          'Swap Request Approved',
          'The shift swap request has been approved',
          { swapId, requestorId, action }
        )
      );

      // Notify manager
      notifications.push(
        await this.notificationCrudService.createNotification(
          managerId,
          NotificationTypes.SWAP_REQUEST_APPROVED,
          'Swap Request Approved',
          'A shift swap request has been approved',
          { swapId, requestorId, targetId, action }
        )
      );
    } else if (action === 'rejected') {
      // Notify requestor
      notifications.push(
        await this.notificationCrudService.createNotification(
          requestorId,
          NotificationTypes.SWAP_REQUEST_REJECTED,
          'Swap Request Rejected',
          'Your shift swap request has been rejected',
          { swapId, action }
        )
      );

      // Notify target staff
      notifications.push(
        await this.notificationCrudService.createNotification(
          targetId,
          NotificationTypes.SWAP_REQUEST_REJECTED,
          'Swap Request Rejected',
          'The shift swap request has been rejected',
          { swapId, requestorId, action }
        )
      );

      // Notify manager
      notifications.push(
        await this.notificationCrudService.createNotification(
          managerId,
          NotificationTypes.SWAP_REQUEST_REJECTED,
          'Swap Request Rejected',
          'A shift swap request has been rejected',
          { swapId, requestorId, targetId, action }
        )
      );
    }

    return notifications;
  }

  /**
   * Notify all staff users when a schedule is published
   * Requirements: 38.7
   */
  async notifySchedulePublished(
    staffIds: string[],
    weekStart: Date,
    locationName: string
  ): Promise<Notification[]> {
    const title = 'Schedule Published';
    const message = `The schedule for ${locationName} starting ${weekStart.toLocaleDateString()} has been published`;

    const notifications: Notification[] = [];

    for (const staffId of staffIds) {
      notifications.push(
        await this.notificationCrudService.createNotification(
          staffId,
          NotificationTypes.SCHEDULE_PUBLISHED,
          title,
          message,
          { weekStart, locationName }
        )
      );
    }

    return notifications;
  }

  /**
   * Notify staff and manager when approaching overtime (35+ hours)
   * Requirements: 38.8
   */
  async notifyOvertimeApproaching(
    staffId: string,
    managerId: string,
    currentHours: number,
    weekStart: Date
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    // Notify staff user
    notifications.push(
      await this.notificationCrudService.createNotification(
        staffId,
        NotificationTypes.OVERTIME_APPROACHING,
        'Overtime Approaching',
        `You have ${currentHours} hours scheduled for the week of ${weekStart.toLocaleDateString()}, approaching the 40-hour overtime limit`,
        { currentHours, weekStart, limit: 40 }
      )
    );

    // Notify manager
    notifications.push(
      await this.notificationCrudService.createNotification(
        managerId,
        NotificationTypes.OVERTIME_APPROACHING,
        'Staff Overtime Approaching',
        `A staff member has ${currentHours} hours scheduled for the week of ${weekStart.toLocaleDateString()}, approaching the 40-hour overtime limit`,
        { staffId, currentHours, weekStart, limit: 40 }
      )
    );

    return notifications;
  }

  /**
   * Notify managers when a staff user modifies their availability
   * Requirements: 38.9
   */
  async notifyAvailabilityChange(
    staffId: string,
    managerIds: string[],
    changeType: 'added' | 'removed' | 'modified'
  ): Promise<Notification[]> {
    const title = 'Staff Availability Changed';
    const message = `A staff member has ${changeType} their availability`;

    const notifications: Notification[] = [];

    for (const managerId of managerIds) {
      notifications.push(
        await this.notificationCrudService.createNotification(
          managerId,
          NotificationTypes.AVAILABILITY_CHANGED,
          title,
          message,
          { staffId, changeType }
        )
      );
    }

    return notifications;
  }
}
