import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';
@Controller()
export class PaymentController {
  @MessagePattern(RMQ.payment.health)
  health() { return { service: 'payment-service', status: 'ok' }; }
}
