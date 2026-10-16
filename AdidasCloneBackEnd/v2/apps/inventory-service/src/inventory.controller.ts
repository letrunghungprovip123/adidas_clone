import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RMQ } from '@adidas/contracts';
@Controller()
export class InventoryController {
  @MessagePattern(RMQ.inventory.health)
  health() { return { service: 'inventory-service', status: 'ok' }; }
}
