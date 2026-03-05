#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# RLAPP — Script de levantamiento completo del stack
# Uso: ./scripts/start_stack.sh [--no-build | --clean]
#
# Opciones:
#   --no-build  Reutilizar imagenes existentes (sin reconstruir)
#   --clean     Eliminar contenedores, volumenes e imagenes antes de iniciar
# ==============================================================================

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

DO_BUILD=true
DO_CLEAN=false

for arg in "$@"; do
  case $arg in
    --no-build) DO_BUILD=false ;;
    --clean)    DO_CLEAN=true ;;
  esac
done

echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  RLAPP — Levantamiento del stack completo${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Limpieza opcional
if $DO_CLEAN; then
  echo -e "${YELLOW}[CLEAN] Eliminando contenedores, volumenes y orphans...${NC}"
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
  docker system prune -f > /dev/null 2>&1 || true
  echo -e "${GREEN}[CLEAN] Limpieza completada${NC}"
  echo ""
fi

# Build e inicio
if $DO_BUILD; then
  echo -e "${YELLOW}[BUILD] Reconstruyendo e iniciando contenedores...${NC}"
  docker compose -f "$COMPOSE_FILE" up -d --build
else
  echo -e "${YELLOW}[START] Iniciando contenedores (sin rebuild)...${NC}"
  docker compose -f "$COMPOSE_FILE" up -d
fi

echo ""
echo -e "${YELLOW}[WAIT] Esperando servicios criticos...${NC}"

wait_for() {
  local name=$1
  shift
  local cmd=("$@")
  local timeout_seconds=${TIMEOUT_SECONDS:-180}
  local interval_seconds=${INTERVAL_SECONDS:-5}
  echo -n "  - $name... "
  for ((i=0;i<timeout_seconds;i+=interval_seconds)); do
    if "${cmd[@]}" >/dev/null 2>&1; then
      echo -e "${GREEN}OK${NC}"
      return 0
    fi
    echo -n "."
    sleep $interval_seconds
  done
  echo -e "${RED}FAIL${NC}"
  return 1
}

TIMEOUT_SECONDS=180
INTERVAL_SECONDS=5

wait_for "PostgreSQL"      docker exec rlapp-postgres pg_isready -U rlapp || exit 1
wait_for "RabbitMQ"        curl -fsS http://localhost:15672/                || exit 1
wait_for "API (health)"    curl -fsS http://localhost:5000/health/live      || exit 1
wait_for "Prometheus"      curl -fsS http://localhost:9090/-/healthy        || exit 1
wait_for "Grafana"         curl -fsS http://localhost:3002/api/health       || exit 1
wait_for "Frontend"        curl -fsS http://localhost:3001/                 || exit 1

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  Stack levantado correctamente${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${CYAN}Servicios disponibles:${NC}"
echo ""
echo "  Aplicacion:"
echo "    Frontend (Next.js):    http://localhost:3001"
echo "    API REST:              http://localhost:5000"
echo ""
echo "  Documentacion API:"
echo "    Scalar UI (interactiva): http://localhost:5000/scalar/v1"
echo "    OpenAPI JSON:            http://localhost:5000/openapi/v1.json"
echo ""
echo "  Observabilidad:"
echo "    Grafana (dashboards):  http://localhost:3002  (admin / admin123)"
echo "    Prometheus (metricas): http://localhost:9090"
echo "    Seq (logs):            http://localhost:5341  (admin123)"
echo ""
echo "  Infraestructura:"
echo "    PostgreSQL:            localhost:5432  (rlapp / rlapp_secure_password)"
echo "    RabbitMQ Management:   http://localhost:15672  (guest / guest)"
echo "    PgAdmin:               http://localhost:5050  (admin@rlapp.com / admin123)"
echo ""
echo "  Health Checks:"
echo "    Liveness:  http://localhost:5000/health/live"
echo "    Readiness: http://localhost:5000/health/ready"
echo ""
echo "  Endpoints API (Comandos):"
echo "    POST /api/waiting-room/check-in"
echo "    POST /api/reception/register"
echo "    POST /api/cashier/call-next"
echo "    POST /api/cashier/validate-payment"
echo "    POST /api/cashier/mark-payment-pending"
echo "    POST /api/cashier/mark-absent"
echo "    POST /api/cashier/cancel-payment"
echo "    POST /api/medical/call-next"
echo "    POST /api/medical/consulting-room/activate"
echo "    POST /api/medical/consulting-room/deactivate"
echo "    POST /api/medical/start-consultation"
echo "    POST /api/medical/finish-consultation"
echo "    POST /api/medical/mark-absent"
echo "    POST /api/waiting-room/claim-next"
echo "    POST /api/waiting-room/call-patient"
echo "    POST /api/waiting-room/complete-attention"
echo ""
echo "  Endpoints API (Consultas):"
echo "    GET  /api/v1/waiting-room/{queueId}/monitor"
echo "    GET  /api/v1/waiting-room/{queueId}/queue-state"
echo "    GET  /api/v1/waiting-room/{queueId}/next-turn"
echo "    GET  /api/v1/waiting-room/{queueId}/recent-history"
echo "    POST /api/v1/waiting-room/{queueId}/rebuild"
echo ""

exit 0
