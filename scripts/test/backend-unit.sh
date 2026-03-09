#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Tests unitarios del backend
# Capa: Domain + Application + Projections (sin dependencias externas)
#
# Uso:
#   ./scripts/test/backend-unit.sh              # Todos los unitarios
#   ./scripts/test/backend-unit.sh --domain     # Solo Domain
#   ./scripts/test/backend-unit.sh --application # Solo Application
#   ./scripts/test/backend-unit.sh --projections # Solo Projections
#   ./scripts/test/backend-unit.sh --verbose    # Salida detallada test a test
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$REPO_ROOT/apps/backend"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN=false
APPLICATION=false
PROJECTIONS=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)      DOMAIN=true; shift ;;
    --application) APPLICATION=true; shift ;;
    --projections) PROJECTIONS=true; shift ;;
    --verbose)     VERBOSE=true; shift ;;
    -h|--help)
      head -14 "$0" | tail -10
      exit 0
      ;;
    *)
      echo "Opcion no reconocida: $1"
      exit 1
      ;;
  esac
done

# Si no se especifica ninguno, ejecutar todos
if ! $DOMAIN && ! $APPLICATION && ! $PROJECTIONS; then
  DOMAIN=true
  APPLICATION=true
  PROJECTIONS=true
fi

VERBOSITY="minimal"
$VERBOSE && VERBOSITY="normal"

PROJECTS=()
$DOMAIN      && PROJECTS+=("$BACKEND/src/Tests/WaitingRoom.Tests.Domain/WaitingRoom.Tests.Domain.csproj")
$APPLICATION && PROJECTS+=("$BACKEND/src/Tests/WaitingRoom.Tests.Application/WaitingRoom.Tests.Application.csproj")
$PROJECTIONS && PROJECTS+=("$BACKEND/src/Tests/WaitingRoom.Tests.Projections/WaitingRoom.Tests.Projections.csproj")

echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  RLAPP — Backend: Tests Unitarios${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

TOTAL_PASS=0
TOTAL_FAIL=0

for proj in "${PROJECTS[@]}"; do
  name="$(basename "$(dirname "$proj")")"
  echo -e "${YELLOW}  Ejecutando: $name${NC}"
  result=$(cd "$BACKEND" && dotnet test "$proj" \
    --configuration Release \
    --verbosity "$VERBOSITY" \
    --no-restore \
    2>&1) || true

  passed=$(echo "$result" | grep -oP 'Superado:\s*\K\d+' || echo 0)
  failed=$(echo "$result" | grep -oP 'Con error:\s*\K\d+' || echo 0)

  TOTAL_PASS=$((TOTAL_PASS + passed))
  TOTAL_FAIL=$((TOTAL_FAIL + failed))

  if [[ "$failed" -eq 0 ]]; then
    echo -e "  ${GREEN}OK${NC} — $passed tests pasaron"
  else
    echo -e "  ${RED}FAIL${NC} — $failed fallaron / $passed pasaron"
    $VERBOSE && echo "$result"
  fi
done

echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "  Total: ${GREEN}$TOTAL_PASS pasaron${NC} / ${RED}$TOTAL_FAIL fallaron${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

[[ "$TOTAL_FAIL" -eq 0 ]]
