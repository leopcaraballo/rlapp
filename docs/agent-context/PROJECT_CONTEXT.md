# Context: Project and architecture

## 1. Project overview

Sistema de gestión de sala de espera médica con flujo operacional por recepción, caja y consulta médica.

La arquitectura real observada se implementa en C#/.NET con Event Sourcing + CQRS + Outbox Pattern, con frontend Next.js.

### Architecture

- **Pattern:** Hexagonal Architecture + Event Sourcing + CQRS
- **Flow:** Next.js UI → ASP.NET Minimal API → Domain Aggregate → PostgreSQL Event Store + Outbox → Worker → RabbitMQ

### Key folder structure

```text
├── docs/
│   ├── agent-context/
│   └── architecture/
├── skills/
├── docker-compose.yml
├── rlapp-backend/
│   ├── src/BuildingBlocks/
│   ├── src/Services/WaitingRoom/
│   │   ├── WaitingRoom.API/
│   │   ├── WaitingRoom.Application/
│   │   ├── WaitingRoom.Domain/
│   │   ├── WaitingRoom.Infrastructure/
│   │   ├── WaitingRoom.Projections/
│   │   └── WaitingRoom.Worker/
│   └── src/Tests/
└── rlapp-frontend/
    ├── src/app/
    ├── src/hooks/
    ├── src/services/
    └── test/
```

## 2. Tech stack

| Layer          | Technology          | Version | Notes                      |
| -------------- | ------------------- | ------- | -------------------------- |
| Backend        | .NET / ASP.NET Core | 10.0    | Minimal API + Worker       |
| Frontend       | Next.js + React     | 16 / 19 | App Router                 |
| Database       | PostgreSQL          | 16      | Event Store + Outbox       |
| Messaging      | RabbitMQ            | 3.x     | Topic exchange             |
| Real-time      | SignalR             | ASP.NET | Hub + polling fallback     |
| Infrastructure | Docker Compose      | v2      | Full stack orchestration   |
| Testing        | xUnit / Jest        | N/A     | Backend + frontend suites  |
