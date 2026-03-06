#!/usr/bin/env bash
# =============================================================================
# RLAPP Backend — Ejecucion completa de tests (v2.0)
#
# ESTRATEGIA DE EJECUCION:
#   Capa 1 — Unitarios  : Domain, Application, Projections
#                          (sin dependencias externas, siempre ejecutan)
#   Capa 2 — Integra/Mock: Integration > Worker, Domain, EndToEnd en memoria
#                          (usan mocks, sin infra real, siempre ejecutan)
#   Capa 3 — Integra/DB : Integration > Infrastructure (Postgres)
#                          (solo si Docker/Postgres esta activo)
#   Capa 4 — E2E API    : Integration > API (requiere API corriendo en :5000)
#                          (solo si --all o API detectada)
#
# Uso:
#   ./run-complete-test.sh              → Capas 1 + 2 (+ 3 si Docker activo)
#   ./run-complete-test.sh --clean      → Limpia bin/obj, rebuild + capas 1+2+3
#   ./run-complete-test.sh --unit-only  → Solo capa 1 (sin Docker, sin mocks de infra)
#   ./run-complete-test.sh --all        → Todas las capas (requiere stack completo)
#   ./run-complete-test.sh --smoke      → Capas 1+2+3 + validacion de endpoints HTTP
#   ./run-complete-test.sh --debug      → Compila en modo Debug
# =============================================================================
set -uo pipefail

# --- Rutas -----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
REPO_ROOT="$(cd "$PROJECT_ROOT/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
SOLUTION="$PROJECT_ROOT/RLAPP.slnx"
LOG_DIR="/tmp/rlapp-test"
RESULTS_FILE="$PROJECT_ROOT/test-results.log"

# Proyectos de tests individuales
TEST_DOMAIN="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Domain/WaitingRoom.Tests.Domain.csproj"
TEST_APPLICATION="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Application/WaitingRoom.Tests.Application.csproj"
TEST_PROJECTIONS="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Projections/WaitingRoom.Tests.Projections.csproj"
TEST_INTEGRATION="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj"

# --- Colores ---------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Argumentos ------------------------------------------------------------
CLEAN_BUILD=false
UNIT_ONLY=false
SMOKE_TEST=false
RUN_ALL=false
CONFIGURATION="Release"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)      CLEAN_BUILD=true; shift ;;
    --unit-only)  UNIT_ONLY=true;   shift ;;
    --smoke)      SMOKE_TEST=true;  shift ;;
    --all)        RUN_ALL=true;     shift ;;
    --debug)      CONFIGURATION="Debug"; shift ;;
    -h|--help)
      echo "Uso: $0 [--clean] [--unit-only] [--all] [--smoke] [--debug]"
      echo ""
      echo "Opciones:"
      echo "  --clean      Limpia bin/obj y fuerza rebuild completo"
      echo "  --unit-only  Solo tests unitarios (Domain, Application, Projections)"
      echo "  --all        Todas las capas incluido E2E API (requiere stack completo)"
      echo "  --smoke      Valida endpoints HTTP tras los tests"
      echo "  --debug      Compila en modo Debug"
      echo ""
      echo "Capas de ejecucion:"
      echo "  Capa 1  Domain, Application, Projections (siempre)"
      echo "  Capa 2  Integration (Worker, Domain, E2E in-memory) (siempre)"
      echo "  Capa 3  Integration/Infrastructure Postgres (si Docker activo)"
      echo "  Capa 4  Integration/API E2E (solo con --all o API en :5000)"
      exit 0
      ;;
    *) echo -e "${RED}Argumento desconocido: $1${NC}"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"

# --- Counters globales -----------------------------------------------------
GLOBAL_TOTAL=0
GLOBAL_PASSED=0
GLOBAL_FAILED=0
GLOBAL_SKIPPED=0
ALL_PASSED=true
LAYER_RESULTS=()

# --- Funciones utilitarias -------------------------------------------------

print_header() {
  echo ""
  echo -e "${CYAN}=================================================================${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}=================================================================${NC}"
}

print_section() {
  echo ""
  echo -e "${BLUE}--- $1 ---${NC}"
}

