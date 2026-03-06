#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Ejecutor general de tests del frontend
# Orquesta: linter (TypeScript + ESLint) + tests unitarios (Jest).
#
# Uso:
#   ./scripts/test/frontend.sh               # Lint + tests unitarios
#   ./scripts/test/frontend.sh --lint-only   # Solo linter
#   ./scripts/test/frontend.sh --test-only   # Solo tests Jest
#   ./scripts/test/frontend.sh --fix         # Lint con autocorrección + tests
#   ./scripts/test/frontend.sh --verbose     # Salida detallada
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

LINT_ONLY=false
TEST_ONLY=false
FIX=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lint-only) LINT_ONLY=true; shift ;;
    --test-only) TEST_ONLY=true; shift ;;
    --fix)       FIX=true; shift ;;
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
echo -e "${CYAN}  RLAPP — Frontend: Suite Completa${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

FAILED=0

# ── Linter ────────────────────────────────────────────────────────────────
if ! $TEST_ONLY; then
  echo -e "${YELLOW}[1/2] Linter (TypeScript + ESLint)${NC}"
  LINT_ARGS=""
  $FIX && LINT_ARGS="--fix"

  if bash "$SCRIPT_DIR/frontend-lint.sh" $LINT_ARGS; then
    echo -e "  ${GREEN}Linter: OK${NC}"
  else
    echo -e "  ${RED}Linter: FALLO${NC}"
    FAILED=$((FAILED + 1))
  fi
  echo ""
fi

# ── Tests unitarios ────────────────────────────────────────────────────────
if ! $LINT_ONLY; then
  echo -e "${YELLOW}[2/2] Tests unitarios (Jest)${NC}"
  UNIT_ARGS=""
  $VERBOSE && UNIT_ARGS="--verbose"

  if bash "$SCRIPT_DIR/frontend-unit.sh" $UNIT_ARGS; then
    echo -e "  ${GREEN}Tests Jest: OK${NC}"
  else
    echo -e "  ${RED}Tests Jest: FALLARON${NC}"
    FAILED=$((FAILED + 1))
  fi
fi

# ── Resultado final ────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}================================================================${NC}"
if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}  Frontend: TODOS LOS CHECKS PASARON${NC}"
else
  echo -e "${RED}  Frontend: $FAILED CHECK(S) CON FALLO${NC}"
fi
echo -e "${CYAN}================================================================${NC}"
echo ""

exit $FAILED
