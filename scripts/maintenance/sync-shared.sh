#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Verificacion de consistencia del monorepo
# Verifica que los contratos compartidos entre apps/backend y apps/frontend
# esten sincronizados y sean coherentes.
#
# Uso: ./scripts/maintenance/sync-shared.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$REPO_ROOT/apps/backend"
FRONTEND="$REPO_ROOT/apps/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  RLAPP — Verificacion de consistencia del monorepo${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

ERRORS=0

check() {
  local desc="$1"
  local result="$2"
  if [[ "$result" == "ok" ]]; then
    echo -e "  ${GREEN}OK${NC}  $desc"
  else
    echo -e "  ${RED}FAIL${NC} $desc — $result"
    ERRORS=$((ERRORS + 1))
  fi
}

# ─── 1. Verificar que apps/backend existe y tiene solucion .NET ───────────────
echo -e "${YELLOW}[1/4] Verificando backend...${NC}"
[[ -f "$BACKEND/RLAPP.slnx" ]] && check "RLAPP.slnx presente" "ok" \
  || check "RLAPP.slnx presente" "no encontrado en $BACKEND"
[[ -f "$BACKEND/Dockerfile" ]] && check "Dockerfile backend presente" "ok" \
  || check "Dockerfile backend presente" "no encontrado"
echo ""

# ─── 2. Verificar que apps/frontend existe y tiene package.json ────────────────
echo -e "${YELLOW}[2/4] Verificando frontend...${NC}"
[[ -f "$FRONTEND/package.json" ]] && check "package.json frontend presente" "ok" \
  || check "package.json frontend presente" "no encontrado en $FRONTEND"
[[ -f "$FRONTEND/Dockerfile" ]] && check "Dockerfile frontend presente" "ok" \
  || check "Dockerfile frontend presente" "no encontrado"
echo ""

# ─── 3. Verificar infraestructura ──────────────────────────────────────────────
echo -e "${YELLOW}[3/4] Verificando infraestructura...${NC}"
for f in \
  "$REPO_ROOT/docker-compose.yml" \
  "$REPO_ROOT/infrastructure/database/postgres/init.sql" \
  "$REPO_ROOT/infrastructure/messaging/rabbitmq/rabbitmq.conf"; do
  [[ -f "$f" ]] && check "$(basename $f)" "ok" \
    || check "$(basename $f)" "no encontrado: $f"
done
echo ""

# ─── 4. Verificar docs/decisions (contexto del agente) ─────────────────────────
echo -e "${YELLOW}[4/4] Verificando docs/decisions...${NC}"
for doc in PROJECT_CONTEXT.md RULES.md WORKFLOW.md SKILL_REGISTRY.md; do
  [[ -f "$REPO_ROOT/docs/decisions/$doc" ]] && check "$doc" "ok" \
    || check "$doc" "no encontrado en docs/decisions/"
done
echo ""

# ─── Resultado ─────────────────────────────────────────────────────────────────
echo -e "${CYAN}================================================================${NC}"
if [[ "$ERRORS" -eq 0 ]]; then
  echo -e "${GREEN}  Consistencia del monorepo: OK (0 errores)${NC}"
else
  echo -e "${RED}  Consistencia del monorepo: FALLO ($ERRORS errores)${NC}"
  exit 1
fi
echo -e "${CYAN}================================================================${NC}"
echo ""

