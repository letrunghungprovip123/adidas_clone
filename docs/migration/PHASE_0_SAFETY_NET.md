# Adidas Clone V2 — Phase 0 Safety Net

> Phase 0 does not change business behavior. Its only purpose is to capture the V1 baseline, make recovery possible, and create repeatable verification before the V2 migration starts.

## Baseline

- Repository: `letrunghungprovip123/adidas_clone`
- Source branch: `main`
- Baseline commit: `491ec01c9329a5aa6839d85b186f77c5f3e4c84e`
- Baseline commit message: `test cicd`
- Phase branch: `refactor/v2-phase0-baseline`
- Current backend topology: API Gateway + User Service + Product Service + Order Service
- Current infrastructure: PostgreSQL + RabbitMQ + Elasticsearch + Kibana + Docker Compose + Jenkins
- Current customer UI: React/Vite
- Current admin UI: React/Vite-based admin application
- Exact package/runtime snapshot: [`V1_VERSION_BASELINE.md`](./V1_VERSION_BASELINE.md)

## Branch safety

The old accidental branch `refactor/domain-microservices-v2` is NOT part of this migration and must not be used as a base.

All Phase 0 work starts from the exact `main` commit above. `main` must remain unchanged until the Phase 0 branch has been reviewed.

## Known V1 architectural/security/data-integrity issues

These are pre-existing issues. They must not be incorrectly attributed to the V2 refactor.

- Three backend services share the same PostgreSQL database/schema.
- API Gateway currently has a database connection even though V2 requires a thin gateway with no database.
- API Gateway currently has no Swagger/OpenAPI integration.
- Gateway CORS is currently permissive (`origin: '*'`).
- Nest package majors are inconsistent in the current Gateway/User dependency trees.
- Current Docker/Jenkins runtime uses Node 20; V2 baseline targets Node 24 LTS.
- RabbitMQ critical queues are currently configured with `durable: false` in the existing implementation.
- RabbitMQ development credentials are hardcoded in current configuration.
- Product domain currently owns stock; V2 moves stock ownership to Inventory Service.
- Current checkout trusts client-side item price/total inputs.
- Current checkout can create/confirm Stripe payment before an Order exists.
- Current loyalty deduction is not a proper hold/commit/release workflow.
- Current promotion application can consume usage before purchase finalization.
- Current checkout has no inventory reservation transaction.
- Stripe lifecycle currently belongs to Order Service; V2 moves it to Payment Service.
- Notification/email currently leaks into Gateway responsibility; V2 moves it to Notification Service.
- Password reset/OTP flow requires security hardening in the future Identity phase.
- Several admin/data mutation routes require authorization hardening.
- Elasticsearch synchronization is not consistently event/outbox driven.
- Full distributed tracing, centralized structured logs, readiness checks, Outbox/Inbox and DLQ architecture are not yet implemented.

## Phase 0 repository deliverables

- [x] Capture `main` baseline commit.
- [x] Create a clean Phase 0 branch from `main`.
- [x] Record known V1 issues.
- [x] Add PostgreSQL backup script.
- [x] Add PostgreSQL restore-verification script.
- [x] Add repeatable Docker Compose/repository verification script.
- [x] Add read-only runtime smoke-test automation.
- [x] Add one-command Phase 0 runner.
- [x] Record exact package/runtime versions used by V1.
- [x] Ignore local dumps/env/private-key material so Phase 0 evidence cannot be accidentally committed.

## One-command runtime verification

Run from the repository root on the Docker-capable development/Jenkins host while checked out to the Phase 0 branch:

```bash
bash scripts/phase0/run-phase0.sh
```

The runner performs, in order:

1. prerequisite + working-tree safety checks;
2. repository and Docker Compose validation;
3. V1 Docker image build;
4. `docker compose up -d` without running `down` or deleting volumes;
5. read-only runtime smoke checks;
6. PostgreSQL custom-format backup;
7. restore into a temporary verification database;
8. automatic deletion of the temporary verification database.

