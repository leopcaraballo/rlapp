#!/usr/bin/env bash
# ==============================================================================
# RLAPP - Script de prueba de carga para validar Grafana
# Genera trafico realista a traves de los endpoints de la API
# utilizando los DTOs correctos del dominio (Event Sourcing / CQRS).
#
# Flujo por ciclo:
#   1. Crear queueId unico por ciclo
#   2. Activar consultorio medico
#   3. Check-in de N pacientes
#   4. Validate-payment para cada paciente
#   5. Medical call-next + finish-consultation secuencial
#   6. Consultas de proyecciones (queue-state, monitor, recent-history)
#   7. Trafico adicional (health checks, 404s, 400s)
# ==============================================================================
set -euo pipefail

API_BASE="http://localhost:5000"
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3002"
CYCLES=${1:-3}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok=0
fail=0
total=0

log_ok()   { ok=$((ok + 1));   total=$((total + 1)); echo -e "  ${GREEN}[OK]${NC} $1"; }
log_fail() { fail=$((fail + 1)); total=$((total + 1)); echo -e "  ${RED}[FAIL]${NC} $1"; }
log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

gen_uuid() { cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())'; }

FIRST_NAMES=("Carlos" "Maria" "Jose" "Ana" "Luis" "Elena" "Pedro" "Sofia" "Miguel" "Laura"
             "Diego" "Paula" "Andres" "Camila" "Jorge" "Valentina" "Ricardo" "Isabella" "Fernando" "Daniela")
LAST_NAMES=("Garcia" "Rodriguez" "Martinez" "Lopez" "Hernandez" "Gonzalez" "Perez" "Sanchez" "Ramirez" "Torres"
            "Flores" "Rivera" "Gomez" "Diaz" "Cruz" "Morales" "Reyes" "Gutierrez" "Ortiz" "Ramos")
PRIORITIES=("Low" "Medium" "High" "Urgent")
CONSULTATION_TYPES=("General" "Pediatrics" "Cardiology" "Orthopedics" "Dermatology" "Neurology")

random_item() {
    local -n arr=$1
    echo "${arr[$((RANDOM % ${#arr[@]}))]}"
}

do_post() {
    local url="$1" payload="$2"
    curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" -d "$payload" 2>/dev/null || echo -e "\n000"
}

do_get() {
    local url="$1"
    curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000"
}

parse_code() { echo "$1" | tail -1; }
parse_body() { echo "$1" | sed '$d'; }
is_success() { [[ "$1" == "200" || "$1" == "201" || "$1" == "202" ]]; }

check_prerequisites() {
    log_info "Verificando prerequisitos..."
    for cmd in curl jq; do
        if ! command -v "$cmd" &>/dev/null; then
            echo -e "${RED}ERROR: $cmd no encontrado.${NC}"
            exit 1
        fi
    done
    if ! curl -sf "$API_BASE/health/ready" >/dev/null 2>&1; then
        echo -e "${RED}ERROR: API no disponible en $API_BASE${NC}"
        exit 1
    fi
    log_ok "API disponible"
}

# Fase 1: Check-in
do_checkin_phase() {
    local cycle=$1 count=$2 queue_id=$3
    log_info "Ciclo $cycle: Check-in de $count pacientes (cola: ${queue_id:0:8}...)..."
    PATIENT_IDS=()
    for i in $(seq 1 "$count"); do
        local pid fname lname priority ctype
        pid=$(gen_uuid)
        fname=$(random_item FIRST_NAMES)
        lname=$(random_item LAST_NAMES)
        priority=$(random_item PRIORITIES)
        ctype=$(random_item CONSULTATION_TYPES)
        local payload="{\"queueId\":\"$queue_id\",\"patientId\":\"$pid\",\"patientName\":\"$fname $lname\",\"priority\":\"$priority\",\"consultationType\":\"$ctype\",\"actor\":\"recepcion-ciclo-$cycle\",\"age\":$((RANDOM % 70 + 5)),\"notes\":\"Prueba ciclo $cycle paciente $i\"}"
        local resp code body
        resp=$(do_post "$API_BASE/api/waiting-room/check-in" "$payload")
        code=$(parse_code "$resp")
        body=$(parse_body "$resp")
        if is_success "$code"; then
            PATIENT_IDS+=("$pid")
            log_ok "Check-in: $fname $lname ($priority / $ctype)"
        else
            local err_msg
            err_msg=$(echo "$body" | jq -r '.message // empty' 2>/dev/null || true)
            log_fail "Check-in: $fname $lname (HTTP $code${err_msg:+ - $err_msg})"
        fi
        sleep 0.1
    done
}

