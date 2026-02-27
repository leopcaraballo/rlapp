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
