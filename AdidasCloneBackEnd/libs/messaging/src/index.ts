import { COMMAND_QUEUES, CONSUMER_QUEUES, EVENTS_EXCHANGE } from '../../contracts/src';

export const RABBITMQ_TOPOLOGY = Object.freeze({
  commands: COMMAND_QUEUES,
  eventsExchange: { name: EVENTS_EXCHANGE, type: 'topic', durable: true },
  consumers: CONSUMER_QUEUES,
  persistent: true,
  noAck: false,
  prefetch: 10
});

/** This is a topology contract, not a live broker transport. No queues are declared in Phase 1. */
export interface PublishContext {
  correlation_id: string;
  causation_id?: string;
  actor_id?: string;
}
