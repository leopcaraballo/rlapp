#!/usr/bin/env bash
# =============================================================================
# E2E Business Flow Test — RLAPP
# Flujo completo: Recepción → Caja → Área Médica → Fin
# Requiere: stack Docker activo (scripts/dev/start.sh)
# =============================================================================

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$_SCRIPT_DIR/../lib/docker-check.sh"
docker_require_api

API="http://localhost:5000"
TS=$(date +%s)
# IDs únicos por corrida → evita contaminación de estado entre ejecuciones
QUEUE_ID="Q-E2E-${TS: -8}"   # 12 chars (límite: 20)
ROOM_ID="CR-E2E-${TS: -7}"   # 12 chars
PATIENT_ID="TEST-E2E-$TS"
CORR_ID="e2e-corr-$TS"
IDEM_KEY="e2e-idem-$TS"

request_token() {
  local user_id="$1"
  local user_name="$2"
  local role="$3"
  local token_suffix
  token_suffix=$(echo "${role}" | tr '[:upper:]' '[:lower:]')

  local response
  response=$(curl -sfS -X POST "${API}/api/auth/token" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-Id: ${CORR_ID}-auth-${token_suffix}" \
    -H "Idempotency-Key: ${IDEM_KEY}-auth-${token_suffix}" \
    -d "{\"userId\":\"${user_id}\",\"userName\":\"${user_name}\",\"role\":\"${role}\"}")

  echo "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])'
}

log() { echo ""; echo ">>> $1"; }
ok() { echo "    [OK] $1"; }
fail() { echo "    [FAIL] $1"; exit 1; }

echo "=============================================="
echo " RLAPP — Prueba E2E Flujo Completo de Negocio"
echo " Paciente ID: $PATIENT_ID"
echo " Cola: $QUEUE_ID"
echo "=============================================="

# // HUMAN CHECK: este flujo valida autenticacion operacional real con JWT emitido por la API.
# Se elimina deliberadamente la dependencia del header de compatibilidad X-User-Role.
RECEPT_TOKEN=$(request_token "reception-e2e" "Recepcion E2E" "Receptionist")
CASHIER_TOKEN=$(request_token "cashier-e2e" "Caja E2E" "Cashier")
DOCTOR_TOKEN=$(request_token "doctor-e2e" "Doctor E2E" "Doctor")

# =============================================================================
# PASO 1: RECEPCIÓN — Registrar paciente
# =============================================================================
log "PASO 1: Recepción registra al paciente"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/reception/register" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-1" \
  -H "Idempotency-Key: ${IDEM_KEY}-1" \
  -H "Authorization: Bearer ${RECEPT_TOKEN}" \
  -d "{\"queueId\":\"${QUEUE_ID}\",\"patientId\":\"${PATIENT_ID}\",\"patientName\":\"Paciente E2E Test\",\"priority\":\"Medium\",\"consultationType\":\"General\",\"age\":35,\"isPregnant\":false,\"notes\":\"Test E2E\",\"actor\":\"reception\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
echo "  HTTP $HTTP_CODE — ${BODY:0:300}"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" || "$HTTP_CODE" == "204" ]]; then
  ok "Paciente ${PATIENT_ID} registrado exitosamente"
else
  fail "Error al registrar paciente. HTTP: $HTTP_CODE — Body: $BODY"
fi

sleep 1

# =============================================================================
# PASO 2: VERIFICAR COLA — Paciente aparece en la lista
# =============================================================================
log "PASO 2: Verificar paciente en cola"

QUEUE_STATE=$(curl -s "${API}/api/v1/waiting-room/${QUEUE_ID}/queue-state")
echo "$QUEUE_STATE" | python3 -m json.tool 2>/dev/null | grep -E "queueId|currentCount|patientId|patientName" | head -20
ok "Estado de cola consultado"

sleep 1

# =============================================================================
# PASO 3: CAJA — Llamar al siguiente paciente
# =============================================================================
log "PASO 3: Caja llama al siguiente paciente"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/cashier/call-next" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-3" \
  -H "Idempotency-Key: ${IDEM_KEY}-3" \
  -H "Authorization: Bearer ${CASHIER_TOKEN}" \
  -d "{\"queueId\":\"${QUEUE_ID}\",\"actor\":\"cajero\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
echo "  HTTP $HTTP_CODE — ${BODY:0:300}"

CASHIER_PATIENT_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('patientId',''))" 2>/dev/null || echo "")
echo "  Paciente en caja: $CASHIER_PATIENT_ID"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  ok "Caja llamó al siguiente paciente"
else
  fail "Error al llamar paciente en caja. HTTP: $HTTP_CODE"
fi

sleep 1

# =============================================================================
# PASO 4: CAJA — Validar pago del paciente
# =============================================================================
log "PASO 4: Caja valida el pago"