The runner intentionally leaves the V1 stack running for inspection.

### Required local/Jenkins runtime files

These are intentionally not committed:

```text
AdidasCloneBackEnd/api_gateway/.env
AdidasCloneBackEnd/service/user_service/.env
AdidasCloneBackEnd/service/product_service/.env
AdidasCloneBackEnd/service/order_service/.env
AdidasCloneBackEnd/service/user_service/firebase-admin-key.json
```

The current Jenkins credential process can inject these files. V2 will redesign secret ownership later; Phase 0 does not change it.

### Optional runner flags

For troubleshooting only:

```bash
PHASE0_SKIP_BUILD=1  bash scripts/phase0/run-phase0.sh
PHASE0_SKIP_BACKUP=1 bash scripts/phase0/run-phase0.sh
PHASE0_SKIP_SMOKE=1  bash scripts/phase0/run-phase0.sh
```

A complete Phase 0 gate must eventually be run without these skip flags.

## Automated read-only smoke checks

`scripts/phase0/smoke-v1-readonly.sh` verifies without mutating business data:

- PostgreSQL readiness;
- RabbitMQ broker ping;
- Elasticsearch cluster HTTP health;
- API Gateway root endpoint;
- `GET /products` through Gateway -> RabbitMQ -> Product Service -> PostgreSQL;
- `GET /products/search` through Gateway -> RabbitMQ -> Product Service -> Elasticsearch;
- customer frontend HTTP reachability;
- admin frontend HTTP reachability.

These are deliberately safe to run against an existing development dataset.

## Side-effect V1 flows recorded for later isolated test automation

The following capabilities are part of the V1 functional baseline, but Phase 0 does not automatically mutate a real dataset to test them. They will be automated against an isolated test database/Stripe test environment before their respective V2 cutovers:

1. Register.
2. Login.
3. Product detail/variant data.
4. Address create/update/delete.
5. Wishlist add/remove.
6. Loyalty mutation/current behavior.
7. Discount/coupon application.
8. Stripe test-mode checkout.
9. Create order.
10. Admin product create/update/delete.

This separation is intentional: a safety-net script must not create customers, consume coupons/points, create Stripe objects or mutate catalog data on an unknown runtime dataset.

## Runtime work still requiring a Docker-capable host

Repository tooling is complete, but these items cannot be truthfully marked complete until the one-command runner executes on an environment with Docker and the current secrets/data:

- [ ] Create PostgreSQL baseline dump.
- [ ] Restore the dump into a temporary verification database and validate it.
- [ ] Run `docker compose config` on the actual runtime host.
- [ ] Build the current V1 images from this branch.
- [ ] Bring the V1 stack up without destroying existing volumes.
- [ ] Pass all automated read-only smoke checks.
- [ ] Record any runtime-only legacy failures as known baseline issues.

The repository already contains `es_backup.tar`; Phase 0 read-only automation verifies the live Elasticsearch/search path. Destructive restore testing of the Elasticsearch backup must only be done in an isolated environment, never over the active V1 index.

## Phase 0 exit gate

Phase 1 MUST NOT begin until the following are true:

- [x] Repository baseline is documented.
- [x] Known V1 issues are documented.
- [x] Backup/restore tooling exists.
- [x] Runtime smoke checks are repeatable.
- [x] Exact V1 dependency/runtime baseline is recorded.
- [ ] PostgreSQL dump exists from the actual runtime dataset.
- [ ] Backup restore verification succeeds on that dump.
- [ ] V1 Docker Compose builds and starts successfully from the Phase 0 branch.
- [ ] Automated read-only runtime smoke checks pass.
- [ ] Any runtime-only legacy failures are explicitly documented.
- [ ] Phase 0 branch diff is reviewed to confirm there are no V2 business behavior changes.

## Change policy

Phase 0 changes must be additive safety/documentation/test tooling only. Do not alter checkout, auth, stock, promotion, loyalty, payment, or order business behavior in this phase.
