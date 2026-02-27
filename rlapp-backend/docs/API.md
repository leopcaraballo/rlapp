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
