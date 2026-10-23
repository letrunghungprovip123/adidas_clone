# V2 domain ownership — Phase 1 contract

This is an additive V2 foundation. The legacy V1 Gateway/User/Product/Order apps and **mydb** remain unchanged.

| Business domain | Owns | Logical database |
|---|---|---|
| Identity | login, passwords, access/refresh tokens, roles, reset sessions | identity_db |
| Customer | profiles, addresses, wishlists, loyalty account/holds/ledger | customer_db |
| Catalog | product/variant metadata, pricing, categories, reviews, images, Elasticsearch | catalog_db |
| Inventory | on-hand/reserved stock, reservations, stock movements | inventory_db |
| Order | authoritative checkout quote, order snapshots, lifecycle, Saga | order_db |
| Payment | Stripe PaymentIntent/webhook, payment attempts, refunds | payment_db |
| Promotion | coupon rules, holds, redemptions | promotion_db |
| Notification | delivery of email notifications via events | no DB provisioned at foundation |

All cross-service references are scalar IDs, never cross-database FKs. Only the owning service may modify its records. No service may query another service's logical database. Gateway must never receive a DATABASE_URL, Stripe key, SMTP credentials, or business price authority.

Technical wiring introduced in Phase 1: versioned message names/envelope, independent health HTTP endpoints, JSON Nest logs, correlation ID, gateway OpenAPI, isolated Docker definitions. These do **not** mean RabbitMQ handlers, outbox/inbox persistence, tracing, or data migration are implemented.

## Business acceptance gates for later phases
- Inventory: two buyers racing for the final unit -> one valid hold; commit/release idempotent.
- Payment: duplicate Stripe webhook -> one recorded business effect; Stripe signature verified.
- Order: Order before payment; server-derived monetary total in integer minor units; stored item/shipping snapshot; retries resume FINALIZING.
- Promotion/Customer: holds protect final coupon slot/loyalty balance; failure releases exactly once.
- Notification: failed/repeated delivery never rolls back Order and never sends duplicates.

## Architecture invariants
- Eight business services, plus one thin Gateway.
- 7 logical PostgreSQL DBs on a single V2 PostgreSQL container in dev.
- Domain events: commerce.events topic exchange, distinct durable consumer queues.
- All critical commands: durable + persistent + manual ACK + idempotent behavior (implementation later).
- Redis and Elasticsearch are read models / operational stores, never authoritative order/payment/inventory sources.
- V1 data, processes, UI, ports, and volumes remain untouched during the foundation phase.
