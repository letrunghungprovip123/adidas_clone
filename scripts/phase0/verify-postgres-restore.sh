#!/usr/bin/env bash
set -euo pipefail

# Restores a Phase 0 custom-format dump into a temporary database in the existing
# PostgreSQL container, verifies the restore, and then drops the temporary DB.
# This does NOT overwrite the current mydb database.

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup.dump>" >&2
  exit 64
fi

BACKUP_FILE="$1"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
SOURCE_DB="${POSTGRES_DB:-mydb}"
VERIFY_DB="phase0_restore_verify_$(date -u +%Y%m%d%H%M%S)_$$"

if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "[phase0] ERROR: backup file is missing or empty: ${BACKUP_FILE}" >&2
  exit 1
fi

cleanup() {
  echo "[phase0] Cleaning temporary verification database: ${VERIFY_DB}"
  docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
    psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${VERIFY_DB}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true
  docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
    dropdb -U "${POSTGRES_USER}" --if-exists "${VERIFY_DB}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[phase0] Validating Docker Compose configuration..."
docker compose -f "${COMPOSE_FILE}" config >/dev/null

echo "[phase0] Checking dump archive structure..."
cat "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore --list >/dev/null

echo "[phase0] Creating temporary database: ${VERIFY_DB}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  createdb -U "${POSTGRES_USER}" "${VERIFY_DB}"

echo "[phase0] Restoring backup into temporary database..."
cat "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore \
    -U "${POSTGRES_USER}" \
    -d "${VERIFY_DB}" \
    --no-owner \
    --no-privileges \
    --exit-on-error

echo "[phase0] Verifying restored database is queryable..."
TABLE_COUNT="$(docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d "${VERIFY_DB}" -At -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" \
  | tr -d '\r')"

if [[ -z "${TABLE_COUNT}" || "${TABLE_COUNT}" == "0" ]]; then
  echo "[phase0] ERROR: restore completed but no public base tables were found." >&2
  exit 1
fi

# Verify Prisma migration metadata if it exists, but do not require it for legacy dumps.
PRISMA_TABLE="$(docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d "${VERIFY_DB}" -At -v ON_ERROR_STOP=1 \
  -c "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" | tr -d '\r')"

echo "[phase0] Restore verification passed."
echo "[phase0] Source DB: ${SOURCE_DB}"
echo "[phase0] Temporary DB: ${VERIFY_DB}"
echo "[phase0] Public table count: ${TABLE_COUNT}"
echo "[phase0] Prisma migration table present: ${PRISMA_TABLE}"
