import { Module, Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InventoryDatabase } from './database';
import { InventoryService } from './inventory.service';
import { InventoryRmqController } from './inventory.rmq.controller';

@Controller('health')
class InventoryHealthController {
  constructor(private readonly db: InventoryDatabase) {}
  @Get('live') live() { return {status:'ok'}; }
  @Get('ready') async ready() {
    try {
      await this.db.ready();
      return {status:'ok',info:{postgres:{status:'up'}}};
    } catch { throw new ServiceUnavailableException('inventory database not ready'); }
  }
}
@Module({
  providers: [InventoryDatabase, InventoryService],
  controllers: [InventoryHealthController,InventoryRmqController],
  exports: [InventoryDatabase, InventoryService]
})
export class InventoryModule {}
