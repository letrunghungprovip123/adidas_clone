import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';
@Controller()
export class OrderController {
  @MessagePattern(RMQ.order.health)
  health() { return { service: 'order-service', status: 'ok' }; }
}
