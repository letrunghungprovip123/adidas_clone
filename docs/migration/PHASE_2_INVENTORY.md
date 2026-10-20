# Phase 2 — Inventory business + NFR implementation

**Branch:** `refactor/v2-phase1-foundation` (one continuous V2 development line; no new phase branches).  
**Migration policy:** additive, isolated V2 `inventory_db` only. Existing V1 User/Product/Order, admin, customer checkout, `mydb`, Elasticsearch and V1 Docker volumes remain unchanged. Owner's seed-only development data policy still applies.

## Business features delivered

- **Stock authority:** `inventory_stock` owns `on_hand_qty`, `reserved_qty`, and `available_qty = on_hand - reserved` for each Catalog `variant_id`; disabled variants return zero availability.
- **Atomic multi-line Reserve:** duplicate lines merge and sort by variant ID; all variants are reserved or the entire PostgreSQL transaction rolls back. SQL `UPDATE ... WHERE on_hand_qty-reserved_qty >= quantity` prevents overselling under contention.
- **Idempotency:** `checkout_ref` plus `idempotency_key` and canonical request hash. Same request returns the same reservation; changed payload/key fails, including when RabbitMQ retries.
- **Commit/Release:** guarded ACTIVE→COMMITTED/RELEASED transitions and exactly-once stock effects within database transactions. Repeated terminal action returns its previous result; opposite action conflicts.
- **Expiration:** 60–1800 second configurable TTL (default 900), PostgreSQL clock used for expiry decisions. Background worker locks expired rows with `SKIP LOCKED` and atomically releases held units. Late Commit rejects even if expiration was previously unprocessed.
- **Inventory adjustment:** internal privileged service method with bounded delta, mandatory reason, idempotency operation key and constraint preventing reduction below outstanding reservations. Admin HTTP endpoint is intentionally deferred until authenticated V2 Catalog/Identity integration.
- **Audit trail:** INITIAL/ADJUST/RESERVE/COMMIT/RELEASE/EXPIRE movements are written with stock changes in the same transaction.
- **Outbox:** versioned `inventory.*.v1` domain events stored in the same DB transaction. RabbitMQ confirm-channel publisher sends persistent messages to `commerce.events`; duplicate publication is possible after crash, so future consumers must dedupe `message_id`.

## Non-functional engineering

- Seven logical V2 PostgreSQL databases already exist; only **inventory_db** receives these migrations. No cross-service FKs.
- Schema constraints enforce nonnegative stock and `reserved <= on_hand`; unique variant and idempotency keys; expiry, movement and outbox indexes.
- Connection pooling max 10; bounded connection/query timeouts; process liveness and actual database readiness separately.
- Internal RabbitMQ request-response via `inventory.commands.q` (durable, prefetch 10, manual ack) and a dead-letter queue `inventory.commands.dlq` for unexpected processing errors. Dependency failure is **not** automatically retried forever; sender should retry with the same idempotency key and query reservation status after an ambiguous timeout.
- Host Gateway remains unchanged and stock-write endpoints are **not** exposed to the customer frontend. Pending: broker per-service least-privilege credentials, rate limiting on future public endpoints, and complete business cutover.
- Updated NestJS 11.2.7 and patched transitive dependencies; CI validates `npm audit --omit=dev --audit-level=high`.
- Foundation app smoke still starts Inventory in skeleton mode unless `V2_INVENTORY_ENABLED=true`. Docker Compose turns the domain on and requires PostgreSQL and RabbitMQ, so readiness is database-aware.

## Local Mac deployment — targeted, no V1 redeployment

From repository root:

```bash
git switch refactor/v2-phase1-foundation
git pull --ff-only origin refactor/v2-phase1-foundation
cd AdidasCloneBackEnd
npm ci --ignore-scripts
DC=(docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml)
"${DC[@]}" config --quiet
"${DC[@]}" up -d postgres rabbitmq
"${DC[@]}" exec -T postgres pg_isready -U v2_local -d inventory_db
"${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U v2_local -d inventory_db < apps/inventory-service/migrations/001_inventory.sql
npm run seed:inventory:check
node scripts/phase2/import-seed-v1.mjs | "${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U v2_local -d inventory_db
"${DC[@]}" up -d --build inventory-service
"${DC[@]}" ps inventory-service postgres rabbitmq
"${DC[@]}" exec -T inventory-service node -e 'fetch("http://127.0.0.1:4104/health/ready").then(r=>{console.log("Inventory readiness HTTP",r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e);process.exit(1)})'
```

The imported 489 variant IDs/SKUs/stock counts are from **`main:init-postgres/nike_shop.sql`**, not the live V1 database. The seed insert is idempotent and only inserts missing `variant_id`; it never overwrites quantities. This is development bootstrap only, not a real-time Catalog integration or production stock synchronization. Ensure the seed is still the data baseline you intend to use before running that optional import. If not, skip the seed command and use isolated test fixtures until Catalog integration.

The V2 PostgreSQL Docker container cannot be accessed directly from the Mac host because its port is intentionally not published. SQL migrations/import are piped through V2 Compose `exec` and never use V1. Avoid `docker compose down -v` and Docker volume pruning.

### Checks deliberately omitted on every future phase

No repeated V1 full smoke, ES index counts, all-nine-service rebuild, or complete foundation Docker acceptance. Per `V2_PHASE_TESTING_POLICY.md`, rerun only affected domain tests and boundaries. Phase 2 CI runs real PostgreSQL transactions and real RabbitMQ command/outbox tests on isolated GitHub-hosted services. These tests do not modify the developer's Mac.

## RabbitMQ contract

Command patterns:
- `inventory.reservation.create.v1` → `{checkout_ref,idempotency_key,items:[{variant_id,quantity}],ttl_seconds?}`
- `inventory.reservation.commit.v1` / `inventory.reservation.release.v1` → `{reservation_id}`
- `inventory.availability.get.v1` → `{variant_id}`
- `inventory.reservation.status.get.v1` → `{reservation_id}`

All inputs use a Phase 1 `MessageEnvelope` with `contract_version:1`; business responses use `{ok:true,data}` or `{ok:false,error:{code,message}}`. Domain errors are ACKed and returned to the caller. Unexpected infrastructure errors are dead-lettered; the caller reconciles by idempotency key/status. Test broker is local and never exposed publicly.

## Exit/limitations

- [x] Schema, transactional domain logic, expiry worker, outbox, message handlers committed.
- [x] Targeted PostgreSQL tests include 50 concurrent buyers / one last item, rollback, idempotent retries, commit/expire race, adjustment.
- [ ] Real RabbitMQ integration CI run confirmed and archived at latest head.
- [ ] Local Mac V2 migration + targeted Inventory Docker readiness confirmed (optional for implementation acceptance; still needed before local interactive development).
- [ ] Domain cutover deferred: V1 remains responsible for existing checkout until Catalog/Order/Payment/Identity integrations are ready.

**This phase does not claim a finished customer checkout, transactional Stripe integration or synchronization of live V1 stock.**
