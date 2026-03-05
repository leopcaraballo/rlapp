# Arquitectura backend (canónica)

## Resumen

El backend implementa un modelo de sala de espera médica en .NET 10 con arquitectura hexagonal, Event Sourcing, CQRS y Outbox Pattern.

## Componentes

- `WaitingRoom.API`: borde HTTP, middleware, endpoints, health checks, métricas.
- `WaitingRoom.Application`: command handlers y puertos.
- `WaitingRoom.Domain`: agregado `WaitingQueue`, invariantes, eventos y value objects.
- `WaitingRoom.Infrastructure`: persistencia PostgreSQL, outbox, publisher RabbitMQ, serialización.
- `WaitingRoom.Worker`: outbox dispatcher con retries/backoff.
- `WaitingRoom.Projections`: projection engine y read context en memoria.

## Flujo técnico

1. Command HTTP llega a API.
2. Handler de aplicación carga agregado desde Event Store.
3. Dominio emite eventos.
4. Event Store persiste eventos y outbox en la misma transacción.
5. Worker publica outbox a RabbitMQ.
6. Query endpoints atienden desde read models/projections.

## Decisiones de integridad clínica (Check-In)

- `patientId` se trata como identidad clínica global y se registra en `waiting_room_patients`.
- Unicidad de identidad: `waiting_room_patients.patient_id` es único a nivel base de datos.
- Conflicto clínico: si llega el mismo `patientId` con nombre distinto, se lanza `PatientIdentityConflictException` y la API responde `409`.
- `queueId` se considera backend-driven en check-in y se genera en capa de aplicación/infrastructura.
- El backend permanece como única fuente de verdad para identidad y asignación de cola.

## Seguridad operativa actual para check-in

- Se aplica filtro de rol en endpoints de check-in con `X-User-Role: Receptionist`.
- Esta protección es de transición; para producción debe migrarse a autorización robusta basada en identidad autenticada y políticas de claims.

## Patrones confirmados

- Hexagonal Architecture
- Event Sourcing
- CQRS
- Outbox Pattern
- Idempotencia en persistencia y proyecciones

## Limitaciones vigentes

- Sin authentication/authorization.
- Sin rate limiting backend.
- Read models en memoria (volátiles al reinicio).
- Hub SignalR expuesto con integración funcional parcial en eventos push.
