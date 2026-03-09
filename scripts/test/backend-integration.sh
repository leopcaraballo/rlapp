#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Tests de integración del backend
# Requiere: PostgreSQL corriendo en localhost:5432
#           (inicia con: ./scripts/dev/start.sh infra)
#
# Uso:
#   ./scripts/test/backend-integration.sh           # Todos los tests de integración
#   ./scripts/test/backend-integration.sh --verbose # Salida detallada
#   ./scripts/test/backend-integration.sh --skip-check # No verifica PostgreSQL
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$REPO_ROOT/apps/backend"
INTEGRATION_PROJ="$BACKEND/src/Tests/WaitingRoom.Tests.Integration/WaitingRoom.Tests.Integration.csproj"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

VERBOSE=false
SKIP_CHECK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose)     VERBOSE=true; shift ;;
    --skip-check)  SKIP_CHECK=true; shift ;;
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
echo -e "${CYAN}  RLAPP — Backend: Tests de Integración${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Verificar PostgreSQL disponible
if ! $SKIP_CHECK; then
  echo -e "${YELLOW}  Verificando PostgreSQL en localhost:5432...${NC}"
  if docker exec rlapp-postgres pg_isready -U rlapp >/dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC} — PostgreSQL disponible"
  elif nc -z localhost 5432 >/dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC} — PostgreSQL disponible (sin Docker)"
  else
    echo -e "  ${RED}ERROR${NC} — PostgreSQL no disponible en localhost:5432"
    echo ""
    echo -e "  ${YELLOW}Inicia la infraestructura con:${NC}"
    echo "    ./scripts/dev/start.sh infra"
    echo ""
    exit 1
  fi
  echo ""
fi

VERBOSITY="minimal"
$VERBOSE && VERBOSITY="normal"

echo -e "${YELLOW}  Ejecutando: WaitingRoom.Tests.Integration${NC}"
cd "$BACKEND"
dotnet test "$INTEGRATION_PROJ" \
  --configuration Release \
  --verbosity "$VERBOSITY"

echo ""
echo -e "${GREEN}  Tests de integración completados.${NC}"
echo ""
