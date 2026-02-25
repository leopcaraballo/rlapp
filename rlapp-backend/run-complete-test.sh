#!/usr/bin/env bash
# =============================================================================
# RLAPP Backend — Ejecucion completa de tests
# Prerrequisito: infraestructura Docker levantada (se verifica automaticamente)
#
# Uso:
#   ./run-complete-test.sh              → Build + tests (usa cache de build)
#   ./run-complete-test.sh --clean      → Limpia bin/obj, rebuild completo + tests
#   ./run-complete-test.sh --unit-only  → Solo tests unitarios (sin Docker)
#   ./run-complete-test.sh --smoke      → Tests + validacion de endpoints HTTP
# =============================================================================
set -euo pipefail

# --- Rutas ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
REPO_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
SOLUTION="$PROJECT_ROOT/RLAPP.slnx"
LOG_DIR="/tmp/rlapp-test"
RESULTS_FILE="$PROJECT_ROOT/test-results.log"

# --- Colores ---------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- Argumentos ------------------------------------------------------------
CLEAN_BUILD=false
UNIT_ONLY=false
SMOKE_TEST=false
CONFIGURATION="Release"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)      CLEAN_BUILD=true; shift ;;
    --unit-only)  UNIT_ONLY=true;   shift ;;
    --smoke)      SMOKE_TEST=true;  shift ;;
    --debug)      CONFIGURATION="Debug"; shift ;;
    -h|--help)
      echo "Uso: $0 [--clean] [--unit-only] [--smoke] [--debug]"
      echo ""
      echo "Opciones:"
      echo "  --clean      Elimina bin/obj y fuerza rebuild completo"
      echo "  --unit-only  Solo tests unitarios (no requiere Docker)"
      echo "  --smoke      Despues de los tests, valida endpoints HTTP"
      echo "  --debug      Compila en modo Debug en vez de Release"
      exit 0
      ;;
    *) echo -e "${RED}Argumento desconocido: $1${NC}"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"

