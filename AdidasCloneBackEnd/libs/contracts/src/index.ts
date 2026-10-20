/** Wire-only contracts. Do not import Prisma models, domain entities, or services. */
export const COMMANDS = {
  catalogCheckoutItemsGet: 'catalog.checkout-items.get.v1',
  customerShippingAddressGet: 'customer.shipping-address.get.v1',
  promotionHoldCreate: 'promotion.hold.create.v1',
  promotionHoldRelease: 'promotion.hold.release.v1',
  promotionHoldCommit: 'promotion.hold.commit.v1',
  customerLoyaltyHoldCreate: 'customer.loyalty-hold.create.v1',
  customerLoyaltyHoldRelease: 'customer.loyalty-hold.release.v1',
  customerLoyaltyHoldCommit: 'customer.loyalty-hold.commit.v1',
  inventoryReservationCreate: 'inventory.reservation.create.v1',
  inventoryReservationRelease: 'inventory.reservation.release.v1',
  inventoryReservationCommit: 'inventory.reservation.commit.v1',
  orderPaymentQuoteGet: 'order.payment-quote.get.v1',
  paymentIntentCreate: 'payment.intent.create.v1',
  paymentIntentCancelOrStatus: 'payment.intent.cancel-or-status.v1'
} as const;

export const EVENTS = {
  paymentSucceeded: 'payment.succeeded.v1',
  paymentAttemptFailed: 'payment.attempt-failed.v1',
  paymentCanceled: 'payment.canceled.v1',
  orderConfirmed: 'order.confirmed.v1',
  orderCancelled: 'order.cancelled.v1',
  orderExpired: 'order.expired.v1',
  catalogProductCreated: 'catalog.product.created.v1',
  catalogProductUpdated: 'catalog.product.updated.v1',
  catalogProductDeleted: 'catalog.product.deleted.v1'
} as const;

export const COMMAND_QUEUES = {
  identity: 'identity.commands.q',
  customer: 'customer.commands.q',
  catalog: 'catalog.commands.q',
  inventory: 'inventory.commands.q',
  order: 'order.commands.q',
  payment: 'payment.commands.q',
  promotion: 'promotion.commands.q',
  notification: 'notification.commands.q'
} as const;
export const EVENTS_EXCHANGE = 'commerce.events';
export const CONSUMER_QUEUES = {
  orderPayment: 'order.payment-events.q',
  notificationOrder: 'notification.order-events.q'
} as const;

/** Technical actor metadata only; authorization stays within each domain. */
export interface MessageActor {
  kind: 'customer' | 'admin' | 'system' | 'guest';
  subject_id?: string;
}

export interface MessageEnvelope<TPayload> {
  message_id: string;
  correlation_id: string;
  causation_id?: string;
  occurred_at: string;
  contract_version: 1;
  actor: MessageActor;
  payload: TPayload;
}
export type WireErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR';

export interface WireError {
  code: WireErrorCode;
  message: string;
  correlation_id: string;
  details?: Record<string, unknown>;
}
