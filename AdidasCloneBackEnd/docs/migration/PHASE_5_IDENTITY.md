# Phase 5 — Identity Service V2

## Scope and ownership

Phase 5 activates the Identity domain on the existing continuous branch `refactor/v2-phase1-foundation`. It is additive. The V1 User/Auth service, V1 API Gateway, frontend code, live V1 PostgreSQL database `mydb`, V1 Elasticsearch and V1 Docker volumes stay untouched. No public traffic cutover is performed in this phase.

Identity owns email/password credentials, account state and roles, short-lived access tokens, refresh-token sessions, one-time password-reset/email-verification challenges, login throttling, and security audit events. Customer continues to own profile, shipping addresses, wishlist and loyalty. Identity provisions the matching Customer profile only by the versioned RabbitMQ `customer.profile.ensure.v1` command; it never connects to or queries `customer_db`. The Gateway receives public keys, never Identity's RS256 private key.

## Business behavior

- Registration normalizes email and creates a `CUSTOMER` account only. The DTO rejects role/status overposting. Passwords use salted Node `scrypt` (N=32768, r=8, p=1); plaintext passwords are never persisted.
- Access tokens are RS256 JWTs (15-minute default) with issuer, audience, expiry, key ID, subject, role claims, token version and verification/provisioning state. The service publishes a read-only JWKS endpoint at `/.well-known/jwks.json`; verification fixes the algorithm to RS256 and checks signature, issuer, audience and lifetime.
- Refresh tokens are opaque random values; the database stores only SHA-256 hashes. Each refresh rotates the token within its family. Reuse of a rotated/revoked token revokes the entire family. Logout revokes that token family. Password reset increments the account token version and revokes all refresh sessions.
- Email-verification and password-reset challenges are cryptographically random, stored as hashes, time-bounded, and single-use. Reset requests return the same public message whether the address exists. Password reset invalidates current refresh sessions. The outbox publishes durable versioned events with RabbitMQ confirms and redacts the raw token from PostgreSQL after broker confirmation.
- Invalid password attempts are keyed by a hash of normalized email plus caller IP; five failures within a 15-minute window trigger a 15-minute lockout. Logs and audit metadata never contain passwords, access/refresh tokens, raw challenge values or raw IP addresses. Audit stores a hashed IP and minimal event metadata.
- Identity DB operations use transactions and timeouts. Readiness checks the dedicated Identity database. Customer-profile provisioning is retryable and marked `PENDING` until the Customer command is acknowledged; an unavailable Customer does not cause Identity to connect to its database.
- The `notification.identity-events.q` queue durably receives email-verification and password-reset events for the later Notification phase. This phase defines the outbox/event contract but does not claim that actual email delivery is live.
- Social/Firebase sign-in, admin management endpoints, Gateway business routing, and V1 login cutover are intentionally not enabled here. External identity-provider trust configuration and public/Gateway cutover require their own verified integration and credentials; no unverified social token is accepted as identity.

## Legacy seed policy

Only the checked-in `init-postgres/nike_shop.sql` development seed is read; the importer never contacts the live V1 database. It preserves the 19 legacy numeric IDs and normalized email addresses, role flags and email-verification flags. Original password strings such as `hashed_password_3` are seed placeholders, not usable password hashes. Therefore the importer always writes `password_hash=NULL` and `password_reset_required=true`, does not import OTPs/reset codes/social credentials, and never logs the seed PII. Imported users must complete a new password-reset flow before login. Stable IDs keep Identity-to-Customer references aligned with Phase 4.

Seed operations are idempotent by numeric account ID and refuse to silently reconcile an ID to a different email. The generated Identity sequence is advanced beyond imported IDs. Import is permitted only when `V2_IDENTITY_DB_NAME=identity_db`.

## Definition of done and focused CI

The V2 CI workflow applies the migration to isolated PostgreSQL 16, runs the checked-seed reconciliation, and runs the Identity integration suite against real PostgreSQL and RabbitMQ. The suite verifies DTO allowlists, RS256 signature/JWKS, account-to-Customer provisioning, one-time email verification and password reset, refresh rotation and replay-family revocation, logout revocation, password replacement, hashed outbox-token redaction and login rate limiting. The existing Inventory, Catalog and Customer gates remain as established evidence; no destructive database or volume action is added.

## Mac deployment — isolated V2 only

Run from `AdidasCloneBackEnd` on the current V2 branch. These steps do not start Identity until after the migration and seed are ready.

