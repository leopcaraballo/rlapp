#!/usr/bin/env python3
"""Validación viva del flujo operacional autenticado con JWT real."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class HttpResult:
    status: int
    body: dict[str, Any]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Ejecuta una validación viva del flujo RLAPP usando JWT reales.",
    )
    parser.add_argument(
        "--api-base",
        default="http://localhost:5000",
        help="URL base de la API RLAPP.",
    )
    return parser


def request_json(
    api_base: str,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
    correlation_id: str | None = None,
    idempotency_key: str | None = None,
) -> HttpResult:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(f"{api_base}{path}", data=data, method=method)
    request.add_header("Content-Type", "application/json")

    if token:
        request.add_header("Authorization", f"Bearer {token}")
    if correlation_id:
        request.add_header("X-Correlation-Id", correlation_id)
    if idempotency_key:
        request.add_header("Idempotency-Key", idempotency_key)

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw_body = response.read().decode("utf-8")
            return HttpResult(response.status, json.loads(raw_body) if raw_body else {})
    except urllib.error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8")
        return HttpResult(exc.code, json.loads(raw_body) if raw_body else {})


def issue_token(api_base: str, user_id: str, user_name: str, role: str) -> str:
    role_suffix = role.lower()
    result = request_json(
        api_base,
        "POST",
        "/api/auth/token",
        {
            "userId": user_id,
            "userName": user_name,
            "role": role,
        },
        correlation_id=f"auth-{role_suffix}-{user_id}",
        idempotency_key=f"auth-{role_suffix}-{user_id}",
    )
    if result.status != 200 or "token" not in result.body:
        raise AssertionError(
            f"No fue posible emitir JWT real para {role}. Status={result.status}, Body={result.body}",
        )
    return str(result.body["token"])


def ensure_status(result: HttpResult, expected: tuple[int, ...], step: str) -> None:
    if result.status not in expected:
        raise AssertionError(
            f"{step} devolvió {result.status}. Respuesta: {json.dumps(result.body, ensure_ascii=False)}",
        )


def main() -> int:
    args = build_parser().parse_args()
    api_base = args.api_base.rstrip("/")
    timestamp = str(int(time.time()))
    queue_id = f"QJWT{timestamp[-6:]}"
    room_id = f"RJWT{timestamp[-5:]}"
    patient_id = f"JWT-{timestamp}"
    correlation_prefix = f"jwt-live-{timestamp}"
    idempotency_prefix = f"jwt-idem-{timestamp}"

    # // HUMAN CHECK: esta validación usa exclusivamente JWT reales emitidos por la API.
    # Se verifica además un caso negativo de autorización para evitar falsos positivos sobre endpoints públicos.
    receptionist_token = issue_token(api_base, "reception-jwt-live", "Recepcion JWT Live", "Receptionist")
    cashier_token = issue_token(api_base, "cashier-jwt-live", "Caja JWT Live", "Cashier")
    doctor_token = issue_token(api_base, "doctor-jwt-live", "Doctor JWT Live", "Doctor")

    print(f"TOKENS_OK queue={queue_id} room={room_id} patient={patient_id}")

    register_result = request_json(
        api_base,
        "POST",
        "/api/reception/register",
        {
            "queueId": queue_id,
            "patientId": patient_id,
            "patientName": "Paciente JWT Live",
            "priority": "Medium",
            "consultationType": "General",
            "age": 30,
            "isPregnant": False,
            "notes": "Validación JWT real",
            "actor": "reception",
        },
        receptionist_token,
        f"{correlation_prefix}-1",
        f"{idempotency_prefix}-1",
    )
    print(f"REGISTER:{register_result.status}")
    ensure_status(register_result, (200, 201, 204), "Registro en recepción")

    negative_authorization = request_json(
        api_base,
        "POST",
        "/api/cashier/call-next",
        {
            "queueId": queue_id,
            "actor": "recepcion-no-autorizada",
        },
        receptionist_token,
        f"{correlation_prefix}-negative",
        f"{idempotency_prefix}-negative",
    )
    print(f"NEGATIVE_AUTH:{negative_authorization.status}")
    ensure_status(negative_authorization, (401, 403), "Validación negativa de autorización")

    queue_state = request_json(api_base, "GET", f"/api/v1/waiting-room/{queue_id}/queue-state")
    print(
        "QUEUE_STATE:"
        f"{queue_state.status}:{queue_state.body.get('currentCount')}:{queue_state.body.get('queueId')}",
    )
    ensure_status(queue_state, (200,), "Consulta de estado de cola")

    cashier_call = request_json(
        api_base,
        "POST",
        "/api/cashier/call-next",
        {
            "queueId": queue_id,
            "actor": "cajero",
        },
        cashier_token,
        f"{correlation_prefix}-2",
        f"{idempotency_prefix}-2",
    )
    print(f"CASHIER_CALL:{cashier_call.status}:{cashier_call.body.get('patientId', '')}")
    ensure_status(cashier_call, (200, 201), "Llamado de caja")
    claimed_patient = str(cashier_call.body.get("patientId", ""))

    payment_validation = request_json(
        api_base,
        "POST",
        "/api/cashier/validate-payment",
        {
            "queueId": queue_id,
            "patientId": claimed_patient,
            "actor": "cajero",
            "paymentReference": f"REF-{timestamp}",
        },
        cashier_token,
        f"{correlation_prefix}-3",
        f"{idempotency_prefix}-3",
    )
    print(f"PAYMENT:{payment_validation.status}")
    ensure_status(payment_validation, (200, 201, 204), "Validación de pago")

    room_activation = request_json(
        api_base,
        "POST",
        "/api/medical/consulting-room/activate",
        {
            "queueId": queue_id,
            "consultingRoomId": room_id,
            "actor": "doctor",
        },
        doctor_token,
        f"{correlation_prefix}-4",
        f"{idempotency_prefix}-4",
    )
    print(f"ROOM_ACTIVATE:{room_activation.status}")
    ensure_status(room_activation, (200, 201, 204, 400), "Activación de consultorio")

    medical_call = request_json(
        api_base,
        "POST",
        "/api/medical/call-next",
        {
            "queueId": queue_id,
            "actor": "doctor",
            "stationId": room_id,
        },
        doctor_token,
        f"{correlation_prefix}-5",
        f"{idempotency_prefix}-5",
    )
    print(f"MEDICAL_CALL:{medical_call.status}:{medical_call.body.get('patientId', '')}")
    ensure_status(medical_call, (200, 201), "Llamado médico")
    medical_patient = str(medical_call.body.get("patientId", ""))

    start_consultation = request_json(
        api_base,
        "POST",
        "/api/medical/start-consultation",
        {
            "queueId": queue_id,
            "patientId": medical_patient,
            "actor": "doctor",
        },
        doctor_token,
        f"{correlation_prefix}-6",
        f"{idempotency_prefix}-6",
    )
    print(f"START_CONSULTATION:{start_consultation.status}")
    ensure_status(start_consultation, (200, 201, 204), "Inicio de consulta")

    finish_consultation = request_json(
        api_base,
        "POST",
        "/api/medical/finish-consultation",
        {
            "queueId": queue_id,
            "patientId": medical_patient,
            "actor": "doctor",
            "outcome": "Consulta finalizada en validación JWT real",
        },
        doctor_token,
        f"{correlation_prefix}-7",
        f"{idempotency_prefix}-7",
    )
    print(f"FINISH_CONSULTATION:{finish_consultation.status}")
    ensure_status(finish_consultation, (200, 201, 204), "Finalización de consulta")

    final_state = request_json(api_base, "GET", f"/api/v1/waiting-room/{queue_id}/queue-state")
    print(
        "FINAL_STATE:"
        f"{final_state.status}:{final_state.body.get('currentCount')}:{final_state.body.get('queueId')}",
    )
    ensure_status(final_state, (200,), "Estado final de cola")

    print("JWT_LIVE_FLOW_OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"JWT_LIVE_FLOW_FAIL:{exc}", file=sys.stderr)
        raise SystemExit(1) from exc
