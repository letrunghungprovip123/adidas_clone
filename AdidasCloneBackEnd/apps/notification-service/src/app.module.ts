import { Module } from '@nestjs/common';
import { HealthModule } from '../../../libs/health/src/health.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: process.env.V2_NOTIFICATION_ENABLED === 'true'
    ? [NotificationModule]
    : [HealthModule]
})
export class AppModule {}
