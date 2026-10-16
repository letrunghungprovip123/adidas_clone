# Adidas Clone Backend V2 Architecture

## Goal

Refactor the existing 3-service backend into domain-oriented services without rewriting the whole product in one step. RabbitMQ remains the broker. The API Gateway remains the only public backend entry point.

## Target services

1. **identity-service** — credentials, login, JWT, social login, role/permission, password reset.
2. **customer-service** — customer profile, addresses, wishlist, loyalty ledger.
3. **catalog-service** — products, categories, variant metadata, images, reviews and Elasticsearch read model.
4. **inventory-service** — stock, reservations, release/commit, stock movement history.
5. **order-service** — order aggregate, order-item snapshots, shipping snapshot and order lifecycle.
6. **payment-service** — Stripe intents, webhooks, payment/refund lifecycle.
7. **promotion-service** — discount rules, coupon validation, redemption limits and redemption ledger.
8. **notification-service** — email/SMS/push side effects from domain events.

`search-service` is intentionally not extracted yet. Elasticsearch stays behind catalog-service until search becomes independently scalable.

## Ownership rules

- A service may only write its own database.
- Cross-service database foreign keys are forbidden. Keep external IDs such as `user_id`, `variant_id`, `order_id` as plain values.
- API Gateway does authentication/routing only; business state must live in domain services.
- Browser-provided price/discount/total values are never trusted.
- Async side effects use domain events with correlation and idempotency IDs.

## Migration from existing services

### Existing user_service

Move to identity-service:
- `auth/*`
- password hashing
- JWT generation
- Firebase social token verification
- OTP/reset token lifecycle
- admin role / account status

Move to customer-service:
- `user/*` profile fields except credentials
- `addresses/*`
- `wishlists/*`
- `loyalty_point/*`

### Existing product_service

Move to catalog-service:
- `products/*` except stock mutation
- `categories/*`
- `reviews/*`
- Cloudinary integration
- AI product suggestion
- Elasticsearch indexing/search for now

Move to inventory-service:
- `product_variants.stock`
- stock validation
- stock reservation
- stock release/commit
- stock movement/audit

Catalog keeps variant identity/metadata (`sku`, `size`, `color`). Inventory owns quantity.

### Existing order_service

Keep in order-service:
- order aggregate
- order item snapshots
- status transition
- order history/tracking

Move to payment-service:
- `stripe/*`
- payment intents
- provider transaction IDs
- Stripe webhooks/refunds

Move to promotion-service:
- `discounts/*`
- coupon validation
- usage limits
- redemption history

Move from API Gateway to notification-service:
- email delivery
- order-success email
- OTP email (identity publishes event, notification sends it)

## Checkout orchestration

### Prepare order

1. Frontend sends only `variant_id + quantity`, shipping input, optional coupon code and loyalty points request.
2. order-service asks catalog-service for immutable item snapshots and current prices.
3. order-service asks inventory-service to reserve stock.
4. order-service asks promotion-service for a pricing preview.
5. order-service asks customer-service to validate available loyalty points.
6. order-service computes the authoritative total and persists a `PENDING_PAYMENT` order.
7. Gateway returns `order_id` and authoritative payable amount.

### Payment

1. Frontend asks payment-service to create an intent using `order_id`, never an arbitrary amount.
2. payment-service obtains the authoritative amount from order-service.
3. Stripe webhook is the source of truth for success/failure.
4. `payment.succeeded` confirms the order.
5. inventory-service commits the reservation.
6. promotion-service records redemption.
7. customer-service consumes loyalty points and records the ledger entry.
8. notification-service sends confirmation email.

### Failure / compensation

- Payment failed/cancelled -> order cancelled -> inventory reservation released.
- Order creation failed -> no promotion redemption and no loyalty consumption.
- Email failure never rolls back a successful payment/order.

## Event envelope

Every event uses:

```ts
{
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  causationId?: string;
  payload: unknown;
}
```

Consumers must persist/process `eventId` idempotently when the event changes business state.

## Core events

- `identity.user.registered`
- `identity.password-reset.requested`
- `catalog.product.created`
- `catalog.product.updated`
- `catalog.product.deleted`
- `order.created`
- `order.cancelled`
- `order.confirmed`
- `inventory.reserved`
- `inventory.reservation-failed`
- `inventory.released`
- `inventory.committed`
- `payment.intent-created`
- `payment.succeeded`
- `payment.failed`
- `payment.refunded`
- `promotion.redeemed`
- `customer.loyalty.consumed`

## Suggested database ownership

One PostgreSQL server can still be used locally, but create separate logical databases:

- identity_db
- customer_db
- catalog_db
- inventory_db
- order_db
- payment_db
- promotion_db

Notification has no required database in phase 1. Elasticsearch belongs to catalog-service for now.

## Security rules

- No fallback JWT secret.
- Admin mutations must require JWT + admin authorization at Gateway.
- Password hashes, OTPs and reset tokens never leave identity-service.
- Password reset uses a short-lived one-time reset token after OTP verification.
- User/customer mutation always uses identity from the authenticated token; never trust a user id from the browser for ownership.
- Stripe webhook signatures must be verified by payment-service.

## Deployment rule

Only API Gateway and the two web applications expose public ports. Domain services, RabbitMQ, PostgreSQL and Elasticsearch stay on internal networks.
