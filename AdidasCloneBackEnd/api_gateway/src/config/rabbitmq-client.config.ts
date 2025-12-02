import { ClientProviderOptions, Transport } from '@nestjs/microservices';

export const USER_SERVICE: ClientProviderOptions = {
  name: 'USER_SERVICE',
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://admin:1234@rabbitmq:5672'],
    queue: 'user_queue',
    queueOptions: {
      durable: false,
    },
  },
};

export const PRODUCT_SERVICE: ClientProviderOptions = {
  name: 'PRODUCT_SERVICE',
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://admin:1234@rabbitmq:5672'],
    queue: 'product_queue',
    queueOptions: {
      durable: false,
    },
  },
};

export const ORDER_SERVICE: ClientProviderOptions = {
  name: 'ORDER_SERVICE',
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://admin:1234@rabbitmq:5672'],
    queue: 'order_queue',
    queueOptions: {
      durable: false,
    },
  },
};
