#!/usr/bin/env bash
set -euo pipefail

# Script mínimo para levantar el stack y esperar por servicios críticos.
# Uso: ./scripts/start_stack.sh [--no-build]

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

DO_BUILD=true
if [ "${1:-}" = "--no-build" ]; then
  DO_BUILD=false
fi

echo "Usando compose: $COMPOSE_FILE"

if $DO_BUILD; then
  echo "Reconstruyendo e iniciando containers (docker compose up -d --build) ..."
  docker compose -f "$COMPOSE_FILE" up -d --build
else
  echo "Iniciando containers (docker compose up -d) ..."
  docker compose -f "$COMPOSE_FILE" up -d
fi

echo "Esperando servicios..."

wait_for() {
  name=$1
  shift
  cmd=("$@")
  timeout_seconds=${TIMEOUT_SECONDS:-180}
  interval_seconds=${INTERVAL_SECONDS:-5}
  echo -n "- Esperando $name... "
  for ((i=0;i<timeout_seconds;i+=interval_seconds)); do
    if "${cmd[@]}" >/dev/null 2>&1; then
      echo "OK"
      return 0
    fi
    echo -n "."
    sleep $interval_seconds
  done
  echo "FAIL"
  return 1
}

# Comprobaciones (desde dentro del host; asume mapeos de puertos como en docker-compose.yml)
TIMEOUT_SECONDS=180
INTERVAL_SECONDS=5

wait_for "Postgres (pg_isready)" docker exec rlapp-postgres pg_isready -U rlapp || exit 1
wait_for "RabbitMQ (health endpoint)" curl -fsS http://localhost:15672/ || exit 1
wait_for "API (health)" curl -fsS http://localhost:5000/health/live || exit 1
wait_for "Frontend (root)" curl -fsS http://localhost:3001/ || exit 1

echo "Todos los servicios respondieron correctamente. Stack listo."

exit 0