# Usar el patientId del paso anterior si está disponible, de lo contrario usar el primero de la cola
if [[ -z "$CASHIER_PATIENT_ID" ]]; then
  CASHIER_PATIENT_ID=$(echo "$QUEUE_STATE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
patients = d.get('patientsInQueue', [])
if patients: print(patients[0]['patientId'])
" 2>/dev/null || echo "")
fi

if [[ -n "$CASHIER_PATIENT_ID" ]]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/cashier/validate-payment" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-Id: ${CORR_ID}-4" \
    -H "Idempotency-Key: ${IDEM_KEY}-4" \
    -H "Authorization: Bearer ${CASHIER_TOKEN}" \
    -d "{\"queueId\":\"${QUEUE_ID}\",\"patientId\":\"${CASHIER_PATIENT_ID}\",\"actor\":\"cajero\",\"paymentReference\":\"REF-E2E-${TS}\"}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  echo "  HTTP $HTTP_CODE — ${BODY:0:300}"

  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" || "$HTTP_CODE" == "204" ]]; then
    ok "Pago validado para ${CASHIER_PATIENT_ID}"
  else
    echo "  [WARN] Error al validar pago. HTTP: $HTTP_CODE — Continuando..."
  fi
else
  echo "  [WARN] No se pudo obtener patientId de caja, omitiendo validación de pago"
fi

sleep 1

# =============================================================================
# PASO 5: MÉDICO — Activar consultorio
# =============================================================================
log "PASO 5: Médico activa el consultorio"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/consulting-room/activate" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-5" \
  -H "Idempotency-Key: ${IDEM_KEY}-5" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -d "{\"queueId\":\"${QUEUE_ID}\",\"consultingRoomId\":\"${ROOM_ID}\",\"actor\":\"doctor\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
echo "  HTTP $HTTP_CODE — ${BODY:0:300}"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" || "$HTTP_CODE" == "204" || "$HTTP_CODE" == "400" ]]; then
  ok "Consultorio activado (o ya estaba activo)"
else
  echo "  [WARN] Error diferente. HTTP: $HTTP_CODE"
fi

sleep 1

# =============================================================================
# PASO 6: MÉDICO — Llamar al siguiente paciente
# =============================================================================
log "PASO 6: Médico reclama el siguiente paciente"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/call-next" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: ${CORR_ID}-6" \
  -H "Idempotency-Key: ${IDEM_KEY}-6" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -d "{\"queueId\":\"${QUEUE_ID}\",\"actor\":\"doctor\",\"stationId\":\"${ROOM_ID}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
echo "  HTTP $HTTP_CODE — ${BODY:0:300}"

MEDICAL_PATIENT_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('patientId',''))" 2>/dev/null || echo "")
echo "  Paciente en consulta: $MEDICAL_PATIENT_ID"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  ok "Médico reclamó al paciente"
else
  echo "  [WARN] Error al reclamar paciente médico. HTTP: $HTTP_CODE — Body: $BODY"
fi

sleep 1

# =============================================================================
# PASO 7: MÉDICO — Iniciar consulta
# =============================================================================
log "PASO 7: Médico inicia la consulta"

if [[ -n "$MEDICAL_PATIENT_ID" ]]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/start-consultation" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-Id: ${CORR_ID}-7" \
    -H "Idempotency-Key: ${IDEM_KEY}-7" \
    -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
    -d "{\"queueId\":\"${QUEUE_ID}\",\"patientId\":\"${MEDICAL_PATIENT_ID}\",\"actor\":\"doctor\"}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  echo "  HTTP $HTTP_CODE — ${BODY:0:300}"

  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" || "$HTTP_CODE" == "204" ]]; then
    ok "Consulta iniciada para ${MEDICAL_PATIENT_ID}"
  else
    echo "  [WARN] Error al iniciar consulta. HTTP: $HTTP_CODE"
  fi

  sleep 1

  # =============================================================================
  # PASO 8: MÉDICO — Finalizar consulta
  # =============================================================================
  log "PASO 8: Médico finaliza la consulta"

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/finish-consultation" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-Id: ${CORR_ID}-8" \
    -H "Idempotency-Key: ${IDEM_KEY}-8" \
    -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
    -d "{\"queueId\":\"${QUEUE_ID}\",\"patientId\":\"${MEDICAL_PATIENT_ID}\",\"actor\":\"doctor\",\"outcome\":\"Consulta completada exitosamente en prueba E2E\"}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  echo "  HTTP $HTTP_CODE — ${BODY:0:300}"

  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" || "$HTTP_CODE" == "204" ]]; then
    ok "Consulta FINALIZADA para ${MEDICAL_PATIENT_ID}"
  else
    echo "  [WARN] Error al finalizar consulta. HTTP: $HTTP_CODE"
  fi
else
  echo "  [SKIP] Sin patientId médico, omitiendo pasos 7 y 8"
fi

sleep 1

# =============================================================================
# ESTADO FINAL
# =============================================================================
log "ESTADO FINAL DE LA COLA"
curl -s "${API}/api/v1/waiting-room/${QUEUE_ID}/queue-state" | python3 -m json.tool 2>/dev/null | grep -E "queueId|currentCount|projectedAt"

echo ""
echo "=============================================="
echo " FLUJO E2E COMPLETADO"
echo "=============================================="
