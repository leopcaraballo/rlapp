#!/usr/bin/env bash
# =============================================================================
# RLAPP — Shortcut: logs de servicios Docker
# Equivalente a: scripts/dev/rlapp.sh logs [servicio]
#
# Uso:
#   ./scripts/dev/logs.sh            # Logs de todos los servicios
#   ./scripts/dev/logs.sh api        # Logs del servicio api
#   ./scripts/dev/logs.sh -f api     # Logs en tiempo real
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/rlapp.sh" logs "$@"
