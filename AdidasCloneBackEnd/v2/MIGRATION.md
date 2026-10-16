# Incremental Migration Plan

## Phase 0 — scaffold

- Run V2 services beside the current backend.
- Keep current frontend unchanged.
- Add health checks and RabbitMQ contracts.

## Phase 1 — extract payment and inventory first

These two extractions fix the largest commerce-integrity issues with minimum UI impact.

1. Create inventory records from current `product_variants.stock`.
2. Make catalog stop mutating stock directly.
3. Route checkout stock checks through inventory-service.
4. Move Stripe logic from order_service to payment-service.
5. Payment intent accepts `order_id`, not browser `amount`.

## Phase 2 — split identity/customer

1. Copy credential fields from current `users` table to identity_db.
2. Copy profile/address/wishlist/loyalty to customer_db.
3. Preserve the existing numeric user ID initially to avoid breaking references.
4. Switch Gateway auth routes to identity-service.
5. Switch profile/address/wishlist/loyalty routes to customer-service.

## Phase 3 — split promotion/notification

1. Move discount tables and code to promotion-service.
2. Stop incrementing coupon usage during preview/apply.
3. Redeem only after confirmed order/payment.
4. Move email sending out of API Gateway.

## Phase 4 — catalog/order isolation

1. Move catalog tables to catalog_db.
2. Move orders to order_db using item/address snapshots.
3. Remove cross-service DB relations.
4. Synchronize Elasticsearch through catalog domain events.

## Compatibility strategy

During migration, keep old HTTP routes in the Gateway and change only their downstream RabbitMQ target. This lets the current React and Admin apps continue to work while services move underneath them.