```zsh
set -e
git pull --ff-only origin refactor/v2-phase1-foundation

# Keep the broker token local and ensure it is at least 32 random characters.
if ! grep -Eq '^V2_CUSTOMER_INTERNAL_TOKEN=.{32,}$' infra/docker/.env.local; then
  TOKEN="$(openssl rand -hex 32)"
  if grep -q '^V2_CUSTOMER_INTERNAL_TOKEN=' infra/docker/.env.local; then
    sed -i '' "s/^V2_CUSTOMER_INTERNAL_TOKEN=.*/V2_CUSTOMER_INTERNAL_TOKEN=$TOKEN/" infra/docker/.env.local
  else
    printf 'V2_CUSTOMER_INTERNAL_TOKEN=%s\n' "$TOKEN" >> infra/docker/.env.local
  fi
fi

# Generate one matching RSA key pair only if both local Identity keys are absent.
# Never commit infra/docker/.env.local or these private-key values.
if ! grep -q '^V2_IDENTITY_JWT_PRIVATE_KEY_B64=.' infra/docker/.env.local ||
   ! grep -q '^V2_IDENTITY_JWT_PUBLIC_KEY_B64=.' infra/docker/.env.local; then
  KEY_DIR="$(mktemp -d)"
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$KEY_DIR/private.pem"
  openssl pkey -in "$KEY_DIR/private.pem" -pubout -out "$KEY_DIR/public.pem"
  printf 'V2_IDENTITY_JWT_PRIVATE_KEY_B64=%s\n' "$(base64 < "$KEY_DIR/private.pem" | tr -d '\n')" >> infra/docker/.env.local
  printf 'V2_IDENTITY_JWT_PUBLIC_KEY_B64=%s\n' "$(base64 < "$KEY_DIR/public.pem" | tr -d '\n')" >> infra/docker/.env.local
  rm -rf "$KEY_DIR"
fi

DC=(docker compose --env-file infra/docker/.env.local -f infra/docker/docker-compose.v2.yml)
"${DC[@]}" config --quiet
"${DC[@]}" up -d --wait postgres rabbitmq

# Keep PostgreSQL private: run the checked-in additive migration inside the V2 DB container.
"${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U v2_local -d identity_db < apps/identity-service/migrations/001_identity.sql

# Validate the checked-in fixture, then apply safe seed SQL through the same private container.
npm run seed:identity:check
npm run seed:identity:sql | "${DC[@]}" exec -T postgres psql -q -v ON_ERROR_STOP=1 -U v2_local -d identity_db

# Build/start only the changed service and its existing Customer dependency.
"${DC[@]}" up -d --build --no-deps identity-service customer-service
"${DC[@]}" ps identity-service customer-service
"${DC[@]}" exec -T identity-service node -e 'fetch("http://127.0.0.1:4101/health/ready").then(r=>{console.log("Identity HTTP",r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})'
"${DC[@]}" exec -T customer-service node -e 'fetch("http://127.0.0.1:4102/health/ready").then(r=>{console.log("Customer HTTP",r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})'
"${DC[@]}" exec -T postgres psql -U v2_local -d identity_db -Atc "SELECT (SELECT count(*) FROM identity_accounts),(SELECT count(*) FROM identity_accounts WHERE password_hash IS NULL AND password_reset_required),(SELECT count(*) FROM identity_outbox WHERE published_at IS NULL);"
```

Expected seed baseline starts with `19` legacy accounts and every imported account has a null password hash plus reset required. `Identity HTTP 200` means the Identity migration exists and the dedicated database is reachable. New test/dev registrations may increase row counts. The public JWKS endpoint contains only the public RSA key. Test-token exposure must remain false in `infra/docker/.env.local`.

Do not run `docker compose down -v`, prune volumes, restore V1 seed over a running DB, or point Identity at `mydb`. Do not start Elasticsearch or all nine apps solely for this phase.

## Remaining production/cutover gates

- Actual SMTP delivery and email templates depend on the Notification service consuming the durable identity-event queue; this phase confirms event persistence/publication only.
- Replace the shared V2 development Customer internal token with separate least-privilege service credentials and enforce broker ACLs before production.
- Gateway signature/issuer/audience/role validation and public route mapping must be implemented and tested before frontends can use V2 Identity. Keep V1 auth routing as-is until an explicit cutover plan passes.
- Set per-environment RSA keys via a secret manager; private key must be mounted only into Identity. Do not set `V2_IDENTITY_EXPOSE_TEST_TOKENS=true` in production.
- Configure and test Firebase/social provider verification, account-linking rules, email sender verification, password recovery delivery and account enumeration/rate controls before enabling those methods.
- Production load/SLO, key rotation across overlapping key IDs, retention/anonymization policy, incident response and independent security review remain release gates. Phase 5 is not a claim of production certification.
