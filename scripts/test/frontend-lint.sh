#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Linter del frontend (ESLint + TypeScript)
#
# Uso:
#   ./scripts/test/frontend-lint.sh        # Verifica errores sin corregir
#   ./scripts/test/frontend-lint.sh --fix  # Corrige automáticamente lo posible
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND="$REPO_ROOT/apps/frontend"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

FIX=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fix)    FIX=true; shift ;;
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
echo -e "${CYAN}  RLAPP — Frontend: Linter (ESLint + TypeScript)${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo -e "${YELLOW}  node_modules no encontrado. Ejecutando npm install...${NC}"
  cd "$FRONTEND" && npm install --silent
  echo ""
fi

cd "$FRONTEND"

# TypeScript check (tsc --noEmit)
echo -e "${YELLOW}  [1/2] Verificando tipos TypeScript (tsc --noEmit)...${NC}"
if npx tsc --noEmit 2>&1; then
  echo -e "  ${GREEN}TypeScript: sin errores${NC}"
else
  echo -e "  ${RED}TypeScript: errores encontrados${NC}"
  exit 1
fi

echo ""

# ESLint
echo -e "${YELLOW}  [2/2] ESLint...${NC}"
LINT_CMD="npm run lint"
$FIX && LINT_CMD="npm run lint -- --fix"

if $LINT_CMD; then
  echo -e "  ${GREEN}ESLint: sin errores${NC}"
else
  echo -e "  ${RED}ESLint: errores encontrados${NC}"
  $FIX || echo -e "  ${YELLOW}  Intenta con --fix para corrección automática.${NC}"
  exit 1
fi

echo ""
echo -e "  ${GREEN}Linter completado sin errores.${NC}"
echo ""
