#!/usr/bin/env bash
# =============================================================================
# RLAPP Backend — Ejecución detallada de tests (test a test)
#
# Muestra CADA test individualmente con su resultado: PASS / FAIL / SKIP
# No produce resúmenes generales únicamente — detalla una a una las pruebas.
#
# Uso:
#   ./run-tests-detail.sh                → Todos los proyectos de tests
#   ./run-tests-detail.sh --domain       → Solo WaitingRoom.Tests.Domain
#   ./run-tests-detail.sh --application  → Solo WaitingRoom.Tests.Application
#   ./run-tests-detail.sh --projections  → Solo WaitingRoom.Tests.Projections
#   ./run-tests-detail.sh --integration  → Solo WaitingRoom.Tests.Integration
#   ./run-tests-detail.sh --filter "NombreTest"  → Filtrar por nombre de test
#   ./run-tests-detail.sh --no-build     → Omitir compilación previa
#   ./run-tests-detail.sh --help         → Muestra esta ayuda
# =============================================================================
set -uo pipefail

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

TEST_DOMAIN="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Domain/WaitingRoom.Tests.Domain.csproj"
TEST_APPLICATION="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Application/WaitingRoom.Tests.Application.csproj"
TEST_PROJECTIONS="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Projections/WaitingRoom.Tests.Projections.csproj"
TEST_INTEGRATION="$PROJECT_ROOT/src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj"
SOLUTION="$PROJECT_ROOT/RLAPP.slnx"

TRX_DIR="/tmp/rlapp-detail-trx"

# ---------------------------------------------------------------------------
# Colores
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Argumentos
# ---------------------------------------------------------------------------
RUN_DOMAIN=false
RUN_APPLICATION=false
RUN_PROJECTIONS=false
RUN_INTEGRATION=false
RUN_ALL=true
NO_BUILD=false
FILTER_EXPR=""
CONFIGURATION="Release"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)       RUN_DOMAIN=true;      RUN_ALL=false; shift ;;
    --application)  RUN_APPLICATION=true; RUN_ALL=false; shift ;;
    --projections)  RUN_PROJECTIONS=true; RUN_ALL=false; shift ;;
    --integration)  RUN_INTEGRATION=true; RUN_ALL=false; shift ;;
    --no-build)     NO_BUILD=true;        shift ;;
    --debug)        CONFIGURATION="Debug"; shift ;;
    --filter)
      shift
      FILTER_EXPR="$1"
      shift
      ;;
    -h|--help)
      echo ""
      echo -e "${BOLD}RLAPP Backend — Test detallado (test a test)${NC}"
      echo ""
      echo "Uso: $0 [opciones]"
      echo ""
      echo "Opciones:"
      echo "  --domain        Ejecuta solo WaitingRoom.Tests.Domain"
      echo "  --application   Ejecuta solo WaitingRoom.Tests.Application"
      echo "  --projections   Ejecuta solo WaitingRoom.Tests.Projections"
      echo "  --integration   Ejecuta solo WaitingRoom.Tests.Integration"
      echo "  --filter <expr> Filtra por nombre de test o clase (soporta wildcards)"
      echo "  --no-build      Omite la compilación previa"
      echo "  --debug         Compila en modo Debug"
      echo "  --help          Muestra esta ayuda"
      echo ""
      echo "Ejemplos:"
      echo "  $0                                   # Todos los tests"
      echo "  $0 --domain                          # Solo tests de dominio"
      echo "  $0 --filter WaitingQueueTests        # Tests de esa clase"
      echo "  $0 --application --no-build          # Application sin recompilar"
      exit 0
      ;;
    *)
      echo -e "${RED}Argumento desconocido: $1${NC}"
      exit 1
      ;;
  esac
done

if [[ "$RUN_ALL" == "true" ]]; then
  RUN_DOMAIN=true
  RUN_APPLICATION=true
  RUN_PROJECTIONS=true
  RUN_INTEGRATION=true
fi

mkdir -p "$TRX_DIR"

# ---------------------------------------------------------------------------
# Contadores globales
# ---------------------------------------------------------------------------
TOTAL_GLOBAL=0
PASSED_GLOBAL=0
FAILED_GLOBAL=0
SKIPPED_GLOBAL=0
FAILED_TESTS=()          # acumula "Proyecto :: NombreTest"
ALL_OK=true