# Extrae total/passed/failed desde un log de dotnet test (compatible ES y EN)
extract_results() {
  local logfile="$1"
  local prefix="$2"

  # dotnet test ES: "Con error: 4, Superado: 28, Omitido: 0, Total: 32"
  # dotnet test EN: "Failed: 4, Passed: 28, Skipped: 0, Total: 32"
  local total passed failed skipped

  total=$(grep -oP 'Total:\s*\K\d+' "$logfile" 2>/dev/null | tail -1)
  passed=$(grep -oP '(Superado|Passed):\s*\K\d+' "$logfile" 2>/dev/null | tail -1)
  failed=$(grep -oP '(Con error|Failed):\s*\K\d+' "$logfile" 2>/dev/null | tail -1)
  skipped=$(grep -oP '(Omitido|Skipped):\s*\K\d+' "$logfile" 2>/dev/null | tail -1)

  eval "${prefix}_TOTAL='${total:-0}'"
  eval "${prefix}_PASSED='${passed:-0}'"
  eval "${prefix}_FAILED='${failed:-0}'"
  eval "${prefix}_SKIPPED='${skipped:-0}'"
}

# Ejecuta dotnet test en un proyecto con filtro opcional
run_project_tests() {
  local label="$1"
  local project="$2"
  local filter="${3:-}"
  local logfile="$LOG_DIR/${label// /_}.log"

  echo -ne "  ${YELLOW}[ ] $label${NC} ... "

  local test_args=(
    test "$project"
    --configuration "$CONFIGURATION"
    --no-build
    --verbosity normal
    --logger "console;verbosity=minimal"
  )

  if [[ -n "$filter" ]]; then
    test_args+=(--filter "$filter")
  fi

  local exit_code=0
  dotnet "${test_args[@]}" > "$logfile" 2>&1 || exit_code=$?

  extract_results "$logfile" "R"
  local _TOTAL=${R_TOTAL:-0}
  local _PASSED=${R_PASSED:-0}
  local _FAILED=${R_FAILED:-0}
  local _SKIPPED=${R_SKIPPED:-0}

  GLOBAL_TOTAL=$(( GLOBAL_TOTAL + _TOTAL ))
  GLOBAL_PASSED=$(( GLOBAL_PASSED + _PASSED ))
  GLOBAL_FAILED=$(( GLOBAL_FAILED + _FAILED ))
  GLOBAL_SKIPPED=$(( GLOBAL_SKIPPED + _SKIPPED ))

  if [[ $exit_code -eq 0 ]]; then
    echo -e "\r  ${GREEN}[OK] $label${NC} — Total:${_TOTAL} | Pasaron:${_PASSED} | Omitidos:${_SKIPPED}"
    LAYER_RESULTS+=("OK   [$label] Total:${_TOTAL} OK:${_PASSED} Skip:${_SKIPPED}")
  else
    echo -e "\r  ${RED}[FAIL] $label${NC} — Total:${_TOTAL} | Pasaron:${_PASSED} | Fallaron:${_FAILED} | Omitidos:${_SKIPPED}"
    ALL_PASSED=false
    LAYER_RESULTS+=("FAIL [$label] Total:${_TOTAL} OK:${_PASSED} Fail:${_FAILED} Skip:${_SKIPPED}")
    echo ""
    echo -e "  ${RED}Errores detectados (log completo: $logfile):${NC}"
    grep -E "(Con error|FAILED|Error message|at .* in)" "$logfile" 2>/dev/null | head -25 | sed 's/^/    /' || true
    echo ""
  fi

  return $exit_code
}

postgres_is_running() {
  docker exec rlapp-postgres pg_isready -U rlapp &>/dev/null 2>&1
}

api_is_running() {
  local url="${WAITINGROOM_API_BASE_URL:-http://localhost:5000}"
  curl -fsS --max-time 3 "${url}/health/live" &>/dev/null 2>&1
}

docker_is_available() {
  command -v docker &>/dev/null && docker info &>/dev/null 2>&1
}

# =============================================================================
# INICIO
# =============================================================================
print_header "RLAPP Backend — Ejecucion completa de tests"

echo -e "  .NET SDK     : $(dotnet --version 2>/dev/null || echo '?')"
echo -e "  Configuracion: ${BOLD}$CONFIGURATION${NC}"
echo -e "  Modo         : ${BOLD}$(
  if $UNIT_ONLY; then echo 'unit-only';
  elif $RUN_ALL; then echo 'all (E2E incluido)';
  else echo 'estandar'; fi
)${NC}"
echo -e "  Solucion     : $SOLUTION"
echo -e "  Logs         : $LOG_DIR"
echo ""

# =============================================================================
# PASO 1 — Verificar prerequisitos
# =============================================================================
print_section "Paso 1 — Verificando prerequisitos"

if ! command -v dotnet &>/dev/null; then
  echo -e "${RED}ERROR: .NET SDK no encontrado en PATH.${NC}"
  exit 1
fi

if [[ ! -f "$SOLUTION" ]]; then
  echo -e "${RED}ERROR: Solucion no encontrada: $SOLUTION${NC}"
  exit 1
