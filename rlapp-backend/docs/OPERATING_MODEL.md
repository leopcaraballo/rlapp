# Modelo operativo backend (canónico)

## Flujo de negocio real

1. Recepción registra paciente.
2. Caja llama siguiente y resuelve estado de pago.
3. Consulta médica reclama paciente elegible.
4. Médico inicia/finaliza atención o marca ausencia.
5. Consultas consumen vistas proyectadas para monitoreo y operación.

## Reglas observadas

- Priorización clínica en selección de pacientes.
- Validación de transición de estados en dominio.
- Retries y límites en escenarios de ausencia/pago pendientes.
- Control de concurrencia optimista en Event Store.

## Dependencias operativas

- PostgreSQL (event store + outbox)
- RabbitMQ (bus de eventos)
- Worker activo para outbox dispatch

## Riesgos operativos vigentes

- Ausencia de authentication/authorization.
- Proyecciones in-memory en API (estado no persistente).
