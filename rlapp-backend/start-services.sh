#!/usr/bin/env bash
# =============================================================================
# RLAPP Backend — Inicio de servicios
# Uso:
#   ./start-services.sh              → Solo infraestructura Docker (por defecto)
#   ./start-services.sh --local      → Infra Docker + servicios .NET locales
#   ./start-services.sh --docker     → Stack completo en Docker (API + Worker + Frontend)
#   ./start-services.sh --no-build   → Sin rebuild de imagenes Docker
# =============================================================================
set -euo pipefail

# --- Rutas ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
REPO_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
SRCS="$PROJECT_ROOT/src/Services/WaitingRoom"
PID_FILE="/tmp/rlapp-local-pids"

# --- Colores ---------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Argumentos ------------------------------------------------------------
MODE="infra"          # infra | local | docker
DO_BUILD=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local)    MODE="local";    shift ;;
    --docker)   MODE="docker";   shift ;;
    --infra)    MODE="infra";    shift ;;
    --no-build) DO_BUILD=false;  shift ;;
    -h|--help)
      echo "Uso: $0 [--infra | --local | --docker] [--no-build]"
      echo ""
      echo "Modos:"
      echo "  --infra    Solo infraestructura Docker (postgres, rabbitmq, etc.) [por defecto]"
      echo "  --local    Infraestructura Docker + servicios .NET ejecutados localmente"
      echo "  --docker   Stack completo en Docker (incluye API, Worker, Frontend)"
      echo ""
      echo "Opciones:"
      echo "  --no-build  Omitir rebuild de imagenes Docker"
      exit 0
      ;;
    *) echo -e "${RED}Argumento desconocido: $1${NC}"; exit 1 ;;
  esac
done

# --- Validaciones previas --------------------------------------------------
if ! command -v docker &>/dev/null; then
  echo -e "${RED}ERROR: Docker no esta instalado o no esta en PATH.${NC}"
  exit 1
fi

if ! docker info &>/dev/null; then
  echo -e "${RED}ERROR: El daemon de Docker no esta corriendo.${NC}"
  echo "  Ejecuta: sudo systemctl start docker"
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo -e "${RED}ERROR: No se encontro docker-compose.yml en $COMPOSE_FILE${NC}"
  exit 1
fi

echo ""
echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}  RLAPP — Inicio de servicios (modo: $MODE)${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""

# --- Funcion: esperar servicio ---------------------------------------------
wait_for() {
  local name="$1"; shift
  local max_attempts="${TIMEOUT_ATTEMPTS:-36}"
  local interval="${INTERVAL_SECONDS:-5}"

  echo -n -e "  ${YELLOW}Esperando $name${NC} "
  for ((i=1; i<=max_attempts; i++)); do
    if "$@" &>/dev/null; then
      echo -e " ${GREEN}OK${NC}"
      return 0
    fi
    echo -n "."
    sleep "$interval"
  done
  echo -e " ${RED}TIMEOUT${NC}"
  return 1
}

# --- Paso 1: Levantar infraestructura Docker --------------------------------
INFRA_SERVICES="postgres rabbitmq prometheus grafana seq pgadmin"

echo -e "${YELLOW}[1/4] Levantando infraestructura Docker...${NC}"

if [[ "$MODE" == "docker" ]]; then
  # Stack completo: infra + api + worker + frontend
  if $DO_BUILD; then
    docker compose -f "$COMPOSE_FILE" up -d --build
  else
    docker compose -f "$COMPOSE_FILE" up -d
  fi
else
  # Solo infraestructura
  if $DO_BUILD; then
    docker compose -f "$COMPOSE_FILE" up -d --build $INFRA_SERVICES
  else
    docker compose -f "$COMPOSE_FILE" up -d $INFRA_SERVICES
  fi
fi

echo -e "  ${GREEN}Contenedores iniciados${NC}"
echo ""

# --- Paso 2: Esperar que la infraestructura este lista ----------------------
echo -e "${YELLOW}[2/4] Verificando salud de servicios...${NC}"

TIMEOUT_ATTEMPTS=36
INTERVAL_SECONDS=5

wait_for "PostgreSQL" docker exec rlapp-postgres pg_isready -U rlapp || {
  echo -e "${RED}ERROR: PostgreSQL no respondio a tiempo.${NC}"
  echo "  Diagnostico: docker logs rlapp-postgres --tail 30"
  exit 1
}

wait_for "RabbitMQ" curl -fsS http://localhost:15672/ || {
  echo -e "${RED}ERROR: RabbitMQ no respondio a tiempo.${NC}"
  echo "  Diagnostico: docker logs rlapp-rabbitmq --tail 30"
  exit 1
}

echo ""

