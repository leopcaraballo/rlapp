#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Suite global: backend (unitarios) + frontend (lint + tests)
# Ejecuta todos los checks de calidad del repositorio.
#
# Uso:
#   ./scripts/test/all.sh                        # Backend unit + Frontend
#   ./scripts/test/all.sh --with-integration     # Incluye tests de integración
#   ./scripts/test/all.sh --backend-only         # Solo backend
#   ./scripts/test/all.sh --frontend-only        # Solo frontend
#   ./scripts/test/all.sh --verbose              # Salida detallada
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

WITH_INTEGRATION=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-integration) WITH_INTEGRATION=true; shift ;;
    --backend-only)     BACKEND_ONLY=true; shift ;;
    --frontend-only)    FRONTEND_ONLY=true; shift ;;
    --verbose)          VERBOSE=true; shift ;;
    -h|--help)
      head -14 "$0" | tail -12
      exit 0
      ;;
    *)
      echo "Opcion no reconocida: $1"
      exit 1
      ;;
  esac
done

START_TIME=$(date +%s)

echo ""
echo -e "${CYAN}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}  RLAPP — Suite Global de Calidad${NC}"
echo -e "${CYAN}${BOLD}================================================================${NC}"
echo ""

FAILED=0
declare -a RESULTS=()

# ── Backend ────────────────────────────────────────────────────────────────
if ! $FRONTEND_ONLY; then
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  BACKEND${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  BACKEND_ARGS=""
  $VERBOSE && BACKEND_ARGS="--verbose"
  $WITH_INTEGRATION && BACKEND_ARGS="$BACKEND_ARGS --all"

  if bash "$SCRIPT_DIR/backend.sh" $BACKEND_ARGS; then
    RESULTS+=("${GREEN}  Backend:   PASÓ${NC}")
  else
    RESULTS+=("${RED}  Backend:   FALLÓ${NC}")
    FAILED=$((FAILED + 1))
  fi
  echo ""
fi

# ── Frontend ───────────────────────────────────────────────────────────────
if ! $BACKEND_ONLY; then
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  FRONTEND${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  FRONT_ARGS=""
  $VERBOSE && FRONT_ARGS="--verbose"

  if bash "$SCRIPT_DIR/frontend.sh" $FRONT_ARGS; then
    RESULTS+=("${GREEN}  Frontend:  PASÓ${NC}")
  else
    RESULTS+=("${RED}  Frontend:  FALLÓ${NC}")
    FAILED=$((FAILED + 1))
  fi
  echo ""
fi

# ── Resumen ────────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "${CYAN}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}  Resumen Final                         Tiempo: ${ELAPSED}s${NC}"
echo -e "${CYAN}${BOLD}================================================================${NC}"

for r in "${RESULTS[@]}"; do
  echo -e "$r"
done

echo ""
if [[ $FAILED -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}TODOS LOS CHECKS PASARON${NC}"
else
  echo -e "  ${RED}${BOLD}$FAILED SUITE(S) CON FALLO — Revisa los logs anteriores${NC}"
fi
echo -e "${CYAN}${BOLD}================================================================${NC}"
echo ""

exit $FAILED
