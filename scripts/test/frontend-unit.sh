#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Tests unitarios del frontend (Jest)
#
# Uso:
#   ./scripts/test/frontend-unit.sh                  # Todos los tests Jest
#   ./scripts/test/frontend-unit.sh --verbose         # Salida detallada
#   ./scripts/test/frontend-unit.sh --watch           # Modo watch
#   ./scripts/test/frontend-unit.sh --filter <patrón> # Filtro por nombre
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND="$REPO_ROOT/apps/frontend"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

VERBOSE=false
WATCH=false
FILTER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose) VERBOSE=true; shift ;;
    --watch)   WATCH=true; shift ;;
    --filter)  FILTER="${2:-}"; shift 2 ;;
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
echo -e "${CYAN}  RLAPP — Frontend: Tests Unitarios (Jest)${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo -e "${YELLOW}  node_modules no encontrado. Ejecutando npm install...${NC}"
  cd "$FRONTEND" && npm install --silent
  echo ""
fi

cd "$FRONTEND"

JEST_ARGS="--runInBand --forceExit"
$VERBOSE && JEST_ARGS="$JEST_ARGS --verbose"
$WATCH   && JEST_ARGS="$JEST_ARGS --watch"
[[ -n "$FILTER" ]] && JEST_ARGS="$JEST_ARGS --testNamePattern='$FILTER'"

echo -e "${YELLOW}  Ejecutando: npm test -- $JEST_ARGS${NC}"
echo ""

if npm test -- $JEST_ARGS; then
  echo ""
  echo -e "  ${GREEN}Frontend unitarios: TODOS PASARON${NC}"
else
  echo ""
  echo -e "  ${RED}Frontend unitarios: FALLARON${NC}"
  exit 1
fi

echo ""
