import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';
@Controller()
export class PromotionController {
  @MessagePattern(RMQ.promotion.health)
  health() { return { service: 'promotion-service', status: 'ok' }; }
}