# ---------------------------------------------------------------------------
# Función: cabecera de sección
# ---------------------------------------------------------------------------
print_section() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${BOLD}  $1${NC}"
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ---------------------------------------------------------------------------
# Función: separador de proyecto
# ---------------------------------------------------------------------------
print_project_header() {
  local label="$1"
  echo ""
  echo -e "${BLUE}${BOLD}▶  $label${NC}"
  echo -e "${DIM}$(printf '─%.0s' {1..62})${NC}"
}

# ---------------------------------------------------------------------------
# Función: parsear TRX y mostrar cada test individualmente
# ---------------------------------------------------------------------------
# Argumento: ruta al archivo .trx (XML)
# Retorna (via globals):   PROJ_TOTAL  PROJ_PASSED  PROJ_FAILED  PROJ_SKIPPED
# ---------------------------------------------------------------------------
PROJ_TOTAL=0
PROJ_PASSED=0
PROJ_FAILED=0
PROJ_SKIPPED=0

parse_trx() {
  local trx_file="$1"
  local proj_label="$2"

  PROJ_TOTAL=0
  PROJ_PASSED=0
  PROJ_FAILED=0
  PROJ_SKIPPED=0

  if [[ ! -f "$trx_file" ]]; then
    echo -e "  ${RED}No se encontró el archivo TRX: $trx_file${NC}"
    return 1
  fi

  # Extraer todos los UnitTestResult con nombre y resultado
  # El TRX de dotnet tiene: <UnitTestResult testName="..." outcome="Passed|Failed|NotExecuted" ...>
  # Usamos grep + sed para parsear sin dependencias externas

  local current_test=""
  local current_outcome=""
  local in_error=false
  local error_msg=""

  # Procesamos línea a línea el XML
  while IFS= read -r line; do

    # Detectar inicio de UnitTestResult
    if echo "$line" | grep -q 'UnitTestResult'; then
      # Extraer testName
      current_test=$(echo "$line" | sed -n 's/.*testName="\([^"]*\)".*/\1/p')
      # Extraer outcome
      current_outcome=$(echo "$line" | sed -n 's/.*outcome="\([^"]*\)".*/\1/p')
      # Extraer duration si está en la misma línea
      local duration
      duration=$(echo "$line" | sed -n 's/.*duration="\([^"]*\)".*/\1/p')

      if [[ -n "$current_test" && -n "$current_outcome" ]]; then
        # Decodificar entidades XML en el nombre del test
        current_test=$(echo "$current_test" \
          | sed 's/&quot;/"/g; s/&apos;/'"'"'/g; s/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g')
        # Quitar el namespace largo: mantener solo NombreClase.NombreTest
        local short_name
        short_name=$(echo "$current_test" | awk -F'.' '{print $(NF-1)"."$NF}')

        PROJ_TOTAL=$((PROJ_TOTAL + 1))

        # Formatear duración
        local dur_label=""
        if [[ -n "$duration" ]]; then
          # duration viene como HH:MM:SS.fffffff — extraer solo los ms útiles
          local ms
          ms=$(echo "$duration" | sed 's/.*:\([0-9]*\)\.\([0-9]\{1,3\}\).*/\1\2/' | sed 's/^0*//' | head -c 6)
          [[ -z "$ms" ]] && ms="0"
          dur_label=" ${DIM}[${ms} ms]${NC}"
        fi

        case "$current_outcome" in
          Passed)
            PROJ_PASSED=$((PROJ_PASSED + 1))
            echo -e "  ${GREEN}✔ PASS${NC}  ${short_name}${dur_label}"
            ;;
          Failed)
            PROJ_FAILED=$((PROJ_FAILED + 1))
            ALL_OK=false
            echo -e "  ${RED}✘ FAIL${NC}  ${short_name}${dur_label}"
            FAILED_TESTS+=("${proj_label} :: ${short_name}")
            in_error=true
            error_msg=""
            ;;
          NotExecuted|Skipped)
            PROJ_SKIPPED=$((PROJ_SKIPPED + 1))
            echo -e "  ${YELLOW}⊘ SKIP${NC}  ${short_name}${dur_label}"
            ;;
          *)
            PROJ_TOTAL=$((PROJ_TOTAL - 1))  # descontar si no reconocemos
            ;;
        esac
      fi
    fi

    # Capturar mensaje de error para tests FAIL
    if [[ "$in_error" == "true" ]]; then
      if echo "$line" | grep -q '<Message>'; then
        error_msg=$(echo "$line" | sed 's/.*<Message>\(.*\)<\/Message>.*/\1/' | sed 's/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g')
        if [[ -n "$error_msg" ]]; then
          # Truncar a 120 chars para legibilidad
          local truncated="${error_msg:0:120}"
          [[ ${#error_msg} -gt 120 ]] && truncated+="..."
          echo -e "     ${DIM}↳ $truncated${NC}"
          in_error=false
        fi
      fi
      # Si cierra el bloque UnitTestResult, salir del modo error
      if echo "$line" | grep -q '</UnitTestResult>'; then
        in_error=false
      fi
    fi

  done < "$trx_file"
}

# ---------------------------------------------------------------------------
# Función: ejecutar un proyecto de test y mostrar detalle
# ---------------------------------------------------------------------------
run_project() {
  local csproj="$1"
  local label="$2"
  local trx_file="$TRX_DIR/${label// /_}.trx"

  print_project_header "$label"

  # Verificar que el proyecto existe
  if [[ ! -f "$csproj" ]]; then
    echo -e "  ${RED}Proyecto no encontrado: $csproj${NC}"
    return 1
  fi

  # Construir argumentos para dotnet test
  local args=(
    test "$csproj"
    --configuration "$CONFIGURATION"
    --no-restore
    --logger "trx;LogFileName=${trx_file}"
    --no-build
    --verbosity quiet
  )

  # Agregar filtro si se especificó
  if [[ -n "$FILTER_EXPR" ]]; then
    args+=(--filter "$FILTER_EXPR")
  fi

  # Ejecutar dotnet test
  dotnet "${args[@]}" 2>/dev/null || true

  echo ""

  # Parsear TRX y mostrar test a test
  parse_trx "$trx_file" "$label"

  # Resumen del proyecto
  echo ""
  echo -e "${DIM}  Resumen ${label}:${NC}"
  echo -e "  ${BOLD}Total: ${PROJ_TOTAL}${NC}  |  ${GREEN}Pasaron: ${PROJ_PASSED}${NC}  |  ${RED}Fallaron: ${PROJ_FAILED}${NC}  |  ${YELLOW}Omitidos: ${PROJ_SKIPPED}${NC}"
  echo -e "${DIM}$(printf '─%.0s' {1..62})${NC}"

  # Acumular en globales
  TOTAL_GLOBAL=$((TOTAL_GLOBAL + PROJ_TOTAL))
  PASSED_GLOBAL=$((PASSED_GLOBAL + PROJ_PASSED))
  FAILED_GLOBAL=$((FAILED_GLOBAL + PROJ_FAILED))
  SKIPPED_GLOBAL=$((SKIPPED_GLOBAL + PROJ_SKIPPED))
}

# ---------------------------------------------------------------------------
# INICIO
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   RLAPP Backend — Ejecución detallada de tests               ║${NC}"
echo -e "${BOLD}${CYAN}║   Fecha : $(date '+%Y-%m-%d %H:%M:%S')                        ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"

# ---------------------------------------------------------------------------
# 1. Compilación previa
# ---------------------------------------------------------------------------
if [[ "$NO_BUILD" == "false" ]]; then
  print_section "COMPILACIÓN"
  echo -e "${DIM}  Compilando solución en modo ${CONFIGURATION}...${NC}"

  if dotnet build "$SOLUTION" \
       --configuration "$CONFIGURATION" \
       --verbosity quiet \
       --nologo 2>&1 | grep -E "(error|warning|Error|Warning)" | head -20; then
    :
  fi

  BUILD_EXIT=$?
  if dotnet build "$SOLUTION" --configuration "$CONFIGURATION" --verbosity quiet --nologo > /dev/null 2>&1; then
    echo -e "  ${GREEN}✔ Compilación exitosa${NC}"
  else
    echo -e "  ${RED}✘ Error de compilación. Abortando.${NC}"
    exit 1
  fi
else
  echo -e "\n  ${YELLOW}⚠ Compilación omitida (--no-build)${NC}"
fi

# ---------------------------------------------------------------------------
# 2. Mostrar configuración activa
# ---------------------------------------------------------------------------
echo ""
echo -e "${DIM}  Configuración : ${CONFIGURATION}${NC}"
echo -e "${DIM}  Filtro activo : ${FILTER_EXPR:-"(ninguno — ejecuta todos)"}${NC}"
echo -e "${DIM}  TRX output    : ${TRX_DIR}${NC}"

# ---------------------------------------------------------------------------
# 3. Ejecución capa por capa
# ---------------------------------------------------------------------------
print_section "CAPA 1 — TESTS UNITARIOS"

[[ "$RUN_DOMAIN" == "true" ]] && \
  run_project "$TEST_DOMAIN" "WaitingRoom.Tests.Domain"

[[ "$RUN_APPLICATION" == "true" ]] && \
  run_project "$TEST_APPLICATION" "WaitingRoom.Tests.Application"

[[ "$RUN_PROJECTIONS" == "true" ]] && \
  run_project "$TEST_PROJECTIONS" "WaitingRoom.Tests.Projections"

# ---------------------------------------------------------------------------
# 4. Tests de integración (solo si se pidió)
# ---------------------------------------------------------------------------
if [[ "$RUN_INTEGRATION" == "true" ]]; then
  print_section "CAPA 2 — TESTS DE INTEGRACIÓN"

  # Verificar si Docker / Postgres está disponible
  DOCKER_OK=false
  if command -v docker &>/dev/null; then
    if docker compose -f "$(dirname "$PROJECT_ROOT")/docker-compose.yml" \
         ps postgres 2>/dev/null | grep -q "healthy\|Up"; then
      DOCKER_OK=true
    fi
  fi

  if [[ "$DOCKER_OK" == "false" ]]; then
    echo ""
    echo -e "  ${YELLOW}⚠  PostgreSQL no detectado como activo.${NC}"
    echo -e "  ${YELLOW}   Los tests de Infrastructure/DB pueden fallar o ser omitidos.${NC}"
    echo -e "  ${DIM}   Inicia el stack con: docker compose up -d postgres${NC}"
    echo ""
  fi

  run_project "$TEST_INTEGRATION" "WaitingRoom.Tests.Integration"
fi

# ---------------------------------------------------------------------------
# 5. RESUMEN FINAL
# ---------------------------------------------------------------------------
print_section "RESUMEN FINAL"

echo ""
if [[ "$ALL_OK" == "true" && "$TOTAL_GLOBAL" -gt 0 ]]; then
  echo -e "  ${GREEN}${BOLD}✔  TODOS LOS TESTS PASARON${NC}"
elif [[ "$TOTAL_GLOBAL" -eq 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}⚠  No se encontraron tests${NC}"
else
  echo -e "  ${RED}${BOLD}✘  ALGUNOS TESTS FALLARON${NC}"
fi

echo ""
printf "  %-20s %s\n" "Total de tests:"   "${TOTAL_GLOBAL}"
printf "  %-20s %s\n" "Pasaron:"          "$(echo -e "${GREEN}${PASSED_GLOBAL}${NC}")"
printf "  %-20s %s\n" "Fallaron:"         "$(echo -e "${RED}${FAILED_GLOBAL}${NC}")"
printf "  %-20s %s\n" "Omitidos:"         "$(echo -e "${YELLOW}${SKIPPED_GLOBAL}${NC}")"

# ---------------------------------------------------------------------------
# 6. Detalle de tests fallidos
# ---------------------------------------------------------------------------
if [[ "${#FAILED_TESTS[@]}" -gt 0 ]]; then
  echo ""
  echo -e "  ${RED}${BOLD}Tests que fallaron:${NC}"
  for t in "${FAILED_TESTS[@]}"; do
    echo -e "    ${RED}✘${NC}  $t"
  done
  echo ""
  echo -e "  ${DIM}Tip: ejecuta con --filter para aislar un test específico:${NC}"
  echo -e "  ${DIM}  ./run-tests-detail.sh --filter \"NombreDeClase\"${NC}"
fi

echo ""
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Código de salida: 0 si todo pasó, 1 si hubo fallos
[[ "$ALL_OK" == "true" ]] && exit 0 || exit 1
