#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Cobertura de tests del backend
# Delegador hacia apps/backend/run-coverage.sh
#
# Uso:
#   scripts/test/backend-coverage.sh             # Cobertura (umbral 80%)
#   scripts/test/backend-coverage.sh --report    # Genera reporte HTML
#   scripts/test/backend-coverage.sh --check 90  # Umbral personalizado
#
# Prerequisito: dotnet tool install -g dotnet-reportgenerator-globaltool
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_COVERAGE="$REPO_ROOT/apps/backend/run-coverage.sh"

if [[ ! -f "$RUN_COVERAGE" ]]; then
  echo "ERROR: No se encontró $RUN_COVERAGE"
  exit 1
fi

exec bash "$RUN_COVERAGE" "$@"

