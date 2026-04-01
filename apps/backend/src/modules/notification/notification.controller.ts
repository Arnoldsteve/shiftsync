import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get notifications for the current user
   * Requirements: 38.1, 38.3
   */
  @Get()
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('includeRead') includeRead?: string
  ) {
    const includeReadBool = includeRead === 'true';
    const notifications = await this.notificationService.getNotifications(userId, includeReadBool);

    return {
      data: notifications,
      total: notifications.length,
    };
  }

  /**
   * Mark a notification as read
   * Requirements: 38.1
   */
  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const notification = await this.notificationService.markAsRead(id, userId);

    return {
      data: notification,
      message: 'Notification marked as read',
    };
  }

  /**
   * Mark all notifications as read
   * Requirements: 38.1
   */
  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.markAllAsRead(userId);

    return {
      count,
      message: `${count} notification(s) marked as read`,
    };
  }

  /**
   * Get notification preferences for the current user
   * Requirements: 38.2
   */
  @Get('preferences')
  async getPreferences(@CurrentUser('id') userId: string) {
    const preferences = await this.notificationService.getNotificationPreferences(userId);

    return {
      data: preferences,
    };
  }

  /**
   * Update notification preferences for the current user
   * Requirements: 38.2
   */
  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  async setPreferences(
    @CurrentUser('id') userId: string,
    @Body() body: { inAppEnabled: boolean; emailEnabled: boolean }
  ) {
    const preferences = await this.notificationService.setNotificationPreferences(
      userId,
      body.inAppEnabled,
      body.emailEnabled
    );

    return {
      data: preferences,
      message: 'Notification preferences updated',
    };
  }
}
