import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health.controller';

const url = process.env.RABBITMQ_URL ?? 'amqp://admin:1234@localhost:5672';
const client = (name: string, queue: string) => ({
  name,
  transport: Transport.RMQ,
  options: { urls: [url], queue, queueOptions: { durable: true } },
});

@Module({
  imports: [
    ClientsModule.register([
      client('IDENTITY_SERVICE', 'identity_queue'),
      client('CUSTOMER_SERVICE', 'customer_queue'),
      client('CATALOG_SERVICE', 'catalog_queue'),
      client('INVENTORY_SERVICE', 'inventory_queue'),
      client('ORDER_SERVICE', 'order_queue'),
      client('PAYMENT_SERVICE', 'payment_queue'),
      client('PROMOTION_SERVICE', 'promotion_queue'),
      client('NOTIFICATION_SERVICE', 'notification_queue'),
    ]),
  ],
  controllers: [HealthController],
})
export class AppModule {}
