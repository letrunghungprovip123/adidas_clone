#!/usr/bin/env bash
set -euo pipefail

# One-command Phase 0 verification for a Docker-capable host.
# Safe by design:
# - never runs `docker compose down`
# - never removes volumes
# - runtime smoke checks are read-only
# - restore verification uses a temporary database and drops it afterwards
# - backups go to an ignored local directory

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-backups/phase0}"
POSTGRES_DB="${POSTGRES_DB:-mydb}"
PHASE0_SKIP_BUILD="${PHASE0_SKIP_BUILD:-0}"
PHASE0_SKIP_BACKUP="${PHASE0_SKIP_BACKUP:-0}"
PHASE0_SKIP_SMOKE="${PHASE0_SKIP_SMOKE:-0}"
PHASE0_ALLOW_DIRTY="${PHASE0_ALLOW_DIRTY:-0}"

required_commands=(git docker curl grep sort head)
required_runtime_files=(
  "AdidasCloneBackEnd/api_gateway/.env"
  "AdidasCloneBackEnd/service/user_service/.env"
  "AdidasCloneBackEnd/service/product_service/.env"
  "AdidasCloneBackEnd/service/order_service/.env"
  "AdidasCloneBackEnd/service/user_service/firebase-admin-key.json"
)

on_error() {
  local exit_code=$?
  echo >&2
  echo "[phase0] FAILED (exit ${exit_code}). Current Compose state:" >&2
  docker compose -f "$COMPOSE_FILE" ps >&2 2>/dev/null || true
  echo "[phase0] Recent application logs:" >&2
  docker compose -f "$COMPOSE_FILE" logs --tail=80 \
    api_gateway user_service product_service order_service >&2 2>/dev/null || true
  exit "$exit_code"
}
trap on_error ERR

for command_name in "${required_commands[@]}"; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "[phase0] ERROR: required command is missing: ${command_name}" >&2
    exit 127
  fi
done

if ! command -v sha256sum >/dev/null 2>&1 && ! command -v shasum >/dev/null 2>&1; then
  echo "[phase0] ERROR: either sha256sum (Linux) or shasum (macOS) is required." >&2
  exit 127
fi

if ! docker info >/dev/null 2>&1; then
  echo "[phase0] ERROR: Docker CLI exists but the Docker daemon is not reachable." >&2
  exit 1
fi

if [[ "$PHASE0_ALLOW_DIRTY" != "1" ]] && ! git diff --quiet --ignore-submodules --; then
  echo "[phase0] ERROR: working tree has unstaged changes." >&2
  echo "[phase0] Commit/stash them first, or set PHASE0_ALLOW_DIRTY=1 intentionally." >&2
  exit 1
fi
if [[ "$PHASE0_ALLOW_DIRTY" != "1" ]] && ! git diff --cached --quiet --ignore-submodules --; then
  echo "[phase0] ERROR: working tree has staged but uncommitted changes." >&2
  echo "[phase0] Commit/stash them first, or set PHASE0_ALLOW_DIRTY=1 intentionally." >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
CURRENT_SHA="$(git rev-parse HEAD)"
echo "[phase0] Branch: ${CURRENT_BRANCH}"
echo "[phase0] Git SHA: ${CURRENT_SHA}"

missing_runtime_files=0
for file_path in "${required_runtime_files[@]}"; do
  if [[ ! -f "$file_path" ]]; then
    echo "[phase0] MISSING runtime file: ${file_path}" >&2
    missing_runtime_files=1
  fi
done
if [[ "$missing_runtime_files" -ne 0 ]]; then
  echo "[phase0] ERROR: runtime secrets/env files are missing." >&2
  echo "[phase0] These files are intentionally not committed. Create/inject them using the existing local/Jenkins secret process." >&2
  exit 1
fi

echo "[phase0] Step 1/6 - Validate repository and Compose baseline..."
PHASE0_BUILD=0 PHASE0_START=0 COMPOSE_FILE="$COMPOSE_FILE" \
  bash scripts/phase0/verify-v1-baseline.sh

if [[ "$PHASE0_SKIP_BUILD" == "1" ]]; then
  echo "[phase0] Step 2/6 - Docker build skipped by PHASE0_SKIP_BUILD=1."
else
  echo "[phase0] Step 2/6 - Build all V1 Docker images..."
  docker compose -f "$COMPOSE_FILE" build
fi

echo "[phase0] Step 3/6 - Start/update V1 application stack without tearing it down..."
# IMPORTANT: Explicitly exclude es_restorer. Legacy es_restorer untars a backup
# directly into Elasticsearch's live data volume and must never auto-run in a
# non-destructive baseline check.
V1_RUNTIME_SERVICES=(
  postgres rabbitmq elasticsearch kibana
  user_service product_service order_service api_gateway
  frontend admin
)
docker compose -f "$COMPOSE_FILE" up -d "${V1_RUNTIME_SERVICES[@]}"

echo "[phase0] Compose state after start:"
docker compose -f "$COMPOSE_FILE" ps

if [[ "$PHASE0_SKIP_SMOKE" == "1" ]]; then
  echo "[phase0] Step 4/6 - Read-only smoke checks skipped by PHASE0_SKIP_SMOKE=1."
else
  echo "[phase0] Step 4/6 - Run read-only runtime smoke checks..."
  COMPOSE_FILE="$COMPOSE_FILE" bash scripts/phase0/smoke-v1-readonly.sh
fi

if [[ "$PHASE0_SKIP_BACKUP" == "1" ]]; then
  echo "[phase0] Step 5/6 - PostgreSQL backup skipped by PHASE0_SKIP_BACKUP=1."
  echo "[phase0] Step 6/6 - Restore verification skipped because no backup was created."
else
  echo "[phase0] Step 5/6 - Create PostgreSQL baseline backup..."
  COMPOSE_FILE="$COMPOSE_FILE" BACKUP_DIR="$BACKUP_DIR" POSTGRES_DB="$POSTGRES_DB" \
    bash scripts/phase0/backup-postgres.sh

  LATEST_BACKUP="$(ls -1t "$BACKUP_DIR"/"${POSTGRES_DB}"-*.dump 2>/dev/null | head -n 1 || true)"
  if [[ -z "$LATEST_BACKUP" || ! -s "$LATEST_BACKUP" ]]; then
    echo "[phase0] ERROR: could not locate the backup created in ${BACKUP_DIR}." >&2
    exit 1
  fi

  echo "[phase0] Step 6/6 - Restore backup into a temporary verification DB..."
  COMPOSE_FILE="$COMPOSE_FILE" POSTGRES_DB="$POSTGRES_DB" \
    bash scripts/phase0/verify-postgres-restore.sh "$LATEST_BACKUP"
fi

echo
echo "[phase0] ============================================================"
echo "[phase0] Phase 0 automated verification PASSED."
echo "[phase0] Git SHA: ${CURRENT_SHA}"
echo "[phase0] Stack was intentionally left running for inspection."
echo "[phase0] No volumes/databases were removed."
echo "[phase0] ============================================================"
