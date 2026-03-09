#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log() {
  printf '[black-box] %s\n' "$1"
}

json_get() {
  python3 - "$1" "$2" <<'PY'
import json
import sys

file_path = sys.argv[1]
field_name = sys.argv[2]

with open(file_path, 'r', encoding='utf-8') as handle:
    data = json.load(handle)

aliases = {
    'success': ['success', 'Success'],
    'queueId': ['queueId', 'QueueId'],
    'message': ['message', 'Message'],
    'error': ['error', 'Error'],
}

for alias in aliases.get(field_name, [field_name]):
    if alias in data:
        value = data[alias]
        if isinstance(value, bool):
            print('true' if value else 'false')
        else:
            print(value)
        sys.exit(0)

sys.exit(1)
PY
}

assert_json() {
  python3 -m json.tool "$1" > /dev/null
}

post_checkin() {
  local payload="$1"
  local idempotency_key="$2"
  local output_file="$3"

  curl -sS -o "$output_file" -w "%{http_code}" \
    -X POST "$API_BASE_URL/api/waiting-room/check-in" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H 'X-User-Role: Receptionist' \
    -H "Idempotency-Key: $idempotency_key" \
    --data "$payload"
}

log "Escenario 1: check-in valido"
VALID_KEY="bb-valid-001"
VALID_BODY="$TMP_DIR/valid.json"
VALID_PAYLOAD='{"PatientId":"BB-PAT-001","PatientName":"Paciente Black Box","Priority":"Medium","ConsultationType":"General","Actor":"recepcion-bb"}'
VALID_STATUS="$(post_checkin "$VALID_PAYLOAD" "$VALID_KEY" "$VALID_BODY")"

if [[ "$VALID_STATUS" != "200" ]]; then
  printf 'Respuesta inesperada para check-in valido (HTTP %s):\n' "$VALID_STATUS"
  cat "$VALID_BODY"
  exit 1
fi

assert_json "$VALID_BODY"
if [[ "$(json_get "$VALID_BODY" success)" != "true" ]]; then
  printf 'La respuesta valida no contiene success=true:\n'
  cat "$VALID_BODY"
  exit 1
fi

QUEUE_ID="$(json_get "$VALID_BODY" queueId)"
if [[ -z "$QUEUE_ID" || "$QUEUE_ID" == "null" ]]; then
  printf 'La respuesta valida no contiene queueId:\n'
  cat "$VALID_BODY"
  exit 1
fi

log "Escenario 2: error de validacion por PatientId faltante"
INVALID_BODY="$TMP_DIR/invalid.json"
INVALID_PAYLOAD='{"PatientName":"Paciente Invalido","Priority":"Medium","ConsultationType":"General","Actor":"recepcion-bb"}'
INVALID_STATUS="$(post_checkin "$INVALID_PAYLOAD" "bb-invalid-001" "$INVALID_BODY")"

if [[ "$INVALID_STATUS" != "400" ]]; then
  printf 'Se esperaba HTTP 400 para payload invalido, se obtuvo %s:\n' "$INVALID_STATUS"
  cat "$INVALID_BODY"
  exit 1
fi

assert_json "$INVALID_BODY"

log "Escenario 3: replay idempotente con la misma llave"
REPLAY_BODY="$TMP_DIR/replay.json"
REPLAY_STATUS="$(post_checkin "$VALID_PAYLOAD" "$VALID_KEY" "$REPLAY_BODY")"

if [[ "$REPLAY_STATUS" != "200" ]]; then
  printf 'Se esperaba HTTP 200 en replay idempotente, se obtuvo %s:\n' "$REPLAY_STATUS"
  cat "$REPLAY_BODY"
  exit 1
fi

assert_json "$REPLAY_BODY"
if ! cmp -s "$VALID_BODY" "$REPLAY_BODY"; then
  printf 'La respuesta idempotente no coincide con la respuesta original.\n'
  printf 'Original:\n'
  cat "$VALID_BODY"
  printf '\nReplay:\n'
  cat "$REPLAY_BODY"
  exit 1
fi

log "Escenario 4: paciente duplicado en la misma cola"
DUP_BODY="$TMP_DIR/duplicate.json"
DUP_PAYLOAD="{\"QueueId\":\"$QUEUE_ID\",\"PatientId\":\"BB-PAT-001\",\"PatientName\":\"Paciente Black Box\",\"Priority\":\"Medium\",\"ConsultationType\":\"General\",\"Actor\":\"recepcion-bb\"}"
DUP_STATUS="$(post_checkin "$DUP_PAYLOAD" "bb-duplicate-001" "$DUP_BODY")"

case "$DUP_STATUS" in
  200|400|409)
    assert_json "$DUP_BODY"
    ;;
  *)
    printf 'Respuesta inesperada para duplicado de paciente (HTTP %s):\n' "$DUP_STATUS"
    cat "$DUP_BODY"
    exit 1
    ;;
esac

log "Todos los escenarios Black Box finalizaron correctamente"