# --- Paso 3: Servicios .NET locales (solo modo --local) ---------------------
if [[ "$MODE" == "local" ]]; then
  echo -e "${YELLOW}[3/4] Iniciando servicios .NET localmente...${NC}"

  # Matar procesos anteriores si existen
  if [[ -f "$PID_FILE" ]]; then
    echo "  Deteniendo instancias anteriores..."
    while IFS= read -r pid; do
      kill "$pid" 2>/dev/null || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    sleep 2
  fi

  # Variables de entorno para conexion local
  export ConnectionStrings__EventStore="Host=localhost;Port=5432;Database=rlapp_waitingroom;Username=rlapp;Password=rlapp_secure_password"
  export RabbitMq__HostName="localhost"
  export RabbitMq__Port="5672"
  export RabbitMq__UserName="guest"
  export RabbitMq__Password="guest"
  export RabbitMq__VirtualHost="/"
  export RabbitMq__ExchangeName="rlapp.events"
  export RabbitMq__ExchangeType="topic"

  # API
  echo "  Iniciando WaitingRoom.API..."
  cd "$SRCS/WaitingRoom.API"
  nohup dotnet run --configuration Release --urls "http://0.0.0.0:5000" \
    > /tmp/rlapp-api.log 2>&1 &
  echo $! >> "$PID_FILE"
  API_PID=$!
  echo "    PID: $API_PID | Log: /tmp/rlapp-api.log"

  sleep 3

  # Worker
  echo "  Iniciando WaitingRoom.Worker..."
  cd "$SRCS/WaitingRoom.Worker"
  nohup dotnet run --configuration Release \
    > /tmp/rlapp-worker.log 2>&1 &
  echo $! >> "$PID_FILE"
  WORKER_PID=$!
  echo "    PID: $WORKER_PID | Log: /tmp/rlapp-worker.log"

  sleep 2

  # Projections
  echo "  Iniciando WaitingRoom.Projections..."
  cd "$SRCS/WaitingRoom.Projections"
  nohup dotnet run --configuration Release \
    > /tmp/rlapp-projections.log 2>&1 &
  echo $! >> "$PID_FILE"
  PROJ_PID=$!
  echo "    PID: $PROJ_PID | Log: /tmp/rlapp-projections.log"

  cd "$PROJECT_ROOT"
  echo ""

  # Esperar a que la API responda
  TIMEOUT_ATTEMPTS=30
  INTERVAL_SECONDS=2
  wait_for "API (health/live)" curl -fsS http://localhost:5000/health/live || {
    echo -e "${RED}WARN: La API no respondio al health check a tiempo.${NC}"
    echo "  Revisa el log: tail -30 /tmp/rlapp-api.log"
  }

  echo ""
elif [[ "$MODE" == "docker" ]]; then
  echo -e "${YELLOW}[3/4] Esperando servicios Docker (API, Worker, Frontend)...${NC}"

  TIMEOUT_ATTEMPTS=60
  INTERVAL_SECONDS=5
  wait_for "API (health/live)" curl -fsS http://localhost:5000/health/live || {
    echo -e "${RED}WARN: La API no respondio al health check a tiempo.${NC}"
    echo "  Diagnostico: docker logs rlapp-api --tail 30"
  }
  wait_for "Frontend" curl -fsS http://localhost:3001/ || {
    echo -e "${RED}WARN: El frontend no respondio a tiempo.${NC}"
    echo "  Diagnostico: docker logs rlapp-frontend --tail 30"
  }
  echo ""
else
  echo -e "${YELLOW}[3/4] Omitido (modo infraestructura solamente)${NC}"
  echo ""
fi

# --- Paso 4: Resumen -------------------------------------------------------
echo -e "${YELLOW}[4/4] Resumen${NC}"
echo ""
echo -e "${GREEN}  Infraestructura Docker:${NC}"
echo "    PostgreSQL:  localhost:5432  (usuario: rlapp)"
echo "    RabbitMQ:    localhost:5672  (admin: http://localhost:15672)"
echo "    Prometheus:  http://localhost:9090"
echo "    Grafana:     http://localhost:3002  (admin/admin123)"
echo "    Seq:         http://localhost:5341"
echo "    PgAdmin:     http://localhost:5050  (admin@rlapp.com/admin123)"

if [[ "$MODE" == "local" ]]; then
  echo ""
  echo -e "${GREEN}  Servicios .NET (locales):${NC}"
  echo "    API:         http://localhost:5000"
  echo "    Worker:      proceso background"
  echo "    Projections: proceso background"
  echo ""
  echo "  Para detener: ./stop-services.sh"
elif [[ "$MODE" == "docker" ]]; then
  echo ""
  echo -e "${GREEN}  Servicios Docker:${NC}"
  echo "    API:         http://localhost:5000"
  echo "    Frontend:    http://localhost:3001"
  echo ""
  echo "  Para detener: ./stop-services.sh --docker"
fi

echo ""
echo -e "${CYAN}=================================================================${NC}"
echo -e "${GREEN}  Stack iniciado correctamente.${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""