echo ""
echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}  RLAPP Backend — Ejecucion completa de tests${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""

STEP=0
TOTAL_STEPS=4
if $CLEAN_BUILD; then TOTAL_STEPS=$((TOTAL_STEPS + 1)); fi
if $SMOKE_TEST; then TOTAL_STEPS=$((TOTAL_STEPS + 1)); fi

next_step() { STEP=$((STEP + 1)); }

# --- Paso: Verificar prerequisitos ------------------------------------------
next_step
echo -e "${YELLOW}[$STEP/$TOTAL_STEPS] Verificando prerequisitos...${NC}"

if ! command -v dotnet &>/dev/null; then
  echo -e "${RED}ERROR: .NET SDK no esta instalado o no esta en PATH.${NC}"
  exit 1
fi

DOTNET_VERSION=$(dotnet --version 2>/dev/null || echo "desconocido")
echo "  .NET SDK: $DOTNET_VERSION"

if [[ ! -f "$SOLUTION" ]]; then
  echo -e "${RED}ERROR: No se encontro la solucion en $SOLUTION${NC}"
  exit 1
fi
echo -e "  ${GREEN}Prerequisitos verificados${NC}"
echo ""

# --- Paso: Verificar Docker (si no es unit-only) ----------------------------
if ! $UNIT_ONLY; then
  next_step
  echo -e "${YELLOW}[$STEP/$TOTAL_STEPS] Verificando infraestructura Docker...${NC}"

  DOCKER_OK=true

  if ! command -v docker &>/dev/null; then
    echo -e "${RED}ERROR: Docker no esta instalado.${NC}"
    DOCKER_OK=false
  elif ! docker info &>/dev/null; then
    echo -e "${RED}ERROR: El daemon de Docker no esta corriendo.${NC}"
    DOCKER_OK=false
  fi

  if $DOCKER_OK; then
    # Verificar que PostgreSQL esta corriendo
    if docker exec rlapp-postgres pg_isready -U rlapp &>/dev/null; then
      echo -e "  ${GREEN}PostgreSQL: corriendo${NC}"
    else
      echo -e "  ${YELLOW}PostgreSQL no esta corriendo. Levantando infraestructura...${NC}"
      docker compose -f "$COMPOSE_FILE" up -d postgres rabbitmq 2>/dev/null || true
      echo "  Esperando que PostgreSQL este listo..."
      for i in {1..30}; do
        if docker exec rlapp-postgres pg_isready -U rlapp &>/dev/null; then
          echo -e "  ${GREEN}PostgreSQL: listo${NC}"
          break
        fi
        sleep 2
      done
    fi

    # Verificar RabbitMQ
    if curl -fsS http://localhost:15672/ &>/dev/null; then
      echo -e "  ${GREEN}RabbitMQ: corriendo${NC}"
    else
      echo -e "  ${YELLOW}RabbitMQ: esperando...${NC}"
      for i in {1..20}; do
        if curl -fsS http://localhost:15672/ &>/dev/null; then
          echo -e "  ${GREEN}RabbitMQ: listo${NC}"
          break
        fi
        sleep 2
      done
    fi
  else
    echo -e "${RED}No se puede continuar sin Docker. Usa --unit-only para tests sin Docker.${NC}"
    exit 1
  fi
  echo ""
fi

# --- Paso: Limpiar artefactos (solo con --clean) ----------------------------
if $CLEAN_BUILD; then
  next_step
  echo -e "${YELLOW}[$STEP/$TOTAL_STEPS] Limpiando artefactos de compilacion...${NC}"
  find "$PROJECT_ROOT/src" "$PROJECT_ROOT" -maxdepth 5 -type d \( -name "bin" -o -name "obj" \) -exec rm -rf {} + 2>/dev/null || true
  dotnet clean "$SOLUTION" --configuration "$CONFIGURATION" > "$LOG_DIR/clean.log" 2>&1 || true
  echo -e "  ${GREEN}Artefactos limpiados (bin/, obj/)${NC}"
  echo ""
fi

# --- Paso: Build -----------------------------------------------------------
next_step
echo -e "${YELLOW}[$STEP/$TOTAL_STEPS] Compilando solucion ($CONFIGURATION)...${NC}"

cd "$PROJECT_ROOT"
if dotnet build "$SOLUTION" --configuration "$CONFIGURATION" > "$LOG_DIR/build.log" 2>&1; then
  echo -e "  ${GREEN}Compilacion exitosa${NC}"
else
  echo -e "  ${RED}ERROR: La compilacion fallo.${NC}"
  echo ""
  echo "  Ultimas 30 lineas del log:"
  tail -30 "$LOG_DIR/build.log"
  exit 1
fi
echo ""

# --- Paso: Tests ------------------------------------------------------------
next_step
echo -e "${YELLOW}[$STEP/$TOTAL_STEPS] Ejecutando tests...${NC}"

cd "$PROJECT_ROOT"

# Configurar variables de entorno para tests de integracion
if ! $UNIT_ONLY; then
  export ConnectionStrings__EventStore="Host=localhost;Port=5432;Database=rlapp_waitingroom_test;Username=rlapp;Password=rlapp_secure_password"
  export RabbitMq__HostName="localhost"
  export RabbitMq__Port="5672"
  export RabbitMq__UserName="guest"
  export RabbitMq__Password="guest"
fi

TEST_ARGS="--configuration $CONFIGURATION --no-build --verbosity normal"
if $UNIT_ONLY; then
  TEST_ARGS="$TEST_ARGS --filter \"Category!=Integration\""
fi

if eval dotnet test "$SOLUTION" $TEST_ARGS 2>&1 | tee "$LOG_DIR/tests.log"; then
  echo ""
  echo -e "  ${GREEN}Todos los tests pasaron${NC}"
  TEST_EXIT=0
else
  echo ""
  echo -e "  ${RED}Algunos tests fallaron${NC}"
  TEST_EXIT=1
fi

# Extraer resumen de resultados
TOTAL=$(grep -oP 'Total:\s+\K\d+' "$LOG_DIR/tests.log" 2>/dev/null | tail -1 || echo "?")
PASSED=$(grep -oP '(Correcto|Passed):\s+\K\d+' "$LOG_DIR/tests.log" 2>/dev/null | tail -1 || echo "?")
FAILED=$(grep -oP '(Error|Failed):\s+\K\d+' "$LOG_DIR/tests.log" 2>/dev/null | tail -1 || echo "0")

# Guardar resumen en archivo
{
  echo "================================================================="
  echo "RLAPP Test Results — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "================================================================="
  echo "Configuracion: $CONFIGURATION"
  echo "Modo:          $(if $UNIT_ONLY; then echo 'unit-only'; else echo 'completo'; fi)"
  echo "Total:         $TOTAL"
  echo "Pasaron:       $PASSED"
  echo "Fallaron:      $FAILED"
  echo "Resultado:     $(if [[ $TEST_EXIT -eq 0 ]]; then echo 'EXITO'; else echo 'FALLO'; fi)"
  echo "================================================================="
} > "$RESULTS_FILE"

echo ""

# --- Paso: Smoke test (solo con --smoke) ------------------------------------
if $SMOKE_TEST && [[ $TEST_EXIT -eq 0 ]]; then
  next_step
  echo -e "${YELLOW}[$STEP/$TOTAL_STEPS] Validacion de endpoints (smoke test)...${NC}"

  # Verificar que la API este corriendo
  if ! curl -fsS http://localhost:5000/health/live &>/dev/null; then
    echo -e "  ${YELLOW}La API no esta corriendo. Omitiendo smoke test.${NC}"
    echo "  Ejecuta primero: ./start-services.sh --local"
  else
    # Health
    HEALTH=$(curl -s http://localhost:5000/health/live 2>/dev/null || echo "FAIL")
    if [[ "$HEALTH" == "Healthy" ]]; then
      echo -e "  ${GREEN}GET  /health/live         → Healthy${NC}"
    else
      echo -e "  ${RED}GET  /health/live         → $HEALTH${NC}"
    fi

    # Readiness
    READY_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/health/ready 2>/dev/null || echo "000")
    if [[ "$READY_CODE" == "200" ]]; then
      echo -e "  ${GREEN}GET  /health/ready        → 200 OK${NC}"
    else
      echo -e "  ${RED}GET  /health/ready        → HTTP $READY_CODE${NC}"
    fi

    # Check-in funcional
    CHECKIN_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
      -X POST http://localhost:5000/api/waiting-room/check-in \
      -H "Content-Type: application/json" \
      -d '{
        "queueId": "smoke-test-queue",
        "patientId": "smoke-patient-001",
        "patientName": "Smoke Test",
        "priority": "Low",
        "consultationType": "General",
        "actor": "smoke-test"
      }' 2>/dev/null || echo "000")
    if [[ "$CHECKIN_CODE" == "200" ]]; then
      echo -e "  ${GREEN}POST /api/waiting-room/check-in → 200 OK${NC}"
    else
      echo -e "  ${YELLOW}POST /api/waiting-room/check-in → HTTP $CHECKIN_CODE${NC}"
    fi
  fi
  echo ""
fi

# --- Resumen final ----------------------------------------------------------
echo -e "${CYAN}=================================================================${NC}"
if [[ $TEST_EXIT -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  RESULTADO: EXITO${NC}"
else
  echo -e "${RED}${BOLD}  RESULTADO: FALLO${NC}"
fi
echo -e "${CYAN}  Total: $TOTAL | Pasaron: $PASSED | Fallaron: $FAILED${NC}"
echo -e "${CYAN}  Log completo: $LOG_DIR/tests.log${NC}"
echo -e "${CYAN}  Resumen:      $RESULTS_FILE${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""

exit $TEST_EXIT
