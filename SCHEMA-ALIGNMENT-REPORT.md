# SCHEMA ALIGNMENT REPORT

**Fecha:** 2026-02-19
**Entorno:** Linux
**Objetivo:** Alinear esquema SQL con el modelo esperado por Infrastructure (codigo como fuente de verdad).

## Fuente de verdad

- Event store y outbox: [src/Services/WaitingRoom/WaitingRoom.Infrastructure/Persistence/EventStore/EventStoreSchema.cs](src/Services/WaitingRoom/WaitingRoom.Infrastructure/Persistence/EventStore/EventStoreSchema.cs)
- Lag tracking: [src/Services/WaitingRoom/WaitingRoom.Infrastructure/Observability/PostgresEventLagTracker.cs](src/Services/WaitingRoom/WaitingRoom.Infrastructure/Observability/PostgresEventLagTracker.cs)
- Projection checkpoints: [src/Services/WaitingRoom/WaitingRoom.Projections/Abstractions/ProjectionCheckpoint.cs](src/Services/WaitingRoom/WaitingRoom.Projections/Abstractions/ProjectionCheckpoint.cs)
- IDs de dominio: [src/Services/WaitingRoom/WaitingRoom.Domain/ValueObjects/PatientId.cs](src/Services/WaitingRoom/WaitingRoom.Domain/ValueObjects/PatientId.cs)

## Cambios aplicados (init.sql)

Archivo: [infrastructure/postgres/init.sql](infrastructure/postgres/init.sql)

- projection_checkpoints ahora alinea con `ProjectionCheckpoint`:
  - `projection_id` TEXT (PK)
  - `last_event_version` BIGINT
  - `checkpointed_at` TIMESTAMPTZ
  - `idempotency_key` TEXT (unique)
  - `status` TEXT
- read models usan IDs string (TEXT) en lugar de UUID:
  - `waiting_queue_view.queue_id` TEXT
  - `waiting_patients_view.queue_id` TEXT
  - `waiting_patients_view.patient_id` TEXT

## Migracion aplicada en contenedores

1) Event store (waitingroom_eventstore):

```
DROP TABLE IF EXISTS projection_checkpoints;
CREATE TABLE projection_checkpoints (...);
CREATE UNIQUE INDEX ux_projection_checkpoints_idempotency ...;
```

1) Test DB (waitingroom_test):

```
DROP TABLE IF EXISTS projection_checkpoints;
CREATE TABLE projection_checkpoints (...);
CREATE UNIQUE INDEX ux_projection_checkpoints_idempotency ...;
```

1) Read models (waitingroom_read_models):

```
ALTER TABLE waiting_queue_view ALTER COLUMN queue_id TYPE TEXT USING queue_id::text;
ALTER TABLE waiting_patients_view ALTER COLUMN queue_id TYPE TEXT USING queue_id::text;
ALTER TABLE waiting_patients_view ALTER COLUMN patient_id TYPE TEXT USING patient_id::text;
```

## Validacion

- projection_checkpoints (eventstore):

```
projection_id TEXT
last_event_version BIGINT
checkpointed_at TIMESTAMPTZ
idempotency_key TEXT
status TEXT
```

- read models key types:

```
waiting_queue_view.queue_id TEXT
waiting_patients_view.queue_id TEXT
waiting_patients_view.patient_id TEXT
```

## Observaciones

- Docker compose levanto correctamente. Aparecio warning por `version` obsoleto en docker-compose.yml.
- Event store, outbox y lag tracking ya estaban alineados con el codigo.

## Estado

**Schema alineado con codigo** para:

- Event store
- Outbox
- Lag tracking
- Projection checkpoints
- Read models (IDs string)
