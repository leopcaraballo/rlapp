---
applyTo: "apps/backend/src/**/*.cs"
---

> Scope: instrucciones para el backend real del repositorio RLAPP.

# Instrucciones para Archivos de Backend (.NET 10 / Minimal API / Event Sourcing)

## Arquitectura real

El backend vive en `apps/backend/src/` y sigue esta separacion:

```
WaitingRoom.API -> WaitingRoom.Application -> WaitingRoom.Domain
                  -> WaitingRoom.Infrastructure / WaitingRoom.Projections
```

- `WaitingRoom.API`: endpoints Minimal API, middleware, filtros, wiring DI.
- `WaitingRoom.Application`: commands, DTOs, handlers, puertos.
- `WaitingRoom.Domain`: aggregate root, invariantes, value objects, eventos.
- `WaitingRoom.Infrastructure`: persistencia PostgreSQL, messaging, adaptadores.
- `WaitingRoom.Projections`: read models y reconstruccion de vistas.

## Regla de implementacion

Todo cambio de negocio debe respetar este flujo:

```
DTO/API -> Command/Handler -> Aggregate/Domain -> Event Store -> Projection
```

- Los endpoints en `Program.cs` solo mapean request -> command -> handler.
- La logica de negocio vive en el aggregate o en handlers de aplicacion, no en el endpoint.
- La persistencia de cambios de estado pasa por el Event Store. No escribir atajos que salten el aggregate.

## Wiring de dependencias

- Registrar handlers, puertos y adaptadores en `WaitingRoom.API/Program.cs`.
- Inyectar dependencias por parametros del endpoint o por constructor del handler.
- Propagar `CancellationToken` cuando ya exista en la firma.
- Mantener el patron existente de filtros por rol, middlewares de correlacion e idempotencia.

## Convenciones de codigo

- Usar `async`/`await` para I/O y operaciones de infraestructura.
- Tipos publicos en PascalCase; variables locales y parametros en camelCase.
- Mantener DTOs en `WaitingRoom.Application/DTOs` y commands en `WaitingRoom.Application/Commands`.
- Usar `IClock`, `IEventStore`, `IEventPublisher` y puertos existentes antes de introducir nuevas abstracciones.
- Timestamps siempre en UTC.
- Preservar nombres canonicos del dominio: queueId, patientId, consultingRoomId, correlationId, idempotencyKey.

## Al agregar endpoints o comandos

1. Crear o extender DTO en `WaitingRoom.Application/DTOs`.
2. Crear o extender command/handler en `WaitingRoom.Application`.
3. Aplicar reglas del aggregate en `WaitingRoom.Domain` si cambia comportamiento.
4. Registrar endpoint y DI en `WaitingRoom.API/Program.cs`.
5. Actualizar proyecciones si el nuevo evento afecta lecturas.

## Nunca hacer

- No poner reglas de negocio complejas directamente en `Program.cs`.
- No mutar estado clinico fuera del aggregate `WaitingQueue`.
- No acceder directo a PostgreSQL o RabbitMQ desde la capa API.
- No crear controladores MVC o patrones paralelos a Minimal API si el modulo ya usa el wiring actual.

> Para lineamientos generales, ver `.github/docs/lineamientos/dev-guidelines.md`.
