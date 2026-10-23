# Phase 4 — Customer Business Domain + Non-functional Requirements

## Scope and ownership

Customer owns profile, shipping addresses, wishlists, loyalty wallets, immutable ledger and loyalty holds. Identity owns credentials, JWT, account status and roles; Catalog owns products; Order owns checkout/Saga. These boundaries follow `AdidasCloneBackEnd/docs/architecture/DOMAIN_OWNERSHIP.md`.

All work is additive to the existing `refactor/v2-phase1-foundation` branch. **No V1 service source, V1 checkout, V1 PostgreSQL `mydb`, or V1 Docker volumes are modified.** Phase 4 is domain-ready for later Identity, Order and Gateway integrations. Do not route real checkout through Customer yet.

### Upgraded business features

- **Profiles:** stable legacy identity reference, strictly whitelisted metadata, optimistic version checks, server-authenticated internal provisioning. No password, OTP, admin role or email owner column.
- **Addresses:** owner-checked shipping snapshot query, atomic single default, first-address default, deterministic default fallback after delete, bounded address count, soft deletion, version conflict checks, retry-safe mutations.
- **Wishlists:** idempotent add/remove, primary key on customer+product, bounded pagination, Catalog read contract validates product PUBLISHED before adding via real RabbitMQ; missing Catalog fails closed.
- **Loyalty wallet:** one account per customer, `posted >= reserved >= 0`, atomic hold, commit/release/expire, retry-safe operation hashes. `available = posted - reserved`. Two checkout attempts cannot spend the same points.
- **Ledger:** append-only database trigger, unique business source, OPENING/EARN/REDEEM/ADJUSTMENT records, explicit reason and references. All spend/award ledger writes occur in the **same SQL transaction** as wallet mutations.
- **Expiration:** DB-clock TTL 60–1800 seconds; default 900. Background worker cleans expired holds; late Commit fails. Terminal actions are idempotent and incompatible opposite actions conflict.
- **Reliability:** RabbitMQ durable customer command queue, manual ACK/DLQ, transactional outbox with persistent publish and confirms, idempotent business operations. Reconciliation tests verify wallet posted values against ledger.
- **Security:** Fail-closed, all business RabbitMQ calls require strong internal token; customer calls must match authenticated actor subject; Order/Identity-sensitive commands require `system` role and trusted backend token. Explicit rewards adjustment wire command is disabled pending Order/Identity cutover. Public Customer write routes do not exist.

## Legacy seed reconciliation

Source: *checked-in* `init-postgres/nike_shop.sql`, never live V1 database. Exact source checks:
- **19 users** → 19 profiles and 19 wallets (15 zero-opening, four credited)
- **20 addresses** → 20 customer addresses; first address becomes default only when no source default exists
- **1 wishlist** → one customer/product reference
- **7 loyalty rows belonging to 4 customers** → seven immutable provenance records; opening ledger totals preserve sum of original points, with exactly four positive `OPENING` entries if each has a positive sum

The user IDs and address IDs are preserved; no V1 password/OTP/email/role is imported to `customer_db`. The seed import is idempotent and will not overwrite later edits to customer data. It does **not** infer historical EARN/REDEEM transactions that V1 never recorded.

## Tests / Definition of Done

Targeted GitHub CI runs in isolated PostgreSQL 16 and RabbitMQ 3. Key cases:
- Seed row counts, provenance, opening ledgers vs posted wallets; idempotent migration/import
- Profile stale version and disallowed fields; cross-user address denial
- Simultaneous default-address updates, old/default deletion and replacement
- Wishlist add/remove retries and Catalog-backed published-product verification
- 100 checkout holds of 100 points competing for 1,000 points → exactly ten holds
- Commit twice, Release vs Commit, late Commit after expiration and exactly-once ledger debit
- Source-ref idempotency and invalid overdraft rejection
- Database trigger refuses ledger UPDATE/DELETE
- Real broker authentication, cross-user access denial, Order-only hold, persistent customer outbox events

No repeat of full V1 smoke, Catalog reindex, or unrelated foundation checks on the developer's Mac. The CI workflow may continue to run its existing gates, but local acceptance is limited to Customer.

## Mac deployment — only isolated V2 Customer

From `AdidasCloneBackEnd` (zsh):

```bash
git pull --ff-only origin refactor/v2-phase1-foundation
grep -q '^V2_CUSTOMER_INTERNAL_TOKEN=' infra/docker/.env.local || printf 'V2_CUSTOMER_INTERNAL_TOKEN=%s\n' "$(openssl rand -hex 32)" >> infra/docker/.env.local
DC=(docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml)
"${DC[@]}" up -d --wait postgres rabbitmq
"${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U v2_local -d customer_db < apps/customer-service/migrations/001_customer.sql
npm run seed:customer:check
node scripts/phase4/seed-customer.mjs | "${DC[@]}" exec -T postgres psql -q -v ON_ERROR_STOP=1 -U v2_local -d customer_db
"${DC[@]}" up -d --build --no-deps customer-service
"${DC[@]}" ps customer-service
"${DC[@]}" exec -T customer-service node -e 'fetch("http://127.0.0.1:4102/health/ready").then(r=>{console.log("Customer HTTP",r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})'
"${DC[@]}" exec -T postgres psql -U v2_local -d customer_db -Atc "SELECT (SELECT count(*) FROM customer_profiles),(SELECT count(*) FROM customer_addresses),(SELECT count(*) FROM customer_wishlists),(SELECT count(*) FROM customer_seed_loyalty_rows),(SELECT count(*) FROM loyalty_wallets),(SELECT count(*) FROM loyalty_ledger WHERE entry_kind='OPENING');"
```

Baseline expectation: `19|20|1|7|19|4` and `Customer HTTP 200`, container healthy. A Customer readiness result requires PostgreSQL tables to exist. The V2 broker token is kept only in ignored `infra/docker/.env.local`, never committed. If the token line exists but is empty or short, replace it locally with a randomly generated 64-hex-character value.

Avoid `docker compose down -v`, pruning volumes or touching V1 `mydb`. Do not rerun all Inventory/Catalog tests on Mac.

## Deliberate future cutover gates

- Identity V2 must authenticate user tokens, perform real account provisioning and provide service-level caller authorization; the shared internal development token alone is not production-grade authorization.
- Order V2 must own checkout totals, quote, hold extension/timeout strategy and compensation across Inventory, Promotion, Customer and Payment. V1's frontend-side points deduction must be retired at cutover.
- Reward earning/refund reversal amounts and eligibility rules require an approved business policy. Production Order/Refund event consumers and inbox reconciliation become active only when their contracts are finalized; `customer_inbox` is reserved for that integration.
- PII retention/anonymization workflows, production SLO/load benchmarks and broker least-privilege credentials remain deployment hardening gates.
- Live V1 DB migration requires a separate migration/cutover plan when seed-only baseline ceases to be representative.
