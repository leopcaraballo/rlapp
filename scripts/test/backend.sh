#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Suite general de tests del backend
# Delegador hacia apps/backend/run-complete-test.sh (4 capas).
#
# Uso:
#   scripts/test/backend.sh                # Capas 1+2 (+3 si Docker activo)
#   scripts/test/backend.sh --unit-only    # Solo capa 1 (unitarios)
#   scripts/test/backend.sh --all          # Todas las capas (requiere stack)
#   scripts/test/backend.sh --verbose      # Salida detallada
#   scripts/test/backend.sh --clean        # Limpia bin/obj antes de correr
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_COMPLETE="$REPO_ROOT/apps/backend/run-complete-test.sh"

if [[ ! -f "$RUN_COMPLETE" ]]; then
  echo "ERROR: No se encontró $RUN_COMPLETE"
  exit 1
fi

exec bash "$RUN_COMPLETE" "$@"

