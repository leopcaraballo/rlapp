#!/usr/bin/env bash
# =============================================================================
# RLAPP — Shortcut: estado de los servicios Docker
# Equivalente a: scripts/dev/rlapp.sh status
#
# Uso:
#   ./scripts/dev/status.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/rlapp.sh" status "$@"
