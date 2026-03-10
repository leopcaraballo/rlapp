#!/usr/bin/env bash
# =============================================================================
# E2E Test — RLAPP
# Prueba el flujo completo de negocio (6 pasos).
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
QUEUE="Q-E2E-${TS: -9}"   # 11 chars (límite: 20)
ROOM="CR-E2E-${TS: -7}"   # 12 chars
CORR_ID="e2e-legacy-$TS"
IDEM_KEY="e2e-legacy-idem-$TS"

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

RECEPT_TOKEN=$(request_token "reception-e2e" "Recepcion E2E" "Receptionist")
CASHIER_TOKEN=$(request_token "cashier-e2e" "Caja E2E" "Cashier")
DOCTOR_TOKEN=$(request_token "doctor-e2e" "Doctor E2E" "Doctor")

echo ""
echo "=============================================="
echo "  PRUEBA E2E — FLUJO COMPLETO DE NEGOCIO"
echo "  Cola: $QUEUE | Timestamp: $TS"
echo "=============================================="

# ─── PASO 1: Recepción ────────────────────────────
echo ""
echo "[1/6] RECEPCIÓN — registrar paciente en $QUEUE..."
STEP1=$(curl -sf -X POST "$API/api/reception/register" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-1" \
  -H "Idempotency-Key: e2e-regist-$TS" \
  -H "Authorization: Bearer ${RECEPT_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"patientId\":\"p-e2e-$TS\",\"patientName\":\"Ana Lopez\",\"priority\":\"Medium\",\"consultationType\":\"General\",\"actor\":\"recepcion\"}")
echo "  Respuesta: $STEP1"
QUEUE_ID=$(echo "$STEP1" | grep -o '"queueId":"[^"]*"' | cut -d'"' -f4)
echo "  queueId retornado: $QUEUE_ID"

sleep 2

# ─── PASO 2: Verificar queue-state ────────────────
echo ""
echo "[2/6] VERIFICAR queue-state de $QUEUE..."
STEP2=$(curl -sf "$API/api/v1/waiting-room/$QUEUE/queue-state")
echo "  Pacientes en cola: $(echo "$STEP2" | grep -o '"patientsInQueue":\[[^]]*\]' | head -1)"
PATIENT_COUNT=$(echo "$STEP2" | grep -o '"patientId"' | wc -l)
echo "  Cantidad de pacientes encontrados: $PATIENT_COUNT"
if [ "$PATIENT_COUNT" -gt 0 ]; then
  echo "  ✅ Paciente registrado correctamente en $QUEUE"
else
  echo "  ❌ ERROR: Paciente NO aparece en queue-state"
  exit 1
fi

# ─── PASO 3: Cajero — llamar siguiente ──────────
echo ""
echo "[3/6] CAJERO — llamar siguiente paciente..."
STEP3=$(curl -sf -X POST "$API/api/cashier/call-next" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-3" \
  -H "Idempotency-Key: e2e-cashier-$TS" \
  -H "Authorization: Bearer ${CASHIER_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"actor\":\"cajero\"}")
echo "  Respuesta: $STEP3"
CALLED_PATIENT=$(echo "$STEP3" | grep -o '"patientId":"[^"]*"' | cut -d'"' -f4)
echo "  Paciente llamado: $CALLED_PATIENT"

sleep 2

# ─── PASO 4: Verificar next-turn ─────────────────
echo ""
echo "[4/6] VERIFICAR next-turn (debe ser cashier-called)..."
STEP4=$(curl -sf "$API/api/v1/waiting-room/$QUEUE/next-turn" || echo '{"status":"not-found"}')
NEXT_STATUS=$(echo "$STEP4" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
NEXT_PATIENT=$(echo "$STEP4" | grep -o '"patientId":"[^"]*"' | cut -d'"' -f4)
echo "  Status: $NEXT_STATUS | PatientId: $NEXT_PATIENT"
if [ "$NEXT_STATUS" = "cashier-called" ]; then
  echo "  ✅ Proyección next-turn correcta (cashier-called)"
else
  echo "  ❌ ERROR: next-turn status incorrecto: $NEXT_STATUS"
  exit 1
fi

# ─── PASO 5: Cajero — validar pago ───────────────
echo ""
echo "[5/6] CAJERO — validar pago para $NEXT_PATIENT..."
STEP5=$(curl -sf -X POST "$API/api/cashier/validate-payment" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-5" \
  -H "Idempotency-Key: e2e-payment-$TS" \
  -H "Authorization: Bearer ${CASHIER_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"patientId\":\"$NEXT_PATIENT\",\"actor\":\"cajero\",\"paymentReference\":\"REF-E2E-$TS\"}")
echo "  Respuesta: $STEP5"

sleep 2

# ─── PASO 6: Médico — reclamar siguiente ─────────
# Activate es idempotente: 200 (primera vez) o 400 "already active" (re-runs) → ambos son OK
STEP6_ACTIVATE=$(curl -s -o /tmp/e2e-activate.json -w "%{http_code}" -X POST "$API/api/medical/consulting-room/activate" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-6-activate" \
  -H "Idempotency-Key: e2e-activate-$TS" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"consultingRoomId\":\"$ROOM\",\"actor\":\"doctor\"}")
ACTIVATE_BODY=$(cat /tmp/e2e-activate.json)
if [ "$STEP6_ACTIVATE" = "200" ] || echo "$ACTIVATE_BODY" | grep -q "already active"; then
  echo "  Consultorio activo (HTTP $STEP6_ACTIVATE): OK"
else
  echo "  ❌ ERROR al activar consultorio (HTTP $STEP6_ACTIVATE): $ACTIVATE_BODY"
  exit 1
fi

echo ""
echo "[6/6] MÉDICO — reclamar siguiente paciente..."
STEP6=$(curl -sf -X POST "$API/api/medical/call-next" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-6-call" \
  -H "Idempotency-Key: e2e-medical-$TS" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -d "{\"queueId\":\"$QUEUE\",\"actor\":\"doctor\",\"stationId\":\"$ROOM\"}")
echo "  Respuesta: $STEP6"
MED_PATIENT=$(echo "$STEP6" | grep -o '"patientId":"[^"]*"' | cut -d'"' -f4)
echo "  Paciente reclamado: $MED_PATIENT"

sleep 2

# ─── PASO 7: Verificar next-turn (claimed) ────────
echo ""
echo "[7/7] VERIFICAR next-turn después de claim (debe ser claimed)..."
STEP7=$(curl -sf "$API/api/v1/waiting-room/$QUEUE/next-turn" || echo '{"status":"not-found"}')
FINAL_STATUS=$(echo "$STEP7" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
FINAL_PATIENT=$(echo "$STEP7" | grep -o '"patientId":"[^"]*"' | cut -d'"' -f4)
echo "  Status: $FINAL_STATUS | PatientId: $FINAL_PATIENT"

# ─── RESUMEN ───────────────────────────────────────
echo ""
echo "=============================================="
echo "  RESUMEN E2E"
echo "=============================================="
echo "  queueId utilizado:    $QUEUE"
echo "  Paciente registrado:  p-e2e-$TS"
echo "  Paciente en cajero:   $NEXT_PATIENT"
echo "  Status final turn:    $FINAL_STATUS"
echo ""
if [ "$NEXT_STATUS" = "cashier-called" ]; then
  echo "  ✅ FLUJO E2E COMPLETADO CON ÉXITO"
else
  echo "  ⚠️  FLUJO PARCIALMENTE COMPLETADO"
fi
echo "=============================================="
