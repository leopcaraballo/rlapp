# Arquitectura del Proyecto (Nivel Alto)

## Estilo arquitectónico

- Monorepo con separación por aplicaciones (`apps/backend`, `apps/frontend`) y capas por módulo.
- Backend basado en ASP.NET Core Minimal API, Event Sourcing, CQRS y Outbox Pattern.
- Frontend basado en Next.js App Router con separación entre `app`, `application`, `domain`, `infrastructure`, `components` y `hooks`.

## Bounded contexts

- **Waiting Room**: registro de pacientes, colas, atención y proyecciones operativas.
- **Gestión de Roles y Acceso**: controles de Recepcionista, Cajero, Doctor y Administrador.
- **Monitoreo y Visualización**: dashboard, display y vistas de lectura en tiempo real.

## Módulos principales y responsabilidades

- `WaitingRoom.API`: endpoints, middlewares, filtros y wiring de dependencias.
- `WaitingRoom.Application`: commands, DTOs, handlers y puertos.
- `WaitingRoom.Domain`: aggregates, invariantes, value objects y eventos.
- `WaitingRoom.Infrastructure` y `WaitingRoom.Projections`: persistencia, mensajería y modelos de lectura.

## Restricciones arquitectónicas

1. Los endpoints no contienen lógica clínica compleja; delegan en handlers y aggregates.
2. El dominio no depende de infraestructura ni de detalles HTTP.
3. Las mutaciones de estado pasan por commands, handlers, aggregates y Event Store.
4. Las proyecciones y vistas de lectura no deben convertirse en la fuente de verdad del dominio.

## Criterios de encaje para requerimientos

- Requerimientos de registro, atención o monitoreo de pacientes pertenecen al bounded context **Waiting Room**.
- Cambios que crucen múltiples contextos o módulos operativos en una sola historia requieren descomposición.
