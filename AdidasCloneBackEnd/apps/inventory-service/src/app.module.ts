import { Module } from '@nestjs/common';
import { HealthModule } from '../../../libs/health/src/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { ExpiryWorker } from './inventory/workers';
import { InventoryDatabase } from './inventory/database';
import { InventoryService } from './inventory/inventory.service';

const active=process.env.V2_INVENTORY_ENABLED==='true';
@Module({
  imports:active?[InventoryModule]:[HealthModule],
  providers:active?[{
    provide:ExpiryWorker,
    useFactory:(svc:InventoryService)=>{const worker=new ExpiryWorker(svc);worker.onModuleInit();return worker;},
    inject:[InventoryService]
  }]:[]
})
export class AppModule {}
