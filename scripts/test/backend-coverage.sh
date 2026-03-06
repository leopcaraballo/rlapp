#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Reporte de cobertura del backend
# Genera cobertura de tests unitarios y verifica umbral mínimo.
#
# Uso:
#   ./scripts/test/backend-coverage.sh           # Ejecuta y verifica umbral 80%
#   ./scripts/test/backend-coverage.sh --report  # Genera reporte HTML
#   ./scripts/test/backend-coverage.sh --threshold 90  # Umbral personalizado
#
# Prerequisito: dotnet tool install -g dotnet-reportgenerator-globaltool
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$REPO_ROOT/apps/backend"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

GENERATE_REPORT=false
THRESHOLD=80

while [[ $# -gt 0 ]]; do
  case "$1" in
    --report)    GENERATE_REPORT=true; shift ;;
    --threshold) THRESHOLD="${2:-80}"; shift 2 ;;
    -h|--help)
      head -12 "$0" | tail -9
      exit 0
      ;;
    *)
      echo "Opcion no reconocida: $1"
      exit 1
      ;;
  esac
done

echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  RLAPP — Backend: Cobertura de Tests${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

RESULTS_DIR="$BACKEND/TestResults"
COVERAGE_DIR="$BACKEND/CoverageReport"
RUNSETTINGS="$BACKEND/coverage.runsettings"

cd "$BACKEND"

echo -e "${YELLOW}  Ejecutando tests con cobertura...${NC}"

if [[ -f "$RUNSETTINGS" ]]; then
  dotnet test RLAPP.slnx \
    --configuration Release \
    --verbosity minimal \
    --filter "Category!=Integration" \
    --settings "$RUNSETTINGS" \
    --results-directory "$RESULTS_DIR"
else
  dotnet test RLAPP.slnx \
    --configuration Release \
    --verbosity minimal \
    --filter "Category!=Integration" \
    --collect:"XPlat Code Coverage" \
    --results-directory "$RESULTS_DIR"
fi

echo ""

# Verificar umbral si hay datos de cobertura
COVERAGE_XML=$(find "$RESULTS_DIR" -name "coverage.cobertura.xml" 2>/dev/null | head -1 || true)

if [[ -n "$COVERAGE_XML" ]]; then
  # Extraer cobertura de líneas
  LINE_RATE=$(grep -oP 'line-rate="\K[^"]+' "$COVERAGE_XML" | head -1 || echo "0")
  PERCENT=$(echo "$LINE_RATE * 100" | bc 2>/dev/null | cut -d'.' -f1 || echo "N/A")

  if [[ "$PERCENT" != "N/A" ]]; then
    if [[ "$PERCENT" -ge "$THRESHOLD" ]]; then
      echo -e "  ${GREEN}Cobertura: $PERCENT% (umbral: ${THRESHOLD}%)  OK${NC}"
    else
      echo -e "  ${RED}Cobertura: $PERCENT% (umbral: ${THRESHOLD}%)  FALLO${NC}"
      exit 1
    fi
  fi

  # Generar reporte HTML
  if $GENERATE_REPORT; then
    if command -v reportgenerator >/dev/null 2>&1; then
      echo -e "${YELLOW}  Generando reporte HTML...${NC}"
      reportgenerator \
        -reports:"$COVERAGE_XML" \
        -targetdir:"$COVERAGE_DIR" \
        -reporttypes:Html
      echo -e "  ${GREEN}Reporte generado: $COVERAGE_DIR/index.html${NC}"
    else
      echo -e "  ${YELLOW}reportgenerator no disponible. Instalar con:${NC}"
      echo "    dotnet tool install -g dotnet-reportgenerator-globaltool"
    fi
  fi
else
  echo -e "  ${YELLOW}No se encontraron archivos de cobertura. Verifica coverage.runsettings.${NC}"
fi

echo ""
