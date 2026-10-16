import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';
@Controller()
export class NotificationController {
  @MessagePattern(RMQ.notification.health)
  health() { return { service: 'notification-service', status: 'ok' }; }
}
