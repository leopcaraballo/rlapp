# REAL BUILD STATE REPORT

**Fecha:** 2026-02-19
**Entorno:** Linux
**Objetivo:** Exponer el estado real del build y tests con la solucion completa.

## Solucion evaluada

La solucion actual incluye todos los proyectos (API, Projections, Worker y Tests).

## Comandos ejecutados

```
dotnet clean

dotnet build -c Release

dotnet test
```

## Resultado del build (Release)

**Estado:** OK

Todos los proyectos compilan en Release.

## Resultado de tests

**Estado:** FALLA (4 errores)

### Fallas detectadas

1) AggregateNotFoundException: el aggregate no existe para el test de pipeline completo.

```
WaitingRoom.Application.Exceptions.AggregateNotFoundException : Aggregate with ID 'test-queue-1' not found in event store.
```

1) Violacion de unicidad en version de eventos (duplicate key en ux_waiting_room_events_aggregate_version).

```
Npgsql.PostgresException : 23505: duplicate key value violates unique constraint "ux_waiting_room_events_aggregate_version"
```

1) AggregateNotFoundException en escenario de slowest events.

```
WaitingRoom.Application.Exceptions.AggregateNotFoundException : Aggregate with ID 'queue-slow-0' not found in event store.
```

1) Estadisticas de lag incorrectas (esperado 10, actual 0).

```
Assert.Equal() Failure: Values differ
Expected: 10
Actual:   0
```

### Evidencia de origen

- AggregateNotFound en [src/Services/WaitingRoom/WaitingRoom.Application/CommandHandlers/CheckInPatientCommandHandler.cs](src/Services/WaitingRoom/WaitingRoom.Application/CommandHandlers/CheckInPatientCommandHandler.cs#L65)
- Duplicado en [src/Services/WaitingRoom/WaitingRoom.Infrastructure/Persistence/EventStore/PostgresEventStore.cs](src/Services/WaitingRoom/WaitingRoom.Infrastructure/Persistence/EventStore/PostgresEventStore.cs#L162)
- Fallas de E2E en [src/Tests/WaitingRoom.Tests.Integration/EndToEnd/EventDrivenPipelineE2ETests.cs](src/Tests/WaitingRoom.Tests.Integration/EndToEnd/EventDrivenPipelineE2ETests.cs#L160)

## Notas adicionales

- Build Release limpio, sin errores.
- Las fallas actuales son reales y reproducibles en tests de integracion.

## Siguiente paso obligatorio

Corregir el esquema (Fase 1) y la inicializacion del estado base en E2E para evitar AggregateNotFound y conflictos de version.