fi

for proj in "$TEST_DOMAIN" "$TEST_APPLICATION" "$TEST_PROJECTIONS" "$TEST_INTEGRATION"; do
  if [[ ! -f "$proj" ]]; then
    echo -e "${RED}ERROR: Proyecto de test no encontrado: $proj${NC}"
    exit 1
  fi
done

echo -e "  ${GREEN}Prerequisitos verificados${NC}"

# =============================================================================
# PASO 2 — Detectar infraestructura
# =============================================================================
DOCKER_AVAILABLE=false
POSTGRES_AVAILABLE=false
API_AVAILABLE=false

if ! $UNIT_ONLY; then
  print_section "Paso 2 — Detectando infraestructura disponible"

  if docker_is_available; then
    DOCKER_AVAILABLE=true
    echo -e "  ${GREEN}Docker         : disponible${NC}"
  else
    echo -e "  ${YELLOW}Docker         : no disponible (tests Capa 3 seran omitidos)${NC}"
  fi

  if $DOCKER_AVAILABLE && postgres_is_running; then
    POSTGRES_AVAILABLE=true
    echo -e "  ${GREEN}PostgreSQL      : corriendo${NC}"
  else
    echo -e "  ${YELLOW}PostgreSQL      : no detectado (tests Infrastructure omitidos)${NC}"
  fi

  if api_is_running; then
    API_AVAILABLE=true
    echo -e "  ${GREEN}API HTTP        : respondiendo en ${WAITINGROOM_API_BASE_URL:-http://localhost:5000}${NC}"
  else
    if $RUN_ALL; then
      echo -e "  ${RED}API HTTP        : NO detectada en :5000 (--all requiere API corriendo)${NC}"
    else
      echo -e "  ${YELLOW}API HTTP        : no detectada en :5000 (tests API E2E omitidos — usa --all)${NC}"
    fi
  fi
fi

# =============================================================================
# PASO 3 — Limpiar artefactos (solo --clean)
# =============================================================================
if $CLEAN_BUILD; then
  print_section "Paso 3 — Limpiando artefactos de compilacion"
  find "$PROJECT_ROOT/src" -type d \( -name "bin" -o -name "obj" \) -exec rm -rf {} + 2>/dev/null || true
  dotnet clean "$SOLUTION" --configuration "$CONFIGURATION" > "$LOG_DIR/clean.log" 2>&1 || true
  echo -e "  ${GREEN}Artefactos bin/ obj/ eliminados${NC}"
fi

# =============================================================================
# PASO 4 — Compilar solucion
# =============================================================================
print_section "Paso 4 — Compilando solucion ($CONFIGURATION)"

cd "$PROJECT_ROOT"
if dotnet build "$SOLUTION" --configuration "$CONFIGURATION" > "$LOG_DIR/build.log" 2>&1; then
  WARN_COUNT=$({ grep -c "[Ww]arning" "$LOG_DIR/build.log" 2>/dev/null || true; } | head -1)
  echo -e "  ${GREEN}Compilacion exitosa${NC} (advertencias: ${WARN_COUNT:-0})"
else
  echo -e "  ${RED}ERROR: La compilacion fallo. Revisa:${NC}"
  echo ""
  grep -E "(Error|error)" "$LOG_DIR/build.log" | grep -v "^[[:space:]]*0 Error" | head -30
  echo ""
  echo "  Log completo: $LOG_DIR/build.log"
  exit 1
fi

# =============================================================================
# PASO 5 — CAPA 1: Unitarios (Domain, Application, Projections)
# =============================================================================
print_section "Paso 5 — Capa 1: Tests unitarios"

LAYER1_PASS=true
run_project_tests "Domain"      "$TEST_DOMAIN"      || LAYER1_PASS=false
run_project_tests "Application" "$TEST_APPLICATION" || LAYER1_PASS=false
run_project_tests "Projections" "$TEST_PROJECTIONS" || LAYER1_PASS=false

if $LAYER1_PASS; then
  echo -e "  ${GREEN}=> Capa 1: TODOS LOS UNITARIOS PASAN${NC}"
else
  echo -e "  ${RED}=> Capa 1: UNITARIOS FALLARON — revisa los detalles arriba${NC}"
  ALL_PASSED=false
fi

# Si --unit-only, saltar capas 2-4
if $UNIT_ONLY; then
  echo ""
  echo -e "  ${YELLOW}Modo --unit-only: capas 2, 3 y 4 omitidas.${NC}"
else

