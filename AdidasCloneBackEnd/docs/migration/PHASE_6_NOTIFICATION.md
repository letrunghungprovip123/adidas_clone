# Phase 6 — Event-driven Notification Service

## Scope and ownership

Phase 6 activates the existing V2 Notification service in the continuous branch refactor/v2-phase1-foundation. It is additive. V1 API Gateway, User/Product/Order code, frontends, V1 PostgreSQL mydb, V1 Elasticsearch and all V1 Docker volumes remain untouched. No public checkout/auth cutover is performed.

Notification owns delivery of order-confirmation, password-reset, email-verification and welcome emails; HTML/text templates; SMTP configuration; retry policy; and failed-delivery queues. Email sending lives in Notification, never in API Gateway, Identity or Order. Identity publishes events through its own transactional outbox; Order will publish the order-confirmed event through its own outbox when that phase is implemented.

The accepted architecture retains the seven existing logical PostgreSQL databases. Notification has no separate business database in this phase; delivery is driven by RabbitMQ durable queues and its retry/DLQ topology. No service reads another service's database.

## Event contracts

All notification events use contract version 1 with message_id, correlation_id, occurred_at, actor and a payload. The producer's event topic is also sent as the AMQP message type.

- identity.email-verification.requested.v1: account_id, email, token, expires_at
- identity.password-reset.requested.v1: account_id, email, token, expires_at
- identity.welcome-email.requested.v1: account_id, email
- order.confirmed.v1: order_id, contact_email, currency, total_minor, optional items containing product_name, quantity and line_total_minor

Identity creates welcome and verification events inside the same account-registration transaction. The Identity outbox publishes persistent messages with publisher confirms. Raw challenge tokens are redacted from the Identity outbox after successful publish; Notification never logs the token or email body. Order confirmation requires an event emitted after Order reaches CONFIRMED. Notification never calls Stripe, modifies Order, or queries Order/Identity databases.

## Reliability and delivery behavior

- Consumer queues are isolated: notification.identity-events.q and notification.order-events.q. Both are durable, with manual acknowledgements and prefetch 10.
- Each event type has a dedicated template. Dynamic names and product labels are HTML-escaped. Challenge links use only the configured V2_NOTIFICATION_PUBLIC_WEB_URL; production requires HTTPS. Email verification/reset tokens and expiry are validated before sending.
- SMTP uses Nodemailer. The transport supports implicit TLS (usually port 465) or STARTTLS (usually port 587); production requires authenticated SMTP or implicit TLS and enforces TLS when STARTTLS is used. Connection, greeting and socket timeouts are bounded. SMTP credentials belong only to Notification.
- A message is ACKed only after SMTP accepts it. Transient errors follow durable TTL retry queues at 5 seconds, 30 seconds and 120 seconds. After the initial attempt and three retries, the event is moved to a durable stream-specific DLQ. Invalid/expired challenge events and permanent SMTP failures move directly to the DLQ. Retry and DLQ publishes are confirmed before the original event is ACKed.
- Stable event-derived Message-ID values are maintained across retries, and delivery logs use a one-way event reference rather than email, token or message body.

SMTP and RabbitMQ cannot participate in a single atomic transaction. The transport is therefore at-least-once: a process crash after the SMTP relay accepts an email but before RabbitMQ ACK can still cause redelivery. A stable Message-ID helps downstream mail systems correlate repeats but is not an SMTP-level exactly-once guarantee. Do not describe this phase as guaranteeing exactly-once email. If a strict provider-level idempotency guarantee is later required, choose a mail API with a provider-supported idempotency key or add an explicitly reviewed durable delivery ledger/provider integration.

## Configuration

Copy infra/docker/.env.example to infra/docker/.env.local and replace all placeholders with per-environment values. Never commit .env.local.

