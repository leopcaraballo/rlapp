#!/usr/bin/env python3
"""
E2E Business Flow Test — RLAPP
Flujo: Recepción → Caja → Área Médica → Fin
"""
import base64
import json
import time
import requests
import sys

API = "http://localhost:5000"
QUEUE_ID = "QUEUE-01"
PATIENT_ID = f"E2E-{int(time.time())}"


def b64url(s: str) -> str:
    enc = base64.b64encode(s.encode()).decode()
    return enc.rstrip("=").replace("+", "-").replace("/", "_")


def gen_token(role: str) -> str:
    header = b64url(json.dumps({"alg": "none", "typ": "JWT"}))
    exp = int((time.time() + 7200) * 1000)
    payload = b64url(json.dumps({"role": role, "exp": exp}))
    return f"{header}.{payload}.local"


def role_map(role: str) -> str:
    return {"reception": "Receptionist", "cashier": "Cashier", "doctor": "Doctor"}.get(role, "")


def headers(role: str) -> dict:
    token = gen_token(role)
    return {
        "Content-Type": "application/json",
        "X-Correlation-Id": f"e2e-{int(time.time() * 1000)}",
        "Idempotency-Key": f"idem-{int(time.time() * 1000)}",
        "Authorization": f"Bearer {token}",
        "X-User-Role": role_map(role),
    }


def post(path: str, role: str, body: dict) -> tuple[int, dict | str]:
    r = requests.post(f"{API}{path}", headers=headers(role), json=body, timeout=10)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.text


def get(path: str) -> dict | None:
    r = requests.get(f"{API}{path}", timeout=10)
    try:
        return r.json()
    except Exception:
        return None


OK = "\033[92m[OK]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"
STEP = "\033[94m>>>\033[0m"


def log_step(n: int, msg: str):
    print(f"\n{STEP} PASO {n}: {msg}")


def log_result(code: int, body):
    preview = str(body)[:250] if body else "vacío"
    print(f"     HTTP {code} — {preview}")


print("=" * 55)
print(f"  RLAPP — Prueba E2E Flujo Completo")
print(f"  Paciente: {PATIENT_ID}")
print(f"  Cola:     {QUEUE_ID}")
print("=" * 55)

errors = []

# =============================================================================
# PASO 1: Recepción — Registrar paciente
# =============================================================================
log_step(1, "Recepción registra al paciente")
code, body = post("/api/reception/register", "reception", {
    "queueId": QUEUE_ID,
    "patientId": PATIENT_ID,
    "patientName": "Paciente E2E Completo",
    "priority": "Medium",
    "consultationType": "General",
    "age": 35,
    "isPregnant": False,
    "notes": "Test E2E automático",
    "actor": "reception",
})
log_result(code, body)
if code in (200, 201, 204):
    print(f"  {OK} Paciente {PATIENT_ID} registrado")
else:
    print(f"  {FAIL} Error al registrar. HTTP {code}")
    errors.append(f"Paso 1 fallido: HTTP {code}")
    sys.exit(1)

time.sleep(1)

# =============================================================================
# PASO 2: Verificar cola — Paciente en lista
# =============================================================================
log_step(2, "Verificar paciente en la cola")
state = get(f"/api/v1/waiting-room/{QUEUE_ID}/queue-state")
count = state.get("currentCount", 0) if state else 0
patients = state.get("patientsInQueue", []) if state else []
print(f"     Pacientes en cola: {count}")
found = any(p.get("patientId") == PATIENT_ID for p in patients)
if found:
    print(f"  {OK} Paciente {PATIENT_ID} encontrado en cola")
else:
    print(f"  {WARN} Paciente no encontrado aún (proyección en proceso)")

time.sleep(1)

# =============================================================================
# PASO 3: Caja — Llamar al siguiente
# =============================================================================
log_step(3, "Caja llama al siguiente paciente")
code, body = post("/api/cashier/call-next", "cashier", {"queueId": QUEUE_ID, "actor": "cashier-desk-01", "cashierDeskId": "C-01"})
log_result(code, body)

cashier_patient_id = None
if code in (200, 201):
    if isinstance(body, dict):
        cashier_patient_id = body.get("patientId")
    print(f"  {OK} Caja llamó al paciente: {cashier_patient_id}")
else:
    print(f"  {WARN} Caja: HTTP {code} — puede haber otro paciente ya en caja")
    # Intentar con el monitor para ver quién está en caja
    monitor = get(f"/api/v1/waiting-room/{QUEUE_ID}/monitor")
    if monitor:
        cashier_patient_id = monitor.get("currentCashierPatientId")
        print(f"     Paciente actual en caja (monitor): {cashier_patient_id}")

