export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  causationId?: string;
  payload: T;
}

export const EVENTS = {
  USER_REGISTERED: 'identity.user.registered',
  PASSWORD_RESET_REQUESTED: 'identity.password-reset.requested',
  PRODUCT_CREATED: 'catalog.product.created',
  PRODUCT_UPDATED: 'catalog.product.updated',
  PRODUCT_DELETED: 'catalog.product.deleted',
  ORDER_CREATED: 'order.created',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_CONFIRMED: 'order.confirmed',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RESERVATION_FAILED: 'inventory.reservation-failed',
  INVENTORY_RELEASED: 'inventory.released',
  INVENTORY_COMMITTED: 'inventory.committed',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PROMOTION_REDEEMED: 'promotion.redeemed',
  LOYALTY_CONSUMED: 'customer.loyalty.consumed',
} as const;
