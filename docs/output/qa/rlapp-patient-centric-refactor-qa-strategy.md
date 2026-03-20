# QA Strategy - rlapp-patient-centric-refactor

## Contexto
Feature en estado IN_PROGRESS con avance técnico reportado:
- Backend: capas de rutas, servicios y repositorios validadas.
- Integración SQL de proyecciones: suite agregada y en verde.
- Frontend: fix en waitingRoomSignalR.spec.ts aplicado.
- Frontend services: 98/98 pruebas en verde.

## Objetivo de calidad
Validar que la refactorización centrada en Paciente mantiene consistencia funcional, seguridad por rol, idempotencia, trazabilidad por eventos y operación paralela por Consultorio sin regresiones críticas en frontend y backend.

## Alcance QA de Fase 4
- Funcional: ciclo completo Paciente desde registro hasta COMPLETED.
- Integración: Event Store -> Outbox -> Proyecciones de lectura.
- Seguridad: autorización por rol (Recepcionista, Doctor, Cajero, Administrador).
- Resiliencia: idempotencia, replay de proyecciones, tolerancia a desconexión SignalR.
- No funcional: lineamientos de performance y gates sugeridos para CI.

## Enfoque de prueba
1. Riesgo-prioridad (ASD)
- Alto: pagos, autorización, idempotencia, consistencia eventual de proyecciones, datos personales.
- Medio: transiciones de estado complejas, concurrencia por consultorios, reconexión tiempo real.
- Bajo: variaciones cosméticas o no funcionales de UI.

2. Niveles
- Unitarias: invariantes de agregado y validaciones de comandos.
- Integración backend: contratos HTTP, repositorios PostgreSQL, worker/proyecciones.
- Integración frontend: servicios API + SignalR con fallback y eventos.
- E2E objetivo (si no está completo): flujo Paciente end-to-end por rol.

3. Cobertura mínima objetivo
- Por HU: happy path + error path + edge case.
- Por endpoint crítico: 2xx, 4xx de validación, 403/401 de rol, 409 de transición inválida, idempotencia repetida.
- Por proyección crítica: actualización incremental y replay determinístico.

## Evidencia disponible al cierre de esta fase
- Cobertura de integración HTTP backend para endpoints de Paciente y restricciones de rol.
- Suite de integración SQL para repositorios de proyección (estado Paciente, cola de caja, ocupancia).
- Pruebas de replay y worker de proyecciones existentes.
- Frontend services y SignalR en verde.

## Gaps detectados
1. La spec no fija números explícitos de SLA (P95, tasa de error, throughput); solo declara objetivos de latencia/throughput.
2. Falta evidenciar una suite E2E integral del flujo patient-centric completo en estado estable de pipeline.
3. Existe coexistencia de terminología legacy queue-centric en parte de pruebas/código, con riesgo de ambigüedad funcional/documental.

## Gates propuestos para avanzar a IMPLEMENTED
1. Gate funcional
- 100% de escenarios criticos Gherkin en verde para HU-01 a HU-05.
- Cero defectos abiertos de severidad Alta.

2. Gate de regresión
- Backend integration y frontend services: verde en main branch.
- Pruebas de proyección/replay e idempotencia: verde.

3. Gate de seguridad y dominio
- Verificación de 401/403 por rol en endpoints sensibles.
- Verificación de no-duplicación con idempotency key en operaciones críticas.

4. Gate de performance inicial
- Baseline de carga ejecutada y publicada.
- Cumplimiento de umbrales provisionales definidos en el plan de performance adjunto.

## Recomendación de salida de Fase 4
- Condición para salida parcial: criterios funcionales y de riesgo Alto cerrados.
- Condición para salida completa: incluir baseline de performance y trazabilidad E2E del flujo Paciente completo.