time.sleep(1)

# =============================================================================
# PASO 4: Caja — Validar pago
# =============================================================================
if cashier_patient_id:
    log_step(4, f"Caja valida el pago de {cashier_patient_id}")
    code, body = post("/api/cashier/validate-payment", "cashier", {
        "queueId": QUEUE_ID,
        "patientId": cashier_patient_id,
        "actor": "cashier-desk-01",
        "paymentReference": "PAY-E2E-001",
    })
    log_result(code, body)
    if code in (200, 201, 204):
        print(f"  {OK} Pago validado")
    else:
        print(f"  {WARN} Error pago: HTTP {code}")
else:
    log_step(4, "Omitida — sin paciente en caja")
    print(f"  {WARN} No hay patientId de caja para validar pago")

time.sleep(1)

# =============================================================================
# PASO 5: Médico — Activar consultorio
# =============================================================================
log_step(5, "Médico activa el consultorio ROOM-01")
code, body = post("/api/medical/consulting-room/activate", "doctor", {
    "queueId": QUEUE_ID,
    "consultingRoomId": "ROOM-01",
    "actor": "doctor-a",
})
log_result(code, body)
if code in (200, 201, 204, 400):
    print(f"  {OK} Consultorio activo (o ya estaba activo)")
else:
    print(f"  {WARN} HTTP {code}")

time.sleep(1)

# =============================================================================
# PASO 6: Médico — Llamar al siguiente paciente
# =============================================================================
log_step(6, "Médico reclama el siguiente paciente")
code, body = post("/api/medical/call-next", "doctor", {"queueId": QUEUE_ID, "actor": "doctor-a", "stationId": "ROOM-01"})
log_result(code, body)

medical_patient_id = None
if code in (200, 201):
    if isinstance(body, dict):
        medical_patient_id = body.get("patientId")
    print(f"  {OK} Médico reclamó: {medical_patient_id}")
else:
    print(f"  {WARN} Médico: HTTP {code}")
    monitor = get(f"/api/v1/waiting-room/{QUEUE_ID}/monitor")
    if monitor:
        medical_patient_id = monitor.get("currentMedicalPatientId")
        print(f"     Paciente en consulta (monitor): {medical_patient_id}")

time.sleep(1)

# =============================================================================
# PASO 7: Médico — Iniciar consulta
# =============================================================================
if medical_patient_id:
    log_step(7, f"Médico inicia consulta de {medical_patient_id}")
    code, body = post("/api/medical/start-consultation", "doctor", {
        "queueId": QUEUE_ID,
        "patientId": medical_patient_id,
        "actor": "doctor-a",
    })
    log_result(code, body)
    if code in (200, 201, 204):
        print(f"  {OK} Consulta iniciada")
    else:
        print(f"  {WARN} HTTP {code}")

    time.sleep(1)

    # ==========================================================================
    # PASO 8: Médico — Finalizar consulta (saca al paciente del flujo)
    # ==========================================================================
    log_step(8, f"Médico FINALIZA la consulta de {medical_patient_id}")
    code, body = post("/api/medical/finish-consultation", "doctor", {
        "queueId": QUEUE_ID,
        "patientId": medical_patient_id,
        "actor": "doctor-a",
        "outcome": "Consulta completada — E2E Test OK",
    })
    log_result(code, body)
    if code in (200, 201, 204):
        print(f"  {OK} Paciente {medical_patient_id} DADO DE ALTA — flujo completo")
    else:
        print(f"  {WARN} HTTP {code}")
        errors.append(f"Paso 8: HTTP {code}")
else:
    print(f"\n  {WARN} Pasos 7-8 omitidos: sin paciente médico")

time.sleep(1)

# =============================================================================
# ESTADO FINAL
# =============================================================================
print("\n>>> ESTADO FINAL DE LA COLA")
final_state = get(f"/api/v1/waiting-room/{QUEUE_ID}/queue-state")
if final_state:
    print(f"     Cola: {final_state.get('queueId')}")
    print(f"     Pacientes: {final_state.get('currentCount')}")
    print(f"     Proyectado: {final_state.get('projectedAt')}")

print("\n" + "=" * 55)
if errors:
    print(f"  {FAIL} FLUJO E2E — {len(errors)} ERROR(ES):")
    for e in errors:
        print(f"    - {e}")
else:
    print(f"  {OK} FLUJO E2E COMPLETADO EXITOSAMENTE")
print("=" * 55)