# =============================================================================
# PASO 6 — CAPA 2: Integration (Worker + Domain + E2E en memoria)
#          Excluye API (HTTP contra :5000) e Infrastructure (Postgres)
# =============================================================================
print_section "Paso 6 — Capa 2: Integration tests (Worker / Domain / Mock)"

LAYER2_PASS=true

# Excluir namespaces que requieren infra real
FILTER_L2="FullyQualifiedName!~WaitingRoom.Tests.Integration.API.&FullyQualifiedName!~WaitingRoom.Tests.Integration.Infrastructure."

run_project_tests "Integration-Mock" "$TEST_INTEGRATION" "$FILTER_L2" || LAYER2_PASS=false

if $LAYER2_PASS; then
  echo -e "  ${GREEN}=> Capa 2: INTEGRACION MOCK OK${NC}"
else
  echo -e "  ${RED}=> Capa 2: INTEGRACION MOCK FALLO${NC}"
  ALL_PASSED=false
fi

# =============================================================================
# PASO 7 — CAPA 3: Integration/Infrastructure (requiere Postgres)
# =============================================================================
print_section "Paso 7 — Capa 3: Integration/Infrastructure (Postgres)"

LAYER3_PASS=true

if $POSTGRES_AVAILABLE; then
  export ConnectionStrings__EventStore="Host=localhost;Port=5432;Database=rlapp_waitingroom_test;Username=rlapp;Password=rlapp_secure_password"
  export POSTGRES_CONNECTION_STRING="Host=localhost;Port=5432;Database=rlapp_waitingroom;Username=rlapp;Password=rlapp_secure_password"
  export RabbitMq__HostName="localhost"
  export RabbitMq__Port="5672"
  export RabbitMq__UserName="guest"
  export RabbitMq__Password="guest"

  FILTER_L3="FullyQualifiedName~WaitingRoom.Tests.Integration.Infrastructure."
  run_project_tests "Integration-Postgres" "$TEST_INTEGRATION" "$FILTER_L3" || LAYER3_PASS=false

  if $LAYER3_PASS; then
    echo -e "  ${GREEN}=> Capa 3: POSTGRES OK${NC}"
  else
    echo -e "  ${RED}=> Capa 3: POSTGRES FALLO${NC}"
    ALL_PASSED=false
  fi
else
  echo -e "  ${YELLOW}=> Capa 3 OMITIDA: PostgreSQL no disponible.${NC}"
  echo -e "     Comando para levantar: docker compose up -d postgres rabbitmq"
  LAYER_RESULTS+=("SKIP [Integration-Postgres] — PostgreSQL no disponible")
fi

# =============================================================================
# PASO 8 — CAPA 4: E2E API tests (requiere API en :5000)
# =============================================================================
print_section "Paso 8 — Capa 4: E2E API tests (http://localhost:5000)"

LAYER4_PASS=true

if $API_AVAILABLE || $RUN_ALL; then
  if ! $API_AVAILABLE; then
    echo -e "  ${RED}=> Capa 4 FALLO: --all requiere API en :5000 pero no responde.${NC}"
    echo -e "     Ejecuta: ./start-services.sh --local  (o levanta el stack Docker)"
    LAYER_RESULTS+=("FAIL [Integration-API-E2E] — API no disponible en :5000")
    ALL_PASSED=false
  else
    export WAITINGROOM_API_BASE_URL="${WAITINGROOM_API_BASE_URL:-http://localhost:5000}"

    FILTER_L4="FullyQualifiedName~WaitingRoom.Tests.Integration.API."
    run_project_tests "Integration-API-E2E" "$TEST_INTEGRATION" "$FILTER_L4" || LAYER4_PASS=false

    if $LAYER4_PASS; then
      echo -e "  ${GREEN}=> Capa 4: API E2E OK${NC}"
    else
      echo -e "  ${RED}=> Capa 4: API E2E FALLO${NC}"
      ALL_PASSED=false
    fi
  fi
else
  echo -e "  ${YELLOW}=> Capa 4 OMITIDA: API no detectada en :5000.${NC}"
  echo -e "     Para ejecutar: inicia la API y usa flag --all"
  LAYER_RESULTS+=("SKIP [Integration-API-E2E] — API no disponible (usa --all con API corriendo)")
fi

fi  # fin bloque !unit_only

