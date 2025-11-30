import { ClientProviderOptions, Transport } from '@nestjs/microservices';

const createRMQService = (
  name: string,
  queue: string,
): ClientProviderOptions => ({
  name,
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://admin:1234@localhost:5672'],
    queue,
    queueOptions: {
      durable: false,
    },
  },
});

export const USER_SERVICE = createRMQService('USER_SERVICE', 'user_queue');
export const PRODUCT_SERVICE = createRMQService('PRODUCT_SERVICE', 'product_queue');
