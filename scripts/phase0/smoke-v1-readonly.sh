#!/usr/bin/env bash
set -euo pipefail

# Read-only runtime smoke checks for the legacy V1 stack.
# These checks intentionally avoid register/order/admin mutations so they are safe
# to run against an existing development dataset.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3001}"
ADMIN_URL="${ADMIN_URL:-http://127.0.0.1:3002}"
ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://127.0.0.1:9200}"
WAIT_SECONDS="${WAIT_SECONDS:-120}"
SLEEP_SECONDS="${SLEEP_SECONDS:-3}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[phase0] ERROR: required command not found: $1" >&2
    exit 127
  fi
}

require_command docker
require_command curl

wait_http() {
  local name="$1"
  local url="$2"
  local deadline=$((SECONDS + WAIT_SECONDS))

  echo "[phase0] Waiting for ${name}: ${url}"
  while (( SECONDS < deadline )); do
    if curl --silent --show-error --fail --max-time 5 "$url" >/dev/null 2>&1; then
      echo "[phase0] OK: ${name}"
      return 0
    fi
    sleep "$SLEEP_SECONDS"
  done

  echo "[phase0] ERROR: ${name} did not become reachable within ${WAIT_SECONDS}s: ${url}" >&2
  return 1
}

echo "[phase0] Checking PostgreSQL readiness..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-mydb}" >/dev/null
echo "[phase0] OK: PostgreSQL"

echo "[phase0] Checking RabbitMQ broker..."
docker compose -f "$COMPOSE_FILE" exec -T rabbitmq rabbitmq-diagnostics -q ping >/dev/null
echo "[phase0] OK: RabbitMQ"

wait_http "Elasticsearch" "${ELASTICSEARCH_URL}/_cluster/health"
wait_http "API Gateway root" "${GATEWAY_URL}/"

# GET /products crosses Gateway -> RabbitMQ -> Product Service -> PostgreSQL,
# making it a useful non-mutating integration smoke check.
echo "[phase0] Checking Gateway -> Product Service integration..."
PRODUCTS_BODY="$(mktemp)"
trap 'rm -f "$PRODUCTS_BODY"' EXIT
HTTP_CODE="$(curl --silent --show-error --max-time 15 \
  --output "$PRODUCTS_BODY" --write-out '%{http_code}' "${GATEWAY_URL}/products")"
if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "[phase0] ERROR: GET /products returned HTTP ${HTTP_CODE}" >&2
  cat "$PRODUCTS_BODY" >&2 || true
  exit 1
fi
if [[ ! -s "$PRODUCTS_BODY" ]]; then
  echo "[phase0] ERROR: GET /products returned an empty response body." >&2
  exit 1
fi
echo "[phase0] OK: GET /products (HTTP ${HTTP_CODE})"

wait_http "Customer frontend" "${FRONTEND_URL}/"
wait_http "Admin frontend" "${ADMIN_URL}/"

echo "[phase0] Read-only V1 runtime smoke checks passed."
