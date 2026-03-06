# Pruebas backend (canónico)

## Suites detectadas

- `WaitingRoom.Tests.Domain`
- `WaitingRoom.Tests.Application`
- `WaitingRoom.Tests.Projections`
- `WaitingRoom.Tests.Integration`

## Cobertura funcional de pruebas

- Dominio: invariantes, estados y eventos del agregado.
- Aplicación: command handlers y reglas de orchestration.
- Proyecciones: idempotencia y reprocesamiento.
- Integración: workflow Event Store -> Outbox -> Publishing.

## Ejecución

```bash
dotnet test rlapp-backend/RLAPP.slnx
```

## Notas

- Existen pruebas de integración que dependen de infraestructura (PostgreSQL/RabbitMQ) según configuración del entorno.
- La cobertura global no debe inferirse desde ejecución parcial de una sola clase de pruebas.

## Aplicación de TDD, BDD y patrón AAA

### Enfoque aplicado

- TDD: ciclo Red-Green-Refactor en pruebas críticas de check-in e identidad clínica.
- BDD: escenarios Given-When-Then para reglas de negocio y seguridad operativa.
- AAA: estructura explícita Arrange-Act-Assert en pruebas nuevas y refactorizadas.

### Escenarios de negocio cubiertos

- Dado un `patientId` existente con nombre distinto, cuando se registra, entonces se produce conflicto de identidad clínica.
- Dado un request sin rol de recepción, cuando pasa por filtro de check-in, entonces se deniega acceso.
- Dado un check-in sin `queueId`, cuando se procesa, entonces el backend genera `queueId`.
- Dado el mismo `patientId` y mismo nombre, cuando se registra dos veces, entonces el registro es idempotente.

### Evidencia de ejecución (2026-02-27)

- WaitingRoom.Tests.Application: 12/12 exitosas.
- WaitingRoom.Tests.Integration: 19/19 exitosas.
- Suite combinada Application + Integration: 31/31 exitosas.

### Cobertura focal

- `CheckInPatientCommandHandler`: 95.65%.
- `ReceptionistOnlyFilter`: 81.82%.
- `ExceptionHandlerMiddleware`: 94.12%.
- `PostgresPatientIdentityRegistry`: 96.55%.
