#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Ejecutor general de tests del backend
# Orquesta: unitarios (siempre) + integración (si Docker disponible).
#
# Uso:
#   ./scripts/test/backend.sh                 # Unitarios + integración si Docker
#   ./scripts/test/backend.sh --unit-only     # Solo tests unitarios
#   ./scripts/test/backend.sh --all           # Fuerza unitarios + integración
#   ./scripts/test/backend.sh --verbose       # Salida detallada
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

UNIT_ONLY=false
FORCE_ALL=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --unit-only) UNIT_ONLY=true; shift ;;
    --all)       FORCE_ALL=true; shift ;;
    --verbose)   VERBOSE=true; shift ;;
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
echo -e "${CYAN}  RLAPP — Backend: Suite Completa de Tests${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

FAILED=0

# ── Tests unitarios (siempre) ─────────────────────────────────────────────
echo -e "${YELLOW}[1/2] Tests unitarios${NC}"
UNIT_ARGS=""
$VERBOSE && UNIT_ARGS="--verbose"

if bash "$SCRIPT_DIR/backend-unit.sh" $UNIT_ARGS; then
  echo -e "  ${GREEN}Unitarios: OK${NC}"
else
  echo -e "  ${RED}Unitarios: FALLARON${NC}"
  FAILED=$((FAILED + 1))
fi

# ── Tests de integración (condicional) ───────────────────────────────────
SKIP_INTEGRATION=false

if $UNIT_ONLY; then
  SKIP_INTEGRATION=true
  echo ""
  echo -e "${YELLOW}  [--unit-only] Omitiendo tests de integración.${NC}"
elif ! $FORCE_ALL; then
  # Auto-detectar si Postgres está disponible
  POSTGRES_OK=false
  if docker exec rlapp-postgres pg_isready -q 2>/dev/null; then
    POSTGRES_OK=true
  elif nc -z localhost 5432 2>/dev/null; then
    POSTGRES_OK=true
  fi

  if ! $POSTGRES_OK; then
    SKIP_INTEGRATION=true
    echo ""
    echo -e "${YELLOW}  PostgreSQL no disponible → integración omitida.${NC}"
    echo -e "${YELLOW}  Usa --all para forzar (fallará sin DB).${NC}"
  fi
fi

if ! $SKIP_INTEGRATION; then
  echo ""
  echo -e "${YELLOW}[2/2] Tests de integración${NC}"
  INT_ARGS="--skip-check"
  $VERBOSE && INT_ARGS="--skip-check --verbose"

  if bash "$SCRIPT_DIR/backend-integration.sh" $INT_ARGS; then
    echo -e "  ${GREEN}Integración: OK${NC}"
  else
    echo -e "  ${RED}Integración: FALLARON${NC}"
    FAILED=$((FAILED + 1))
  fi
fi

# ── Resultado final ───────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}================================================================${NC}"
if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}  Backend: TODOS LOS TESTS PASARON${NC}"
else
  echo -e "${RED}  Backend: $FAILED SUITE(S) CON FALLO${NC}"
fi
echo -e "${CYAN}================================================================${NC}"
echo ""

exit $FAILED