# Fase 2: Activar consultorio
do_activate_room() {
    local queue_id=$1 room_id=$2
    log_info "Activando consultorio '$room_id'..."
    local payload="{\"queueId\":\"$queue_id\",\"consultingRoomId\":\"$room_id\",\"actor\":\"admin-sistema\"}"
    local resp code body
    resp=$(do_post "$API_BASE/api/medical/consulting-room/activate" "$payload")
    code=$(parse_code "$resp")
    body=$(parse_body "$resp")
    if is_success "$code"; then
        log_ok "Consultorio '$room_id' activado"
    else
        local err_msg
        err_msg=$(echo "$body" | jq -r '.message // empty' 2>/dev/null || true)
        if [[ "$err_msg" == *"already active"* ]]; then
            log_ok "Consultorio '$room_id' ya estaba activo"
        else
            log_fail "Activar consultorio (HTTP $code${err_msg:+ - $err_msg})"
        fi
    fi
}

# Fase 3: Cajero (call-next -> validate-payment secuencial)
do_cashier_flow() {
    local cycle=$1 queue_id=$2
    log_info "Ciclo $cycle: Procesando cajero para ${#PATIENT_IDS[@]} pacientes..."
    local processed=0
    for i in $(seq 1 ${#PATIENT_IDS[@]}); do
        # call-next: traer siguiente paciente a caja
        local cn_payload="{\"queueId\":\"$queue_id\",\"actor\":\"cajero-ciclo-$cycle\",\"cashierDeskId\":\"caja-1\"}"
        local cn_resp cn_code cn_body
        cn_resp=$(do_post "$API_BASE/api/cashier/call-next" "$cn_payload")
        cn_code=$(parse_code "$cn_resp")
        cn_body=$(parse_body "$cn_resp")
        if ! is_success "$cn_code"; then
            local err_msg
            err_msg=$(echo "$cn_body" | jq -r '.message // empty' 2>/dev/null || true)
            log_warn "Cajero call-next: sin pacientes (HTTP $cn_code${err_msg:+ - $err_msg})"
            break
        fi
        local pid
        pid=$(echo "$cn_body" | jq -r '.patientId // .id // .data.patientId // empty' 2>/dev/null || true)
        if [[ -z "$pid" ]]; then
            pid="${PATIENT_IDS[$((i-1))]:-unknown}"
        fi
        log_ok "Cajero call-next: ${pid:0:8}..."
        sleep 0.2
        # validate-payment
        local vp_payload="{\"queueId\":\"$queue_id\",\"patientId\":\"$pid\",\"actor\":\"cajero-ciclo-$cycle\",\"paymentReference\":\"REF-C${cycle}-$(date +%s%N | tail -c 8)\"}"
        local vp_resp vp_code vp_body
        vp_resp=$(do_post "$API_BASE/api/cashier/validate-payment" "$vp_payload")
        vp_code=$(parse_code "$vp_resp")
        vp_body=$(parse_body "$vp_resp")
        if is_success "$vp_code"; then
            log_ok "Pago validado: ${pid:0:8}..."
            processed=$((processed + 1))
        else
            local err_msg
            err_msg=$(echo "$vp_body" | jq -r '.message // empty' 2>/dev/null || true)
            log_fail "Pago: ${pid:0:8}... (HTTP $vp_code${err_msg:+ - $err_msg})"
        fi
        sleep 0.15
    done
    log_info "Cajero: $processed/${#PATIENT_IDS[@]} pagos procesados"
}

# Fase 4: Medico (call-next + finish secuencial)
do_medical_flow() {
    local cycle=$1 queue_id=$2
    log_info "Ciclo $cycle: Procesando flujo medico..."
    local max=${#PATIENT_IDS[@]}
    local attended=0
    for i in $(seq 1 "$max"); do
        local cn_payload="{\"queueId\":\"$queue_id\",\"actor\":\"doctor-ciclo-$cycle\",\"stationId\":\"consultorio-1\"}"
        local cn_resp cn_code cn_body
        cn_resp=$(do_post "$API_BASE/api/medical/call-next" "$cn_payload")
        cn_code=$(parse_code "$cn_resp")
        cn_body=$(parse_body "$cn_resp")
        if ! is_success "$cn_code"; then
            local err_msg
            err_msg=$(echo "$cn_body" | jq -r '.message // empty' 2>/dev/null || true)
            log_warn "Medical call-next: sin pacientes (HTTP $cn_code${err_msg:+ - $err_msg})"
            break
        fi
        local pid
        pid=$(echo "$cn_body" | jq -r '.patientId // .id // .data.patientId // empty' 2>/dev/null || true)
        if [[ -z "$pid" ]]; then
            pid="${PATIENT_IDS[$((i-1))]:-unknown}"
        fi
        log_ok "Medical call-next: ${pid:0:8}..."
        sleep 0.3
        # start-consultation: transicionar a EnConsulta
        local sc_payload="{\"queueId\":\"$queue_id\",\"patientId\":\"$pid\",\"actor\":\"doctor-ciclo-$cycle\"}"
        local sc_resp sc_code sc_body
        sc_resp=$(do_post "$API_BASE/api/medical/start-consultation" "$sc_payload")
        sc_code=$(parse_code "$sc_resp")
        sc_body=$(parse_body "$sc_resp")
        if is_success "$sc_code"; then
            log_ok "Consulta iniciada: ${pid:0:8}..."
        else
            local err_msg
            err_msg=$(echo "$sc_body" | jq -r '.message // empty' 2>/dev/null || true)
            log_fail "Start: ${pid:0:8}... (HTTP $sc_code${err_msg:+ - $err_msg})"
            continue
        fi
        sleep 0.3
        # finish-consultation
        local fc_payload="{\"queueId\":\"$queue_id\",\"patientId\":\"$pid\",\"actor\":\"doctor-ciclo-$cycle\",\"outcome\":\"Alta medica\",\"notes\":\"Consulta ciclo $cycle paciente $i\"}"
        local fc_resp fc_code fc_body
        fc_resp=$(do_post "$API_BASE/api/medical/finish-consultation" "$fc_payload")
        fc_code=$(parse_code "$fc_resp")
        fc_body=$(parse_body "$fc_resp")
        if is_success "$fc_code"; then
            log_ok "Consulta finalizada: ${pid:0:8}..."
            attended=$((attended + 1))
        else
            local err_msg
            err_msg=$(echo "$fc_body" | jq -r '.message // empty' 2>/dev/null || true)
            log_fail "Finish: ${pid:0:8}... (HTTP $fc_code${err_msg:+ - $err_msg})"
        fi
        sleep 0.2
    done
    log_info "Medico: $attended pacientes atendidos"
}

# Fase 5: Consultas / Proyecciones
do_queries() {
    local cycle=$1 queue_id=$2
    log_info "Ciclo $cycle: Consultas de proyecciones..."
    for ep in "queue-state" "monitor" "recent-history"; do
        local resp code
        resp=$(do_get "$API_BASE/api/v1/waiting-room/$queue_id/$ep")
        code=$(parse_code "$resp")
        if is_success "$code"; then
            log_ok "Consulta: $ep"
        else
            log_fail "Consulta: $ep (HTTP $code)"
        fi
    done
}

# Fase 6: Trafico adicional
do_extra_traffic() {
    log_info "Generando trafico adicional..."
    for i in $(seq 1 10); do
        curl -sf "$API_BASE/health/ready" >/dev/null 2>&1 && log_ok "Health check $i" || log_fail "Health check $i"
    done
    for i in $(seq 1 3); do
        curl -sf "$API_BASE/metrics" >/dev/null 2>&1 && log_ok "Metrics $i" || log_fail "Metrics $i"
    done
    for i in $(seq 1 5); do
        curl -s "$API_BASE/api/nonexistent-$i" >/dev/null 2>&1
        log_ok "404 esperado: /api/nonexistent-$i"
    done
    for i in $(seq 1 3); do
        do_post "$API_BASE/api/waiting-room/check-in" '{}' >/dev/null 2>&1
        log_ok "400 esperado: check-in vacio"
    done
    curl -sf "$API_BASE/openapi/v1.json" >/dev/null 2>&1 && log_ok "OpenAPI spec" || log_fail "OpenAPI spec"
    curl -sf "$API_BASE/scalar/" >/dev/null 2>&1 && log_ok "Scalar UI" || log_fail "Scalar UI"
}

# --- Main ---
main() {
    echo ""
    echo "========================================================="
    echo "  RLAPP - Prueba de carga para validacion de Grafana"
    echo "  Ciclos: $CYCLES | API: $API_BASE"
    echo "========================================================="
    echo ""
    check_prerequisites
    for cycle in $(seq 1 "$CYCLES"); do
        echo ""
        echo "---------------------------------------------------------"
        echo -e "  ${CYAN}CICLO $cycle de $CYCLES${NC}"
        echo "---------------------------------------------------------"
        local queue_id
        queue_id=$(gen_uuid)
        local patients_count=$((RANDOM % 4 + 4))
        do_checkin_phase "$cycle" "$patients_count" "$queue_id"
        if [[ ${#PATIENT_IDS[@]} -eq 0 ]]; then
            log_warn "Sin pacientes en ciclo $cycle, saltando..."
            continue
        fi
        sleep 0.5
        do_activate_room "$queue_id" "consultorio-1"
        sleep 0.3
        do_cashier_flow "$cycle" "$queue_id"
        sleep 0.5
        do_medical_flow "$cycle" "$queue_id"
        sleep 0.5
        do_queries "$cycle" "$queue_id"
        sleep 0.3
    done
    echo ""
    echo "---------------------------------------------------------"
    echo -e "  ${CYAN}TRAFICO ADICIONAL${NC}"
    echo "---------------------------------------------------------"
    do_extra_traffic
    echo ""
    echo "========================================================="
    echo "  RESUMEN DE PRUEBA DE CARGA"
    echo "========================================================="
    echo -e "  Total: ${total} | ${GREEN}OK: ${ok}${NC} | ${RED}FAIL: ${fail}${NC}"
    echo ""
    log_info "Verificando targets de Prometheus..."
    local targets
    targets=$(curl -sf "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null || echo '{}')
    for job in rlapp-api rabbitmq postgres prometheus; do
        local state
        state=$(echo "$targets" | jq -r ".data.activeTargets[] | select(.labels.job==\"$job\") | .health" 2>/dev/null || echo "unknown")
        if [[ "$state" == "up" ]]; then
            log_ok "Prometheus target: $job [UP]"
        else
            log_warn "Prometheus target: $job [$state]"
        fi
    done
    local mcount
    mcount=$(curl -sf "$API_BASE/metrics" 2>/dev/null | grep -c "^http_requests_received_total" || echo "0")
    log_info "Series HTTP registradas: $mcount"
    log_info "Verificando Grafana..."
    local gh
    gh=$(curl -sf "$GRAFANA_URL/api/health" 2>/dev/null | jq -r '.database' 2>/dev/null || echo "unknown")
    if [[ "$gh" == "ok" ]]; then
        log_ok "Grafana: database OK"
    else
        log_warn "Grafana: $gh"
    fi
    echo ""
    echo "========================================================="
    echo "  URLS DE VALIDACION"
    echo "========================================================="
    echo "  Grafana:            $GRAFANA_URL"
    echo "  Dashboard API:      $GRAFANA_URL/d/rlapp-event-processing"
    echo "  Dashboard Infra:    $GRAFANA_URL/d/rlapp-infrastructure"
    echo "  Prometheus:         $PROMETHEUS_URL"
    echo "  Prometheus Targets: $PROMETHEUS_URL/targets"
    echo "  API Metrics:        $API_BASE/metrics"
    echo "  Scalar UI:          $API_BASE/scalar/"
    echo "  OpenAPI Spec:       $API_BASE/openapi/v1.json"
    echo "========================================================="
}

main "$@"
