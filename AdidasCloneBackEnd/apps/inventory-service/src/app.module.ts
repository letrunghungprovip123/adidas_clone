import { Module } from '@nestjs/common';
import { HealthModule } from '../../../libs/health/src/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { ExpiryWorker } from './inventory/workers';

const active=process.env.V2_INVENTORY_ENABLED==='true';
@Module({
  imports:active?[InventoryModule]:[HealthModule],
  providers:active?[ExpiryWorker]:[]
})
export class AppModule {}
