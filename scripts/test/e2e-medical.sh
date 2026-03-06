#!/usr/bin/env bash
# =============================================================================
# E2E Medical Flow — RLAPP
# Activa consultorio y prueba flujo del médico.
# Requiere: stack Docker activo (scripts/dev/start.sh)
# =============================================================================
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$_SCRIPT_DIR/../lib/docker-check.sh"
docker_require_api

API="http://localhost:5000"
QUEUE="QUEUE-01"

echo "--- Activar consultorio CONS-01 (campo: consultingRoomId) ---"
curl -s -X POST "$API/api/medical/consulting-room/activate" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: act-$(date +%s%3N)" \
  -d '{"queueId":"QUEUE-01","consultingRoomId":"CONS-01","actor":"doctor"}'
echo ""

sleep 1

echo "--- Reclamar siguiente paciente (médico) ---"
curl -s -X POST "$API/api/medical/call-next" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: med-$(date +%s%3N)" \
  -d '{"queueId":"QUEUE-01","actor":"doctor","stationId":"CONS-01"}'
echo ""

sleep 2

echo "--- Verificar next-turn (debe ser claimed) ---"
curl -s "$API/api/v1/waiting-room/$QUEUE/next-turn"
echo ""

echo "--- Monitor final ---"
curl -s "$API/api/v1/waiting-room/$QUEUE/monitor"
echo ""
