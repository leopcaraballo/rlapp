# Capa de aplicación — Servicio WaitingRoom

## Propósito

La capa de aplicación coordina casos de uso y puertos de salida para el dominio de sala de espera.
No contiene reglas de negocio del agregado; orquesta flujos y delega validaciones al dominio.

## Responsabilidades

- Recibir comandos y mapearlos a casos de uso.
- Recuperar estado del agregado desde el `EventStore`.
- Ejecutar operaciones del agregado con invariantes de dominio.
- Persistir eventos y metadatos de concurrencia.
- Publicar integración mediante outbox/event publisher.
- Exponer resultados para consultas y proyecciones.

## Principios de diseño

1. Separación estricta entre `Commands` y `Queries`.
2. Dependencias hacia puertos, no hacia implementaciones concretas.
3. Idempotencia en puntos de entrada críticos.
4. Control explícito de concurrencia optimista.
5. Manejo de errores orientado a reglas de negocio y trazabilidad.

## Flujo canónico de comando

1. Cargar historial del agregado.
2. Reconstruir estado en memoria.
3. Ejecutar método de dominio.
4. Validar eventos resultantes.
5. Persistir en `EventStore`.
6. Registrar en `Outbox`.
7. Publicar y notificar proyecciones.

## Contratos mínimos esperados

- `IEventStore`
- `IOutboxRepository`
- `IEventPublisher`
- `IWaitingRoomProjectionContext`
- `IClock` o proveedor temporal equivalente

## Criterios de calidad

- Pruebas unitarias de handlers y mapeos.
- Pruebas de integración para persistencia de eventos y outbox.
- Cobertura de escenarios de conflicto de concurrencia.
- Evidencia de idempotencia en comandos repetidos.

## Antipatrones prohibidos

- Lógica de negocio en handlers.
- Dependencias directas a base de datos en dominio.
- Publicación de eventos sin registro previo en outbox.
- Lecturas del read model para tomar decisiones de escritura.

## Definición de completitud

Un cambio en esta capa se considera completo cuando:

- Respeta puertos y límites arquitectónicos.
- Incluye validación automatizada y documentación de impacto.
- Mantiene compatibilidad con flujos operativos de recepción, caja y atención médica.
