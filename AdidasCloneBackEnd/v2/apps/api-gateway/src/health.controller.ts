import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { RMQ } from '@adidas/contracts';

@Controller('v2/health')
export class HealthController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identity: ClientProxy,
    @Inject('CUSTOMER_SERVICE') private readonly customer: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalog: ClientProxy,
    @Inject('INVENTORY_SERVICE') private readonly inventory: ClientProxy,
    @Inject('ORDER_SERVICE') private readonly order: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly payment: ClientProxy,
    @Inject('PROMOTION_SERVICE') private readonly promotion: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notification: ClientProxy,
  ) {}

  @Get()
  async health() {
    const services = [
      ['identity', this.identity, RMQ.identity.health],
      ['customer', this.customer, RMQ.customer.health],
      ['catalog', this.catalog, RMQ.catalog.health],
      ['inventory', this.inventory, RMQ.inventory.health],
      ['order', this.order, RMQ.order.health],
      ['payment', this.payment, RMQ.payment.health],
      ['promotion', this.promotion, RMQ.promotion.health],
      ['notification', this.notification, RMQ.notification.health],
    ] as const;

    const results = await Promise.all(services.map(async ([name, proxy, pattern]) => {
      try {
        const data = await lastValueFrom(proxy.send(pattern, {}).pipe(timeout(2000)));
        return { name, ok: true, data };
      } catch {
        return { name, ok: false };
      }
    }));

    return { ok: results.every((s) => s.ok), services: results };
  }
}
