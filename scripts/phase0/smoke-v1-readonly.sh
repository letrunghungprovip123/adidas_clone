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
SEARCH_TERM="${SEARCH_TERM:-adidas}"
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

check_nonempty_2xx() {
  local name="$1"
  local url="$2"
  local body_file
  local http_code
  body_file="$(mktemp)"

  http_code="$(curl --silent --show-error --max-time 20 \
    --output "$body_file" --write-out '%{http_code}' "$url")"

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo "[phase0] ERROR: ${name} returned HTTP ${http_code}" >&2
    cat "$body_file" >&2 || true
    rm -f "$body_file"
    return 1
  fi
  if [[ ! -s "$body_file" ]]; then
    echo "[phase0] ERROR: ${name} returned an empty response body." >&2
    rm -f "$body_file"
    return 1
  fi

  rm -f "$body_file"
  echo "[phase0] OK: ${name} (HTTP ${http_code})"
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

# GET /products crosses Gateway -> RabbitMQ -> Product Service -> PostgreSQL.
check_nonempty_2xx "GET /products" "${GATEWAY_URL}/products"

# GET /products/search crosses Gateway -> RabbitMQ -> Product Service -> Elasticsearch.
# Empty result sets are allowed; only HTTP success + a non-empty serialized response are required.
ENCODED_SEARCH_TERM="$(printf '%s' "$SEARCH_TERM" | sed 's/ /%20/g')"
check_nonempty_2xx "GET /products/search" \
  "${GATEWAY_URL}/products/search?q=${ENCODED_SEARCH_TERM}&page=1&limit=1"

wait_http "Customer frontend" "${FRONTEND_URL}/"
wait_http "Admin frontend" "${ADMIN_URL}/"

echo "[phase0] Read-only V1 runtime smoke checks passed."
