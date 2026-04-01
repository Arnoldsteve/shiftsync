import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationCrudService } from './services/notification-crud.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationEventsService } from './services/notification-events.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationCrudService,
    NotificationPreferencesService,
    NotificationEventsService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
