# Restricciones de Stack Tecnológico

## Backend aprobado

- .NET 10
- ASP.NET Core Minimal API
- Event Sourcing + CQRS
- Outbox Pattern
- xUnit, Moq y FluentAssertions para testing backend

## Persistencia e integraciones aprobadas

- PostgreSQL 16+
- RabbitMQ 3.x
- Event Store y read models segun la arquitectura del modulo WaitingRoom

## Frontend aprobado

- Next.js 16
- React 19
- TypeScript
- Jest + Testing Library + Playwright

## API y contratos

- API REST JSON sobre HTTP
- Versionado por ruta (`/api/v1/...`)
- Códigos HTTP estándar (`201`, `400`, `404`, `409`, `500`)

## Tecnologías/librerías no aprobadas para este proyecto

- Frameworks backend paralelos al stack actual sin justificación aprobada
- Motores NoSQL como persistencia primaria del flujo clínico sin ADR explícito
- Atajos de escritura que omitan Event Store, handlers o aggregates del dominio
- Supuestos de Vite, React Router o Firebase en el frontend vigente

## Restricciones de diseño y antipatrones prohibidos

- No usar singletons globales para estado mutable compartido.
- No mutar estado clínico directamente desde endpoints, adaptadores o proyecciones.
- No exponer errores internos de infraestructura en respuestas públicas.

## Capacidades y límites relevantes

- El backend soporta commands, eventos, proyecciones e idempotencia para flujos clínicos y operativos.
- El frontend soporta vistas operativas en tiempo real mediante SignalR/polling según el módulo.
- Timestamps y contratos de persistencia deben mantenerse en UTC y con nomenclatura consistente del dominio.
