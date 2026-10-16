import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';
@Controller()
export class CustomerController {
  @MessagePattern(RMQ.customer.health)
  health() { return { service: 'customer-service', status: 'ok' }; }
}
