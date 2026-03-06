#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# RLAPP — Simulación de flujo completo del sistema
# Ciclo: check-in → caja (call-next + validate-payment) → médico (call-next + finish)
#
# Payloads alineados con los DTOs del backend:
#   CheckInPatientDto:    patientId, patientName, priority, consultationType, actor (required)
#   CallNextCashierDto:   queueId, actor (required), cashierDeskId (optional)
#   ValidatePaymentDto:   queueId, patientId, actor (required), paymentReference (optional)
#   ClaimNextPatientDto:  queueId, actor (required), stationId (optional)
#   CompleteAttentionDto: queueId, patientId, actor (required), outcome, notes (optional)
#
# Headers requeridos:
#   Idempotency-Key: UUID (obligatorio para POST — middleware IdempotencyKeyMiddleware)
#   X-User-Role: Receptionist (obligatorio para check-in — ReceptionistOnlyFilter)
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

API="http://localhost:5000"
QUEUE_ID="QUEUE-01"
PATIENT_ID="PAT-$(date +%s)"
PATIENT_NAME="Juan García Pérez"
ACTOR_RECEPTION="reception-desk-1"
ACTOR_CASHIER="cashier-desk-1"
ACTOR_DOCTOR="doctor-room-1"
ERRORS=0

# Utilidad para verificar respuesta JSON
check_response() {
  local step="$1"
  local response="$2"
  local success
  success=$(echo "$response" | grep -o '"success":true' || true)
  if [[ -n "$success" ]]; then
    echo -e "${GREEN}✓ ${step} — OK${NC}"
  else
    echo -e "${RED}✗ ${step} — FALLO${NC}"
    echo "  Respuesta: $response"
    ERRORS=$((ERRORS + 1))
  fi
}

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  RLAPP — Simulación Automatizada de Flujo Completo (8 pasos)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  PatientId:  $PATIENT_ID"
echo "  QueueId:    $QUEUE_ID"
echo "  API:        $API"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 1: Check-in del paciente (Reception)
# Backend DTO: CheckInPatientDto
# Filter: ReceptionistOnlyFilter → requiere X-User-Role: Receptionist
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/8] Check-in de paciente...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/waiting-room/check-in" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "X-User-Role: Receptionist" \
  -d "{
    \"patientId\": \"${PATIENT_ID}\",
    \"patientName\": \"${PATIENT_NAME}\",
    \"priority\": \"Medium\",
    \"consultationType\": \"General\",
    \"age\": 35,
    \"isPregnant\": false,
    \"notes\": \"Simulación automatizada\",
    \"actor\": \"${ACTOR_RECEPTION}\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE — $BODY"
check_response "Check-in" "$BODY"

# Extraer queueId generado por el backend (si difiere del enviado)
GENERATED_QUEUE=$(echo "$BODY" | grep -o '"queueId":"[^"]*' | cut -d'"' -f4 || echo "$QUEUE_ID")
if [[ -n "$GENERATED_QUEUE" && "$GENERATED_QUEUE" != "null" ]]; then
  QUEUE_ID="$GENERATED_QUEUE"
  echo "  QueueId asignado: $QUEUE_ID"
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 2: Verificar estado de la cola (Query)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/8] Obteniendo estado de la cola...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API}/api/v1/waiting-room/${QUEUE_ID}/queue-state")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE"
if [[ "$HTTP_CODE" == "200" ]]; then
  PATIENT_COUNT=$(echo "$BODY" | grep -o '"currentCount":[0-9]*' | cut -d':' -f2 || echo "?")
  echo -e "${GREEN}✓ Cola obtenida — $PATIENT_COUNT paciente(s) en cola${NC}"
else
  echo -e "${YELLOW}⚠ Cola no encontrada (normal si es el primer check-in)${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 3: Caja — Llamar siguiente paciente
# Backend DTO: CallNextCashierDto
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/8] Caja: llamando siguiente paciente...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/cashier/call-next" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"queueId\": \"${QUEUE_ID}\",
    \"actor\": \"${ACTOR_CASHIER}\",
    \"cashierDeskId\": \"DESK-01\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE — $BODY"
check_response "Cashier call-next" "$BODY"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 4: Caja — Validar pago
# Backend DTO: ValidatePaymentDto
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/8] Caja: validando pago...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/cashier/validate-payment" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"queueId\": \"${QUEUE_ID}\",
    \"patientId\": \"${PATIENT_ID}\",
    \"actor\": \"${ACTOR_CASHIER}\",
    \"paymentReference\": \"PAY-$(date +%s)\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE — $BODY"
check_response "Validate payment" "$BODY"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 5: Médico — Activar consultorio (PREREQUISITO)
# Backend DTO: ActivateConsultingRoomDto { queueId, consultingRoomId, actor }
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/8] Médico: activando consultorio ROOM-01...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/consulting-room/activate" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"queueId\": \"${QUEUE_ID}\",
    \"consultingRoomId\": \"ROOM-01\",
    \"actor\": \"${ACTOR_DOCTOR}\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE — $BODY"
check_response "Activate consulting room" "$BODY"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 6: Médico — Reclamar siguiente paciente
# Backend DTO: ClaimNextPatientDto
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[6/8] Médico: reclamando siguiente paciente...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/call-next" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"queueId\": \"${QUEUE_ID}\",
    \"actor\": \"${ACTOR_DOCTOR}\",
    \"stationId\": \"ROOM-01\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE — $BODY"
check_response "Medical claim-next" "$BODY"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 7: Médico — Iniciar consulta
# Backend DTO: CallPatientDto (start-consultation)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[7/8] Médico: iniciando consulta...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/start-consultation" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"queueId\": \"${QUEUE_ID}\",
    \"patientId\": \"${PATIENT_ID}\",
    \"actor\": \"${ACTOR_DOCTOR}\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE — $BODY"
check_response "Start consultation" "$BODY"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 8: Médico — Finalizar consulta
# Backend DTO: CompleteAttentionDto (finish-consultation)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[8/8] Médico: finalizando consulta...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API}/api/medical/finish-consultation" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"queueId\": \"${QUEUE_ID}\",
    \"patientId\": \"${PATIENT_ID}\",
    \"actor\": \"${ACTOR_DOCTOR}\",
    \"outcome\": \"Completed\",
    \"notes\": \"Consulta general sin hallazgos relevantes\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "  HTTP $HTTP_CODE — $BODY"
check_response "Finish consultation" "$BODY"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}✓ Simulación completada — 0 errores${NC}"
else
  echo -e "${RED}✗ Simulación completada con $ERRORS error(es)${NC}"
fi
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Paciente: $PATIENT_NAME ($PATIENT_ID)"
echo "  Cola:     $QUEUE_ID"
echo ""
echo "  Verificar logs:"
echo "    docker logs rlapp-api --tail=30"
echo "    docker logs rlapp-worker --tail=30"
echo "    docker logs rlapp-frontend --tail=30"
echo ""
echo "  Acceder al frontend: http://localhost:3001"
echo ""

exit $ERRORS

