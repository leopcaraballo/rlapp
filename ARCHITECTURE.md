# Arquitectura del monorepo

## Visión general

RLAPP es un sistema de gestión de sala de espera médica implementado como monorepo enterprise. El sistema orquesta el flujo operacional de recepción, caja y consulta médica mediante Event Sourcing y CQRS.

## Estructura del repositorio

```
rlapp/
├── apps/
│   ├── backend/          Backend .NET (Hexagonal + Event Sourcing + CQRS)
│   └── frontend/         Frontend Next.js (App Router)
│
├── infrastructure/
│   ├── monitoring/       Prometheus + Grafana
│   ├── messaging/        RabbitMQ
│   └── database/         PostgreSQL (migraciones + init)
│
├── scripts/
│   ├── dev/              Scripts de desarrollo local
│   ├── ci/               Scripts de CI/CD
│   ├── test/             Scripts de pruebas E2E
│   └── maintenance/      Scripts de mantenimiento
│
├── docs/
│   ├── architecture/     Decisiones y diagramas de arquitectura
│   ├── decisions/        Contexto del agente y reglas operativas
│   ├── guidelines/       Lineamientos de desarrollo y QA
│   ├── testing/          Estrategia y planes de prueba
│   ├── audits/           Auditorías técnicas
│   └── reports/          Reportes de implementación
│
├── config/
│   ├── lint/             Configuración de linters
│   ├── formatting/       Configuración de formatters
│   └── quality/          Reglas de calidad de código
│
├── .github/
│   ├── workflows/        Pipelines de CI/CD (GitHub Actions)
│   ├── agents/           Agentes ASDD activos para Copilot Chat
│   ├── skills/           Skills activas del framework ASDD
│   ├── prompts/          Prompts operativos del framework
│   └── instructions/     Instrucciones path-scoped para backend, frontend y tests
│
├── docker-compose.yml    Stack completo de desarrollo
├── docker-compose.ci.yml Overlay para entorno CI
├── Makefile              Comandos unificados
├── .gitignore            Exclusiones globales
├── .editorconfig         Estilo de edición consistente
├── CONTRIBUTING.md       Guía de contribución
└── README.md             Descripción general del proyecto
```

## Backend — apps/backend

### Estilo arquitectónico

Hexagonal Architecture + Event Sourcing + CQRS + Outbox Pattern

### Flujo de datos

```
Next.js UI
  → ASP.NET Minimal API
    → Domain Aggregate (WaitingRoom)
      → PostgreSQL Event Store
        → Outbox Pattern
          → Worker (dispatcher)
            → RabbitMQ (topic exchange)
              → Proyecciones (read models)
```

### Estructura interna

```
apps/backend/src/
├── BuildingBlocks/
│   ├── BuildingBlocks.EventSourcing/
│   ├── BuildingBlocks.Messaging/
│   └── BuildingBlocks.Observability/
└── Services/WaitingRoom/
    ├── WaitingRoom.API/          Minimal API endpoints
    ├── WaitingRoom.Application/  Comandos y handlers CQRS
    ├── WaitingRoom.Domain/       Agregado + eventos de dominio
    ├── WaitingRoom.Infrastructure/ Persistencia y adaptadores
    ├── WaitingRoom.Projections/  Proyecciones read-side
    └── WaitingRoom.Worker/       Outbox dispatcher
```

### Tests

```
apps/backend/src/Tests/
├── WaitingRoom.Tests.Domain/       Pruebas unitarias de dominio
├── WaitingRoom.Tests.Application/  Pruebas de casos de uso
├── WaitingRoom.Tests.Projections/  Pruebas de proyecciones
└── WaitingRoom.Tests.Integration/  Pruebas de integración
```

## Frontend — apps/frontend

### Estilo arquitectónico

Clean Architecture adaptada para Next.js App Router con separación estricta de capas.

### Estructura interna

```
apps/frontend/src/
├── app/                  Páginas (App Router)
├── domain/               Entidades y contratos
├── application/          Casos de uso y servicios
├── infrastructure/       Adaptadores HTTP y WebSocket
├── components/           Componentes reutilizables
├── hooks/                Custom hooks
└── services/             Servicios de soporte
```

## Infraestructura

| Componente | Tecnología | Puerto |
|---|---|---|
| API | ASP.NET Core 10 | 5000 |
| Frontend | Next.js 15 | 3001 |
| Base de datos | PostgreSQL 16 | 5432 |
| Mensajería | RabbitMQ 3.12 | 5672 / 15672 |
| Monitoreo métricas | Prometheus | 9090 |
| Visualización | Grafana | 3002 |
| Logging estructurado | Seq | 5341 |
| Admin DB | PgAdmin | 5050 |

## Principios arquitectónicos

1. Separación estricta de capas: dominio sin dependencias de infraestructura
2. Inversión de dependencias en todos los puertos
3. Event Sourcing como fuente de verdad
4. Outbox Pattern para garantía de entrega
5. CQRS para separación de lecturas y escrituras
6. Observabilidad desde el diseño (métricas, trazas, logs)
7. Seguridad en tiempo de ejecución (contenedores non-root, read-only filesystem)
