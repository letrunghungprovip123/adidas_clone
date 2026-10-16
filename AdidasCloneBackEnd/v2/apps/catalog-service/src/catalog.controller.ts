import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';
@Controller()
export class CatalogController {
  @MessagePattern(RMQ.catalog.health)
  health() { return { service: 'catalog-service', status: 'ok' }; }
}