# =============================================================================
# PASO 9 — Smoke test de endpoints (--smoke)
# =============================================================================
if $SMOKE_TEST; then
  print_section "Paso 9 — Smoke test de endpoints HTTP"

  API_URL="${WAITINGROOM_API_BASE_URL:-http://localhost:5000}"

  if ! curl -fsS --max-time 3 "${API_URL}/health/live" &>/dev/null 2>&1; then
    echo -e "  ${YELLOW}API no responde en $API_URL — smoke test omitido.${NC}"
  else
    check_endpoint() {
      local label="$1" method="$2" url="$3" expected_code="$4"
      shift 4
      local http_code
      http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -X "$method" "$url" "$@" 2>/dev/null || echo "000")
      if [[ "$http_code" =~ ^($expected_code)$ ]]; then
        echo -e "  ${GREEN}[OK]   $label → HTTP $http_code${NC}"
      else
        echo -e "  ${RED}[FAIL] $label → HTTP $http_code (esperado: $expected_code)${NC}"
      fi
    }

    check_endpoint "GET  /health/live"  GET  "${API_URL}/health/live"  "200"
    check_endpoint "GET  /health/ready" GET  "${API_URL}/health/ready" "200"
    check_endpoint "POST /api/waiting-room/check-in" POST "${API_URL}/api/waiting-room/check-in" "200|201" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: smoke-$(date +%s%N)" \
      -H "X-User-Role: Receptionist" \
      -d '{"patientId":"smoke-001","patientName":"Smoke Test","priority":"Low","consultationType":"General","actor":"smoke-test"}'
  fi
fi

# =============================================================================
# RESUMEN FINAL
# =============================================================================

# Guardar reporte en disco (sin colores ANSI)
{
  echo "================================================================="
  echo "RLAPP Test Results — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "================================================================="
  echo "Configuracion  : $CONFIGURATION"
  echo "Modo           : $(if $UNIT_ONLY; then echo 'unit-only'; elif $RUN_ALL; then echo 'all'; else echo 'estandar'; fi)"
  echo ""
  echo "Totales acumulados:"
  echo "  Total    : $GLOBAL_TOTAL"
  echo "  Pasaron  : $GLOBAL_PASSED"
  echo "  Fallaron : $GLOBAL_FAILED"
  echo "  Omitidos : $GLOBAL_SKIPPED"
  echo ""
  echo "Resultado: $(if $ALL_PASSED; then echo 'EXITO'; else echo 'FALLO'; fi)"
  echo "================================================================="
  echo ""
  echo "Detalle por capa:"
  for r in "${LAYER_RESULTS[@]}"; do
    echo "  $r"
  done
} > "$RESULTS_FILE"

print_header "RESUMEN DE EJECUCION"
echo ""

# Encabezados de columna
printf "  %-6s %-32s %s\n" "ESTADO" "SUITE" "METRICAS"
printf "  %-6s %-32s %s\n" "------" "--------------------------------" "--------"

for r in "${LAYER_RESULTS[@]}"; do
  status="${r:0:4}"
  rest="${r:5}"
  case "$status" in
    "OK  ") echo -e "  ${GREEN}${status}${NC}  $rest" ;;
    "FAIL") echo -e "  ${RED}${status}${NC}  $rest" ;;
    "SKIP") echo -e "  ${YELLOW}${status}${NC}  $rest" ;;
    *)      echo "  $r" ;;
  esac
done

echo ""
echo -e "${CYAN}  ─────────────────────────────────────────${NC}"
echo -e "${CYAN}  Total acumulado : $GLOBAL_TOTAL tests${NC}"
echo -e "${CYAN}  Pasaron         : ${GREEN}$GLOBAL_PASSED${NC}"
if [[ $GLOBAL_FAILED -gt 0 ]]; then
  echo -e "${CYAN}  Fallaron        : ${RED}$GLOBAL_FAILED${NC}"
else
  echo -e "${CYAN}  Fallaron        : ${GREEN}0${NC}"
fi
[[ $GLOBAL_SKIPPED -gt 0 ]] && echo -e "${CYAN}  Omitidos        : ${YELLOW}$GLOBAL_SKIPPED${NC}"

echo ""
if $ALL_PASSED; then
  echo -e "  ${GREEN}${BOLD}✔  RESULTADO FINAL: EXITO${NC}"
  echo -e "  ${GREEN}Todos los tests ejecutados pasaron correctamente.${NC}"
  FINAL_EXIT=0
else
  echo -e "  ${RED}${BOLD}✖  RESULTADO FINAL: FALLO${NC}"
  echo -e "  ${RED}Uno o mas tests fallaron. Revisa los logs individuales en: $LOG_DIR/${NC}"
  FINAL_EXIT=1
fi

echo ""
echo -e "  Logs individuales : ${CYAN}$LOG_DIR/${NC}"
echo -e "  Reporte resumen   : ${CYAN}$RESULTS_FILE${NC}"
echo ""
echo -e "${CYAN}=================================================================${NC}"
echo ""

exit $FINAL_EXIT