- V2_NOTIFICATION_RMQ_ENABLED=false keeps the event consumer disabled until SMTP is configured. Set it to true only after the credentials, sender address and public frontend URL are valid.
- V2_NOTIFICATION_SMTP_HOST, V2_NOTIFICATION_SMTP_PORT, V2_NOTIFICATION_SMTP_SECURE, V2_NOTIFICATION_SMTP_USER and V2_NOTIFICATION_SMTP_PASSWORD configure the relay.
- V2_NOTIFICATION_EMAIL_FROM must be a sender address accepted by the relay.
- V2_NOTIFICATION_PUBLIC_WEB_URL must be the frontend origin that actually implements /verify-email and /reset-password; use HTTPS in production.
- V2_NOTIFICATION_VERIFY_SMTP=true verifies the SMTP configuration during startup. Production always verifies SMTP before consuming events.
- V2_RABBITMQ_HOST_PORT defaults to 5679 and binds only to 127.0.0.1 for local host-side integration testing. The RabbitMQ management UI remains private. Internal containers continue to use port 5672. This does not change any V1 ports or volumes.

Do not enable the live consumer against a placeholder SMTP sender or placeholder URLs. Local compose can still run with the consumer disabled and return a health endpoint indicating the consumer is disabled.

## Definition of done and focused CI

The V2 workflow should execute lint/typecheck/build and the existing Inventory, Catalog, Customer and Identity regressions, then run tests/notification.integration.mjs against the workflow's real RabbitMQ service and a local fake SMTP server. The Notification integration covers:

- identity verification/reset/welcome events and order.confirmed.v1 template selection;
- absolute challenge links, HTML escaping and monetary rendering;
- a transient SMTP 451 followed by one scheduled retry and successful delivery;
- permanent/expired challenge routing to the Notification DLQ;
- readiness behavior and message handling using persistent event envelopes.

Compose configuration validation remains part of CI. No Notification database migration or seed is needed.

## Minimal Mac acceptance — isolated V2

Run from AdidasCloneBackEnd on macOS/zsh. These steps preserve the V2 RabbitMQ volume. They never use down -v and never delete any database or volume.

~~~zsh
git pull --ff-only origin refactor/v2-phase1-foundation

docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml config --quiet
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml up -d --wait rabbitmq

npm ci --ignore-scripts --no-audit
npm run check

export V2_NOTIFICATION_RMQ_HOST=127.0.0.1
V2_NOTIFICATION_RMQ_PORT="$(sed -n 's/^V2_RABBITMQ_HOST_PORT=//p' infra/docker/.env.local | tail -n 1)"
if [[ -z "$V2_NOTIFICATION_RMQ_PORT" ]]; then V2_NOTIFICATION_RMQ_PORT=5679; fi
export V2_NOTIFICATION_RMQ_PORT
export V2_NOTIFICATION_RMQ_USER="$(sed -n 's/^V2_RABBITMQ_USER=//p' infra/docker/.env.local | tail -n 1)"
export V2_NOTIFICATION_RMQ_PASSWORD="$(sed -n 's/^V2_RABBITMQ_PASSWORD=//p' infra/docker/.env.local | tail -n 1)"
npm run test:notification

docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml up -d --build --no-deps notification-service
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml ps notification-service
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml exec -T notification-service node -e 'fetch("http://127.0.0.1:4108/health/ready").then(r=>{console.log("Notification HTTP",r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})'
~~~

If the local .env.local has no V2_RABBITMQ_HOST_PORT entry, Docker Compose uses 5679. The test runs its own SMTP server and does not send real email. It needs the real V2 RabbitMQ account from .env.local, while the Notification container uses the internal hostname rabbitmq and port 5672.

Before enabling the live consumer, set actual SMTP values and the real frontend URL, then set V2_NOTIFICATION_RMQ_ENABLED=true in the ignored .env.local and recreate only the Notification container. Verify logs without printing secrets:

~~~zsh
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml up -d --build --no-deps notification-service
docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml logs --tail=80 notification-service
~~~

Do not run docker compose down -v, prune volumes, restore seed data to V1, or point any V2 service at V1 mydb.

## Known release gates

- Configure real verified sender domains, SPF/DKIM/DMARC and provider rate/abuse limits.
- Actual recipient-facing end-to-end verification/reset depends on frontend routes matching the configured public base URL.
- Review provider idempotency support if the product requires stronger duplicate suppression than SMTP at-least-once delivery.
- Monitor retry/DLQ depth and provide an operationally reviewed DLQ replay workflow before production.
- Add unsubscribe/consent and retention policy for non-transactional messaging before marketing emails. This phase sends only transactional notifications.
- SLO/load tests, secret rotation, SMTP credential rotation and independent production security review remain release gates.
