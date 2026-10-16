#!/usr/bin/env bash
set -euo pipefail

# Phase 0 baseline PostgreSQL backup.
# Run from the repository root on a host that can execute this project's Docker Compose stack.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-mydb}"
BACKUP_DIR="${BACKUP_DIR:-backups/phase0}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
GIT_SHA="$(git rev-parse HEAD 2>/dev/null || printf 'unknown')"
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}-${TIMESTAMP}.dump"
META_FILE="${BACKUP_FILE}.meta"

mkdir -p "${BACKUP_DIR}"

echo "[phase0] Validating Docker Compose configuration..."
docker compose -f "${COMPOSE_FILE}" config >/dev/null

echo "[phase0] Verifying PostgreSQL service is running..."
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null

echo "[phase0] Creating PostgreSQL custom-format backup: ${BACKUP_FILE}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_dump \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --format=custom \
    --no-owner \
    --no-privileges \
  > "${BACKUP_FILE}"

if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "[phase0] ERROR: backup file is empty." >&2
  exit 1
fi

SHA256="$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')"
SIZE_BYTES="$(wc -c < "${BACKUP_FILE}" | tr -d ' ')"

cat > "${META_FILE}" <<EOF
created_at_utc=${TIMESTAMP}
git_sha=${GIT_SHA}
compose_file=${COMPOSE_FILE}
postgres_service=${POSTGRES_SERVICE}
postgres_user=${POSTGRES_USER}
postgres_db=${POSTGRES_DB}
backup_file=${BACKUP_FILE}
size_bytes=${SIZE_BYTES}
sha256=${SHA256}
EOF

echo "[phase0] Backup created successfully."
echo "[phase0] SHA256: ${SHA256}"
echo "[phase0] Metadata: ${META_FILE}"
echo "[phase0] Next: run scripts/phase0/verify-postgres-restore.sh '${BACKUP_FILE}'"
