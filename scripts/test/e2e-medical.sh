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
TS=$(date +%s%3N)
# IDs únicos por corrida → evita contaminación de estado entre ejecuciones
QUEUE="Q-MED-${TS: -8}"   # 12 chars (límite: 20)
ROOM="CR-MED-${TS: -7}"   # 12 chars
PATIENT="P-MED-${TS: -9}" # 14 chars
CORR_ID="e2e-med-$TS"
IDEM_KEY="e2e-med-idem-$TS"

request_token() {
  local user_id="$1"
  local user_name="$2"
  local role="$3"
  local token_suffix
  token_suffix=$(echo "$role" | tr '[:upper:]' '[:lower:]')

  local response
  response=$(curl -sfS -X POST "$API/api/auth/token" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-Id: ${CORR_ID}-auth-${token_suffix}" \
    -H "Idempotency-Key: ${IDEM_KEY}-auth-${token_suffix}" \
    -d "{\"userId\":\"${user_id}\",\"userName\":\"${user_name}\",\"role\":\"${role}\"}")

  echo "$response" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("token") or data.get("Token") or "")'
}

RECEPT_TOKEN=$(request_token "reception-med" "Recepcion Med" "Receptionist")
CASHIER_TOKEN=$(request_token "cashier-med" "Caja Med" "Cashier")
DOCTOR_TOKEN=$(request_token "doctor-med" "Doctor Med" "Doctor")

echo ""
echo "========================================"
echo "  E2E MÉDICO — IDs únicos por corrida"
echo "  Queue: $QUEUE | Room: $ROOM"
echo "========================================"

# ─── SETUP: Registrar y llevar el paciente hasta pago validado ───
echo ""
echo "[SETUP] Registrar paciente..."
curl -sf -X POST "$API/api/reception/register" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-1" \
  -H "Idempotency-Key: med-reg-$TS" \
  -H "Authorization: Bearer ${RECEPT_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"patientId\":\"$PATIENT\",\"patientName\":\"Paciente Medico\",\"priority\":\"Medium\",\"consultationType\":\"General\",\"actor\":\"recepcion\"}" > /dev/null
echo "  ✅ Paciente $PATIENT registrado en $QUEUE"

sleep 1

echo "[SETUP] Cajero llama siguiente..."
CASHIER_RESP=$(curl -sf -X POST "$API/api/cashier/call-next" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-2" \
  -H "Idempotency-Key: med-cash-$TS" \
  -H "Authorization: Bearer ${CASHIER_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"actor\":\"cajero\"}")
CALLED_ID=$(echo "$CASHIER_RESP" | grep -o '"patientId":"[^"]*"' | cut -d'"' -f4)
echo "  ✅ Cajero llamó: $CALLED_ID"

sleep 1

echo "[SETUP] Validar pago..."
curl -sf -X POST "$API/api/cashier/validate-payment" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-3" \
  -H "Idempotency-Key: med-pay-$TS" \
  -H "Authorization: Bearer ${CASHIER_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"patientId\":\"$CALLED_ID\",\"actor\":\"cajero\",\"paymentReference\":\"REF-MED-$TS\"}" > /dev/null
echo "  ✅ Pago validado"

sleep 1

# ─── FLUJO MÉDICO ───
echo ""
echo "--- Activar consultorio $ROOM ---"
curl -sf -X POST "$API/api/medical/consulting-room/activate" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-4" \
  -H "Idempotency-Key: med-act-$TS" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"consultingRoomId\":\"$ROOM\",\"actor\":\"doctor\"}"
echo ""

sleep 1

echo "--- Reclamar siguiente paciente (médico) ---"
MED_RESP=$(curl -sf -X POST "$API/api/medical/call-next" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-5" \
  -H "Idempotency-Key: med-call-$TS" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"actor\":\"doctor\",\"stationId\":\"$ROOM\"}")
echo "$MED_RESP"
MED_PATIENT=$(echo "$MED_RESP" | grep -o '"patientId":"[^"]*"' | cut -d'"' -f4)
echo ""

sleep 2

echo "--- Verificar next-turn (debe ser claimed) ---"
TURN=$(curl -sf "$API/api/v1/waiting-room/$QUEUE/next-turn")
echo "$TURN"
TURN_STATUS=$(echo "$TURN" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo ""

echo "--- Monitor final ---"
curl -s "$API/api/v1/waiting-room/$QUEUE/monitor"
echo ""

echo ""
echo "========================================"
if [ "$TURN_STATUS" = "claimed" ]; then
  echo "  ✅ FLUJO MÉDICO COMPLETADO: status=$TURN_STATUS, patient=$MED_PATIENT"
else
  echo "  ❌ FALLO: next-turn status inesperado: $TURN_STATUS"
  exit 1
fi
echo "========================================"
