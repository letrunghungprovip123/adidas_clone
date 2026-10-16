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

## Branch safety

The old accidental branch `refactor/domain-microservices-v2` is NOT part of this migration and must not be used as a base.

All Phase 0 work starts from the exact `main` commit above. `main` must remain unchanged until the Phase 0 branch has been reviewed.

## Known V1 architectural/security/data-integrity issues

These are pre-existing issues. They must not be incorrectly attributed to the V2 refactor.

- Three backend services share the same PostgreSQL database/schema.
- API Gateway currently has a database connection even though V2 requires a thin gateway with no database.
- API Gateway currently has no Swagger/OpenAPI integration.
- Gateway CORS is currently permissive (`origin: '*'`).
- Nest package majors are inconsistent in the current Gateway dependency tree.
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

## Phase 0 deliverables

### Repository-level work

- [x] Capture `main` baseline commit.
- [x] Create a clean Phase 0 branch from `main`.
- [x] Record known V1 issues.
- [ ] Add PostgreSQL backup script.
- [ ] Add PostgreSQL restore-verification script.
- [ ] Add repeatable Docker Compose verification script.
- [ ] Add baseline smoke-test checklist / automation.
- [ ] Record exact package/runtime versions used by V1.

### Runtime work

The following requires access to the actual Docker/Jenkins host. The repository scripts will automate it, but it cannot be truthfully marked complete until run against the real environment.

- [ ] Create PostgreSQL baseline dump.
- [ ] Restore the dump into a temporary verification database and validate it.
- [ ] Verify current Elasticsearch backup can be restored or at minimum inspected successfully.
- [ ] Run `docker compose config` on the actual deployment host.
- [ ] Bring the V1 stack up from the baseline commit.
- [ ] Verify Gateway, 3 services, frontend and admin are reachable/healthy.
- [ ] Run baseline smoke tests.

## Baseline smoke flows

At minimum Phase 0 must preserve and test the following V1 capabilities before structural refactoring begins:

1. Register.
2. Login.
3. Fetch product list.
4. Fetch product detail/variant data.
5. Address create/read/update/delete with the currently supported behavior.
6. Wishlist add/read/remove.
7. Loyalty read/current behavior.
8. Discount/coupon validation/current behavior.
9. Stripe test-mode checkout/current behavior.
10. Create and retrieve an order.
11. Admin product create/update operations.
12. Search/Elasticsearch basic product search.

## Phase 0 exit gate

Phase 1 MUST NOT begin until the following are true:

- Repository baseline is documented.
- PostgreSQL dump exists.
- Backup restore verification succeeds.
- V1 Docker Compose starts successfully from the captured baseline.
- Existing backend applications build.
- Customer frontend builds.
- Admin frontend builds.
- Baseline smoke tests exist and are repeatable.
- Known V1 issues are documented.
- No V2 business-service extraction has been mixed into Phase 0.

## Change policy

Phase 0 changes must be additive safety/documentation/test tooling only. Do not alter checkout, auth, stock, promotion, loyalty, payment, or order business behavior in this phase.
