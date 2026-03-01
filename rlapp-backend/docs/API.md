# API backend (canónica)

## Base URL

- Local: `http://localhost:5000`

## Endpoints de comando

- `POST /api/waiting-room/check-in`
- `POST /api/reception/register`
- `POST /api/cashier/call-next`
- `POST /api/cashier/validate-payment`
- `POST /api/cashier/mark-payment-pending`
- `POST /api/cashier/mark-absent`
- `POST /api/cashier/cancel-payment`
- `POST /api/medical/call-next`
- `POST /api/medical/consulting-room/activate`
- `POST /api/medical/consulting-room/deactivate`
- `POST /api/medical/start-consultation`
- `POST /api/medical/finish-consultation`
- `POST /api/medical/mark-absent`
- `POST /api/waiting-room/claim-next`
- `POST /api/waiting-room/call-patient`
- `POST /api/waiting-room/complete-attention`

## Endpoints de consulta

- `GET /api/v1/waiting-room/{queueId}/monitor`
- `GET /api/v1/waiting-room/{queueId}/queue-state`
- `GET /api/v1/waiting-room/{queueId}/next-turn`
- `GET /api/v1/waiting-room/{queueId}/recent-history`
- `POST /api/v1/waiting-room/{queueId}/rebuild`

## Operación

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /openapi/v1.json`
- `GET|WS /ws/waiting-room`

## Headers relevantes

- `X-Correlation-Id`: soportado en middleware.
- `X-Idempotency-Key`: enviado por frontend; idempotencia efectiva se resuelve en persistencia de eventos/outbox.
- `X-User-Role`: requerido para check-in de recepción. Valor esperado actual: `Receptionist`.

## Contrato funcional de check-in (2026-02-27)

### Entrada esperada

- `patientId`: requerido.
- `patientName`: requerido.
- `priority`: requerido.
- `consultationType`: requerido.
- `actor`: requerido.
- `queueId`: no se debe enviar en payload de check-in.

### Comportamiento

- El backend genera `queueId` durante el proceso de check-in.
- El backend registra/valida identidad clínica en `waiting_room_patients`.
- Si el mismo `patientId` llega con nombre distinto, responde `409` con `error = PatientIdentityConflict`.

### Respuestas relevantes

- `200`: check-in exitoso.
- `403`: rol inválido o ausente para endpoints de recepción.
- `409`: conflicto de identidad clínica o conflicto de concurrencia.
