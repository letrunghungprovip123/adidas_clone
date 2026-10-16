#!/usr/bin/env bash
set -euo pipefail

# Non-destructive Phase 0 verification helper.
# By default this validates Compose and repository structure only.
# Set PHASE0_BUILD=1 to build images.
# Set PHASE0_START=1 to start the V1 stack (without running `down`).

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
PHASE0_BUILD="${PHASE0_BUILD:-0}"
PHASE0_START="${PHASE0_START:-0}"

EXPECTED_SERVICES=(
  postgres
  rabbitmq
  elasticsearch
  kibana
  api_gateway
  order_service
  product_service
  user_service
  frontend
  admin
)

echo "[phase0] Git HEAD: $(git rev-parse HEAD)"
echo "[phase0] Validating Docker Compose syntax..."
docker compose -f "${COMPOSE_FILE}" config >/dev/null

mapfile -t ACTUAL_SERVICES < <(docker compose -f "${COMPOSE_FILE}" config --services)

for expected in "${EXPECTED_SERVICES[@]}"; do
  found=0
  for actual in "${ACTUAL_SERVICES[@]}"; do
    if [[ "${actual}" == "${expected}" ]]; then
      found=1
      break
    fi
  done
  if [[ "${found}" -ne 1 ]]; then
    echo "[phase0] ERROR: expected Compose service is missing: ${expected}" >&2
    exit 1
  fi
done

echo "[phase0] Compose contains all expected V1 services."

required_paths=(
  "AdidasCloneBackEnd/api_gateway"
  "AdidasCloneBackEnd/service/user_service"
  "AdidasCloneBackEnd/service/product_service"
  "AdidasCloneBackEnd/service/order_service"
  "AdidasCloneFrontEnd"
  "Admin_Template"
  "Jenkinsfile"
  "docker-compose.yml"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "${path}" ]]; then
    echo "[phase0] ERROR: required V1 path is missing: ${path}" >&2
    exit 1
  fi
done

echo "[phase0] Required V1 repository structure is present."

if [[ "${PHASE0_BUILD}" == "1" ]]; then
  echo "[phase0] Building V1 Docker images..."
  docker compose -f "${COMPOSE_FILE}" build
fi

if [[ "${PHASE0_START}" == "1" ]]; then
  echo "[phase0] Starting V1 stack without tearing down existing resources..."
  docker compose -f "${COMPOSE_FILE}" up -d

  echo "[phase0] Running services:"
  docker compose -f "${COMPOSE_FILE}" ps

  mapfile -t RUNNING_SERVICES < <(docker compose -f "${COMPOSE_FILE}" ps --services --status running)
  for expected in "${EXPECTED_SERVICES[@]}"; do
    found=0
    for running in "${RUNNING_SERVICES[@]}"; do
      if [[ "${running}" == "${expected}" ]]; then
        found=1
        break
      fi
    done
    if [[ "${found}" -ne 1 ]]; then
      echo "[phase0] ERROR: service did not reach running state: ${expected}" >&2
      exit 1
    fi
  done

  echo "[phase0] All expected V1 services are in Docker running state."
  echo "[phase0] NOTE: V1 does not yet expose standardized readiness endpoints; functional smoke tests are still required."
fi

echo "[phase0] Baseline repository/Compose verification passed."
