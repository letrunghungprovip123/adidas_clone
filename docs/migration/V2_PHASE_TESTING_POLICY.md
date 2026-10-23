# V2 migration — change-based verification policy

**Owner preference (2026-10-20):** verify the *changed domain and affected integration points* in each phase. Reuse prior evidence for stable foundation/components. Avoid repeatedly running the entire Phase 1 acceptance suite, V1 smoke, Docker image builds, security audits, or infrastructure boot unless they are affected.

## Minimal recurring gates

1. At the end of a code batch / before pushing, run `npm run check` once in `AdidasCloneBackEnd` (lint, typecheck, tests, build); GitHub CI also runs checks automatically for matching changes. Do not manually repeat after an unchanged green CI commit.
2. Test the **new or changed service** with focused unit and integration tests, including one normal and one failure/retry case when applicable. Use only isolated V2 fixtures/databases.
3. Verify the direct API or RabbitMQ contract integration(s) touched by the phase. Only start the containers involved; do not start all nine applications by default.
4. For each migration cutover, test the one relevant V1 feature and the replacing V2 feature before routing traffic. Do not rerun unrelated V1 products/admin/search every phase.
5. Save a concise checkpoint in the phase PR: changed modules, tests run, results, unverified checks and known risks. Do not mark unexecuted checks PASS.

## Re-run only when affected

| Change scope | Additional checks |
| --- | --- |
| Domain-only implementation | Its targeted tests and direct dependent contracts; no full nine-service smoke |
| Gateway, common bootstrap, health, CORS, routing | Gateway HTTP smoke and affected route(s) |
| Dockerfile, Compose, ports, environment | `docker compose config --quiet`, rebuild and smoke only changed container(s) |
| Prisma schema, DB ownership or migrations | Migration on disposable V2 DB, related state tests |
| RabbitMQ envelopes/exchange/queue topology | Producer/consumer contract test, ack/retry/DLQ behavior where implemented |
| package.json or package-lock.json | `npm ci`, audit changed dependency set, full compile and affected regression tests |
| Change in public/V1 cutover path | Narrow V1→V2 before/after regression for affected feature |
| Major integrated milestone or final production release | Broader end-to-end suite, dependency audit, full readiness and security review |

## Critical domain tests: never skip when its behavior changes

- **Inventory**: concurrent reservation for the last unit; timeout/release; idempotent commit.
- **Payment**: verified webhook signature; duplicate/out-of-order webhook; refunds and retries.
- **Order**: server-owned total/pricing; state transitions; Saga compensation and repeated requests.
- **Promotion/Customer**: concurrent hold and redemption/loyalty consistency.
- **Identity**: token validity, reset single-use, authorization and rate limits.
- **Notification**: duplicate events, retry, delivery failure isolation.

## Current Phase 1 evidence (local owner-provided)

- `npm run check` PASS, 9/9 Node static tests, 9/9 runtime HTTP process smoke.
- V2 Docker image build PASS; eight V2 domain health endpoints PASS from inside containers; API Gateway Nest process started and container healthy.
- RabbitMQ and Redis V2 PASS; V1 Gateway, products, search, frontend, admin PASS; original V1 Elasticsearch count 85.
- **Pending narrow checks**: host-to-container Gateway V2 HTTP had `curl: (52) Empty reply from server`, and first V2 Postgres query returned no database names immediately after container creation.
- **Security debt**: npm audit reported 5 production dependency advisories (3 high, 2 moderate) and 14 total (12 high, 2 moderate). Remediate or explicitly accept before exposing V2 publicly; do not run automatic forced breaking upgrades.
- Mac disk at time of verification: about 46 GiB available. Git branch clean at `699aeaa` in the supplied terminal output.

## Data policy

Per owner direction, the original GitHub `main` SQL file is the development seed. No repeated database dump/restore checks while there is no new valuable data to protect. Never restore the seed destructively onto running V1. Reassess when valuable new data exists.

## Definition of done

Scope-specific tests pass, affected integration points pass, CI status is recorded, and material open blockers are listed. Previously green unrelated checks remain accepted. The Phase 1 gateway-host HTTP and seven-V2-DB checks above require resolution once; they are **not** recurring gates for unrelated later phases.
