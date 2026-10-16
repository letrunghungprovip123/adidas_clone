import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';

@Controller()
export class IdentityController {
  @MessagePattern(RMQ.identity.health)
  health() { return { service: 'identity-service', status: 'ok' }; }
}
