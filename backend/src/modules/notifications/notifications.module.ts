import { Module } from '@nestjs/common';
import { NotificationSenderFactory } from './notification.factory';
import { NotificationEventListener } from './notification.listener';

@Module({
  providers: [NotificationSenderFactory, NotificationEventListener],
  exports: [NotificationSenderFactory],
})
export class NotificationsModule {}
