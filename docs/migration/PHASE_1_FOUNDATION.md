# Phase 1 — V2 foundation (additive, isolated)

**Target branch**: `refactor/v2-phase1-foundation` (from `refactor/v2-phase0-baseline`). Never merge to `main` or cut over V1 within Phase 1.

## Phase label crosswalk

The earlier architecture blueprint called "Foundation" Phase 0 and "Inventory extraction" Phase 1. After runtime Phase 0 was defined as the V1 safety net, the migration work plan now labels **Foundation as Phase 1**, **Inventory as Phase 2**. This affects scheduling labels only: all locked ownership, Saga, DB, and messaging decisions remain unchanged. See [DOMAIN_OWNERSHIP.md](../../AdidasCloneBackEnd/docs/architecture/DOMAIN_OWNERSHIP.md).

## Scope and deliberate exclusions

Deliver: Node 24 + compatible Nest 11, one backend dependency tree, 9 Nest app skeletons (Gateway + 8 domains), wire contracts, strict gateway CORS/validation, Swagger, health modules, structured JSON logs, correlation ID, test automation, independent V2 Compose project and DB initialization for seven empty logical DBs. V1 source code and volumes are not modified.

Defer: live domain endpoints, migration of user/product/order data, Stripe, SMTP, Prisma schemas, RabbitMQ producers/consumers, outbox/inbox tables and DLQ policies, distributed tracing/Grafana, frontend migrations, business E2E. Stub health readiness checks **only the Nest process**, not Postgres, RabbitMQ, ES, Stripe or business functionality. RabbitMQ durability settings in source are the **planned** topology, not a live broker claim.

## Local validations on Node 24

```bash
cd AdidasCloneBackEnd
node -v
npm ci --ignore-scripts       # locked dependency tree committed in Phase 1
npm run check
```

Only one source tree is built: `AdidasCloneBackEnd/apps` and `libs`; the V1 packages remain under `api_gateway/` and `service/`.

## V2 isolated Docker (never run V1 es_restorer)

```bash
cd AdidasCloneBackEnd
cp infra/docker/.env.example infra/docker/.env.local
# Edit the two *_PASSWORD placeholders locally; do not paste secrets into chats.
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml config --quiet
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml build api-gateway
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml up -d api-gateway
curl -fsS http://localhost:4300/health/live
curl -fsS http://localhost:4300/health/ready
curl -fsS http://localhost:4300/api/docs-json
curl -fsS http://localhost:4300/api/v1/system
```

`docker compose up -d api-gateway` starts the V2 gateway shell; it does not start V1 or change database state. For the optional fresh V2 data infrastructure use `up -d postgres rabbitmq redis elasticsearch`; storage is separate from V1. The eight domain shells may be started explicitly if needed; do not run the entire stack on a low-disk Mac unintentionally.

## Owner-approved development data policy (20 October 2026)

- The repository owner confirms that the running V1 environment contains no newly valuable data beyond the existing GitHub `main:init-postgres/nike_shop.sql` seed and explicitly directs **no new PostgreSQL dumps, no backup/restore drills and no automated backup gate during Phase 1 or subsequent phases** while that remains true.
- Treat the seed SQL as a **rebuildable development baseline**, not a proven byte-for-byte snapshot of currently running PostgreSQL. It contains DROP statements: never import it into the live `mydb` in order to verify migration.
- The V2 foundation and tests must run against new isolated V2 storage or disposable fixtures. Do not alter or delete V1 DB/volumes, and never run `es_restorer`, `docker compose down -v` on V1 or destructive Docker volume cleanup.
- When meaningful new data is first introduced, reassess recovery requirements before any destructive migration or cutover; agree on and verify the backup process at that time.
- This owner-approved waiver replaces the older Phase 0 dump/restore acceptance items as a **planning gate only**. It does not assert those backup/restore tests passed.

## Exit gate — evidence still required

- [x] Phase 1 branch derives from Phase 0 commit.
- [x] Nine Nest skeletons + wire-only contracts authored.
- [x] Gateway configured with CORS/validation/Swagger and technical health endpoints.
- [x] Distinct V2 Compose project and V2-only named volumes defined.
- [x] Static Node test suite and CI pipeline authored.
- [x] Phase 0 backup/restore gate explicitly waived by repository owner for the current development-only dataset. The original `init-postgres/nike_shop.sql` on `main` is accepted as the seed baseline; it has **not** been verified equivalent to the live DB, and restoring it can drop tables. No backup or restore test is to be requested in upcoming phases unless new data worth retaining is introduced or the owner changes this decision.
- [ ] Phase 0: local host Git / .env `Operation canceled` issue resolved.
- [x] Dependency lockfile generated on Node 24 and committed; CI/Docker switched to `npm ci`.
- [x] GitHub Actions: Node 24 locked `npm ci`, lint, typecheck, tests, build, real HTTP smoke and Compose config PASS.
- [ ] V2 Docker build, Compose validation and gateway HTTP health/docs smoke pass on Docker host.
- [ ] PR review confirming no modified V1 business files.

Do not claim Phase 1 COMPLETE or start business extraction while these gates are unverified.

## Recovery for pre-existing isolated V2 PostgreSQL volume

On some Docker Desktop for macOS setups, the earlier bind-mounted `.sh` initializer failed with `bad interpreter: Permission denied`. The V2 initializer is now `10-create-databases.sql`, executed by psql on first volume creation. An existing V2 volume is **not** initialized twice, so to create the missing logical databases safely **without deleting volumes**, run:

```bash
DC=(docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml)
"${DC[@]}" config --quiet
"${DC[@]}" up -d --no-deps postgres
cat infra/docker/10-create-databases.sql | "${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U v2_local -d postgres
"${DC[@]}" exec -T postgres psql -U v2_local -d postgres -Atc "SELECT count(*) FROM pg_database WHERE datname IN ('identity_db','customer_db','catalog_db','inventory_db','order_db','payment_db','promotion_db');"
```

Expected count: **7**. This repair modifies only the new `adidas-v2` PostgreSQL instance and is idempotent; it does **not** touch V1 or require any backup.
