# Phase 3 — Catalog Service V2

## Scope

This phase builds the V2 Catalog domain on **the existing continuous V2 development branch** `refactor/v2-phase1-foundation`. Original V1 Product Service, API Gateway, both frontends, V1 PostgreSQL `mydb`, V1 Elasticsearch indices and V1 Docker volumes remain unchanged. There is **no live checkout cutover**.

### Business implementation

- `catalog_db` owns Categories, Products, Variants, base prices, price history, images, reviews and lifecycle.
- Versioned Product lifecycle `DRAFT → PUBLISHED → ARCHIVED`, with controlled unpublish from PUBLISHED to DRAFT.
- Server-authoritative prices use **`NUMERIC(16,2)`**, represented as exact decimal strings in checkout-item contracts because the original SQL seed contains fractional prices. Every price mutation is audited and product-versioned. Order is responsible for later storing its authoritative item snapshot.
- Variants keep **original numeric IDs** (489 variants) and SKU mapping. Catalog never changes V2 Inventory stock directly. Registered SKUs cannot silently change; status changes are propagated to Inventory.
- Idempotent product/variant mutations, optimistic version checks, strict attribute allowlists, stable pagination, archive instead of destructive deletion.
- Categories support creation and activation/deactivation with protection against disabling categories that still have published products.
- Cloudinary signed upload and remote-asset verification are implemented behind disabled-by-default internal admin-write commands; authenticated Admin/Identity cutover remains a later phase. Review reads/legacy import and verified-purchase-protected write method; Gemini 2.5 Flash suggestion with bounded request and Catalog-only fallback.
- `catalog.checkout-items.get.v1` supplies price and product snapshots; **Inventory Reserve must still occur during Order checkout**.

### Data migration

Source is repository seed `init-postgres/nike_shop.sql`, **not** the running V1 database. Parser verifies row counts and foreign keys before writing. It preserves IDs for:
- Products: **85**
- Variants: **489**
- Categories: **11**
- Product images: **93**
- Reviews: **5** (flagged legacy/unverified)

The importer intentionally starts Catalog variants at `inventory_sync_status=PENDING`; **only** a real successful Inventory registration command may mark a variant `SYNCED`. Seed import is idempotent by ID and does not overwrite modified records. This is *development baseline*, not a production migration of live changing stock.

### Cross-service and search NFR

- Inventory variant provisioning is idempotent. Published/enabled Catalog variants are enabled in Inventory, archived/unpublished/disabled variants are disabled. Inventory stock versioned snapshots/events feed Catalog's own projection. The `catalog_inbox` deduplicates events and rejects older stock versions.
- Catalog transactional outbox sends persistent topic events with RabbitMQ confirms; consumers use durable queue/manual ACK and DLQ. `catalog_inventory_projection` is an **eventually consistent read model** and never the authority for Reserve.
- V2 Elasticsearch uses its own `catalog_products_v*` indices and `catalog-products-read` alias, index-version tracking, published-only visibility, background retry and reindex. PostgreSQL bounded fallback is available if ES is unavailable; direct checkout quote never reads ES.
- PostgreSQL transactions, uniqueness/foreign-key/check constraints, connection pool and query timeouts. Runtime `/health/ready` verifies Catalog PostgreSQL, while external ES/AI interruptions are degraded behavior rather than business DB corruption.
- Catalog administrative RabbitMQ commands are **disabled by default**, require a provisioned private token in development and a trusted admin actor. Public Admin/frontend integration must await Identity's authenticated/authorized Gateway mediation, separate broker credentials and least privilege.

### Targeted automated verification

CI `.github/workflows/v2-foundation.yml` runs Node 24 lint/typecheck/build, original smoke, Inventory tests, and these **new, focused** gates:
1. isolated PostgreSQL 16 `catalog_db` migration, seed check and import;
2. real PostgreSQL Catalog domain tests (prices/quotes, versioning, idempotency, archive, reviews, event dedupe and SQL search fallback);
3. real RabbitMQ Catalog ↔ Inventory bridge, seed variant acknowledgment, event-driven stock projection and write-denial;
4. real Elasticsearch 8.15 index/search/update/archive/reindex;
5. production dependency audit and Compose schema.

Previously verified unrelated V1 workflows need not be repeated. See `docs/migration/V2_PHASE_TESTING_POLICY.md`.

## Local Mac acceptance — isolated V2 only

From `AdidasCloneBackEnd` on the current V2 branch:

```bash
git pull --ff-only origin refactor/v2-phase1-foundation
DC=(docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml)
"${DC[@]}" config --quiet
"${DC[@]}" up -d postgres rabbitmq
"${DC[@]}" exec -T postgres pg_isready -U v2_local -d catalog_db
"${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U v2_local -d catalog_db < apps/catalog-service/migrations/001_catalog.sql
npm run seed:catalog:check
node scripts/phase3/seed-catalog.mjs | "${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U v2_local -d catalog_db
"${DC[@]}" up -d --build --no-deps inventory-service catalog-service
"${DC[@]}" ps inventory-service catalog-service
"${DC[@]}" exec -T catalog-service node -e 'fetch("http://127.0.0.1:4103/health/ready").then(r=>{console.log("Catalog HTTP",r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})'
"${DC[@]}" exec -T postgres psql -U v2_local -d catalog_db -Atc "SELECT (SELECT count(*) FROM catalog_products), (SELECT count(*) FROM catalog_variants), (SELECT count(*) FROM catalog_categories), (SELECT count(*) FROM catalog_product_images), (SELECT count(*) FROM catalog_reviews);"
```

Expected Catalog DB counts: `85|489|11|93|5`, plus any new development fixtures the owner explicitly created. Catalog's bridge will progressively register PENDING variants with the existing Inventory. Use `"${DC[@]}" logs --tail=60 catalog-service` only if a targeted readiness check fails.

**Search on a disk-limited Mac is optional:** Elasticsearch is tested by GitHub CI. To enable V2 search locally, first start only the separate `elasticsearch` service, set `V2_CATALOG_SEARCH_ENABLED=true` in the **ignored V2 local env** file and recreate Catalog; do not start the V1 Elasticsearch as a substitute. Search startup now retries failures in the background.

**Do not run** `docker compose down -v`, `docker volume prune`, or restore V1 SQL into `mydb`. Owner waives backups while only expendable development seed data exists.

## Remaining integration boundaries, intentionally deferred

- Live V1 checkout, Admin frontend and customer frontend continue using V1 until coordinated cutover with V2 Identity, Order, Payment and Promotion.
- Public review creation must validate Identity and verified purchase against Order; this phase leaves public write disabled.
- Public signed media upload requires authoritative Admin auth and production Cloudinary settings; no external secret or live provider credentials were used in CI.
- Operational SLO benchmarking, multi-node high availability, broker least-privilege credentials and incident recovery are production hardening gates, not proven by the current development CI.
- A full production-grade, continuously changing V1 data migration is distinct from seed-only development import.
