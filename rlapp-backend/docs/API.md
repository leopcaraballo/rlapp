# API Contract

## 1. Purpose

Contrato HTTP del servicio `WaitingRoom.API`. Describe los endpoints publicados en el pipeline HTTP principal, agrupados por rol operativo.

## 2. Context

Fuente de verdad operativa:

1. Mapeo de endpoints en `src/Services/WaitingRoom/WaitingRoom.API/Program.cs`
2. OpenAPI runtime (`/openapi/v1.json`) en entorno Development

Base URL:

| Entorno | URL |
|---|---|
| Local (`dotnet run`) | `http://localhost:5000` |
| Containerizado (Docker Compose) | `http://localhost:8080` |

Headers comunes:

| Header | Valor | Obligatorio |
|---|---|---|
| `Content-Type` | `application/json` | Si |
| `X-Correlation-Id` | UUID | No (generado por middleware si ausente) |

Formato de error estandar:

```json
{
  "error": "DomainViolation",
  "message": "Queue is at maximum capacity (50). Cannot add more patients.",
  "correlationId": "7f6c0bb7-2d68-497f-9b77-8768208d2895"
}
```

Codigos HTTP:

| Codigo | Causa |
|---|---|
| 400 | Violacion de regla de dominio o request invalido |
| 404 | Agregado o cola no encontrado |
| 409 | Conflicto de concurrencia |
| 500 | Error inesperado |

## 3. Technical Details

### Endpoints de comando por rol

#### Recepcion

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/reception/register` | Registro clinico de paciente (alias de check-in por rol de recepcion) |

#### Taquilla

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/cashier/call-next` | Llama siguiente paciente para pago (prioridad + FIFO) |
| POST | `/api/cashier/validate-payment` | Valida pago y habilita paso a cola de consulta |
| POST | `/api/cashier/mark-payment-pending` | Marca pago pendiente e incrementa contador (maximo 3 intentos) |
| POST | `/api/cashier/mark-absent` | Marca ausencia en taquilla y reencola (maximo 2 reintentos) |
| POST | `/api/cashier/cancel-payment` | Cancela turno por politica de pago |

#### Medico

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/medical/consulting-room/activate` | Activa consultorio para habilitar llamados |
| POST | `/api/medical/consulting-room/deactivate` | Desactiva consultorio |
| POST | `/api/medical/call-next` | Reclama siguiente paciente para consulta (requiere `stationId` de consultorio activo) |
| POST | `/api/medical/start-consultation` | Inicia consulta para paciente en estado `LlamadoConsulta` |
| POST | `/api/medical/finish-consultation` | Finaliza consulta para paciente en estado `EnConsulta` |
| POST | `/api/medical/mark-absent` | Marca ausencia en consulta (1 reintento, luego cancelacion) |

#### Compatibilidad

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/waiting-room/check-in` | Check-in de paciente en cola de espera |
| POST | `/api/waiting-room/claim-next` | Reclama siguiente paciente (prioridad clinica + FIFO) |
| POST | `/api/waiting-room/call-patient` | Marca paciente reclamado como llamado |
| POST | `/api/waiting-room/complete-attention` | Finaliza atencion del paciente activo |

### Request y response de referencia

#### Check-in (request)

```json
{
  "queueId": "QUEUE-01",
  "patientId": "PAT-001",
  "patientName": "Juan Perez",
  "priority": "High",
  "consultationType": "General",
  "actor": "nurse-001",
  "notes": "Dolor de cabeza"
}
```

Validaciones: `queueId` (obligatorio), `patientId` (obligatorio), `patientName` (obligatorio), `priority` (Low | Medium | High | Urgent), `consultationType` (longitud 2-100), `actor` (obligatorio), `notes` (opcional).

#### Check-in (response 200)

```json
{
  "success": true,
  "message": "Patient checked in successfully",
  "correlationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "eventCount": 1
}
```

#### Claim-next (request)

```json
{
  "queueId": "QUEUE-01",
  "actor": "doctor-001",
  "stationId": "CONSULT-03"
}
```

#### Claim-next (response 200)

```json
{
  "success": true,
  "message": "Patient claimed successfully",
  "correlationId": "3c3ad6dc-6725-4600-8968-6285a7a7b3a6",
  "eventCount": 1,
  "patientId": "PAT-001"
}
```

### Endpoints de consulta (query)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/v1/waiting-room/{queueId}/monitor` | Vista de monitor de la sala de espera |
| GET | `/api/v1/waiting-room/{queueId}/queue-state` | Estado detallado de la cola |
| GET | `/api/v1/waiting-room/{queueId}/next-turn` | Informacion del siguiente turno |
| GET | `/api/v1/waiting-room/{queueId}/recent-history?limit=20` | Historial reciente de atenciones |
| POST | `/api/v1/waiting-room/{queueId}/rebuild` | Reconstruir proyecciones desde event store |

#### Next-turn (response de referencia)

```json
{
  "queueId": "QUEUE-01",
  "patientId": "PAT-001",
  "patientName": "Juan Perez",
  "priority": "high",
  "consultationType": "General",
  "status": "called",
  "claimedAt": "2026-02-19T14:10:00Z",
  "calledAt": "2026-02-19T14:11:00Z",
  "stationId": "CONSULT-03",
  "projectedAt": "2026-02-19T14:11:01Z"
}
```

### Health y readiness

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (verifica PostgreSQL) |

### OpenAPI

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/openapi/v1.json` | Especificacion OpenAPI (solo entorno Development) |

## 4. Operational / Maintenance Notes

### Ejemplo de invocacion

```bash
curl -X POST http://localhost:5000/api/waiting-room/check-in \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: $(uuidgen)" \
  -d '{
    "queueId": "QUEUE-01",
    "patientId": "PAT-001",
    "patientName": "Juan Perez",
    "priority": "High",
    "consultationType": "General",
    "actor": "nurse-001"
  }'
```

```bash
curl http://localhost:5000/health/live
curl http://localhost:5000/health/ready
```

### CORS

Origenes permitidos: `http://localhost:3000`, `http://localhost:3001`.
