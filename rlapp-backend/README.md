# RLAPP Backend

## Resumen

Backend en .NET para operación de sala de espera médica con flujos de recepción, caja y consulta.

Implementa:

- Event Sourcing en PostgreSQL
- CQRS (commands y queries separados)
- Outbox Pattern para publicación confiable
- Publicación de eventos en RabbitMQ
- Read models en memoria
- Health checks y métricas Prometheus

## Arquitectura real

Capas y módulos principales:

- `WaitingRoom.API`: HTTP endpoints, middleware, hub SignalR, OpenAPI
- `WaitingRoom.Application`: command handlers y puertos
- `WaitingRoom.Domain`: agregado `WaitingQueue`, invariantes, value objects, eventos
- `WaitingRoom.Infrastructure`: persistencia PostgreSQL, publicador RabbitMQ, serialización
- `WaitingRoom.Worker`: outbox dispatcher con retries y backoff
- `WaitingRoom.Projections`: projection engine y read context en memoria

## Requisitos

- .NET SDK 10
- Docker / Docker Compose
- PostgreSQL (si no se usa compose)
- RabbitMQ (si no se usa compose)

## Ejecución con Docker Compose (raíz del monorepo)

```bash
docker compose up -d
```

Servicios relevantes:

- API: `http://localhost:5000`
- Health live: `http://localhost:5000/health/live`
- Health ready: `http://localhost:5000/health/ready`
- Metrics: `http://localhost:5000/metrics`

## Endpoints principales

### Commands

- `POST /api/waiting-room/check-in`
- `POST /api/reception/register`
- `POST /api/cashier/call-next`
- `POST /api/cashier/validate-payment`
- `POST /api/cashier/mark-payment-pending`
- `POST /api/cashier/mark-absent`
- `POST /api/cashier/cancel-payment`
- `POST /api/medical/call-next`
- `POST /api/medical/start-consultation`
- `POST /api/medical/finish-consultation`
- `POST /api/medical/mark-absent`
- `POST /api/medical/consulting-room/activate`
- `POST /api/medical/consulting-room/deactivate`

### Queries

- `GET /api/v1/waiting-room/{queueId}/monitor`
- `GET /api/v1/waiting-room/{queueId}/queue-state`
- `GET /api/v1/waiting-room/{queueId}/next-turn`
- `GET /api/v1/waiting-room/{queueId}/recent-history`
- `POST /api/v1/waiting-room/{queueId}/rebuild`

## Estado de seguridad (actual)

Implementado:

- Validación por DTO + filtro de solicitud
- Middleware de correlación
- Middleware global de excepciones

Pendiente:

- Authentication
- Authorization
- Rate limiting en backend
- Persistencia de read models para producción

## Pruebas

El repositorio contiene suites en:

- `src/Tests/WaitingRoom.Tests.Domain`
- `src/Tests/WaitingRoom.Tests.Application`
- `src/Tests/WaitingRoom.Tests.Integration`
- `src/Tests/WaitingRoom.Tests.Projections`

Ejecución:

```bash
dotnet test rlapp-backend/RLAPP.slnx
```
