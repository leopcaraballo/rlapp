# Reporte de impacto TDD BDD - 2026-02-27

## Objetivo

Asegurar que la lógica clínica de Check-In se valida con pruebas orientadas al negocio, aplicando TDD, BDD y patrón AAA, con evidencia trazable de funcionamiento.

## Alcance

- Flujo de check-in en backend.
- Registro de identidad clínica de paciente.
- Validación de conflicto clínico de identidad.
- Restricción de rol operativo para recepción.
- Generación backend de queueId.

## Metodología aplicada

### TDD

1. Red: definición/refuerzo de pruebas para reglas de negocio faltantes.
2. Green: ajustes mínimos para que pruebas pasen sin sobre-ingeniería.
3. Refactor: mejora de legibilidad, nombres semánticos y consistencia AAA.

### BDD

Escenarios modelados en estructura Given-When-Then:

- Given paciente existente con identidad divergente, When intenta registro, Then conflicto clínico controlado.
- Given request sin rol de recepción válido, When invoca check-in, Then denegación de acceso.
- Given payload sin queueId, When check-in es procesado, Then queueId es generado por backend.
- Given misma identidad con mismos datos, When registro se repite, Then resultado idempotente.

### AAA

Las pruebas quedaron estructuradas explícitamente en:

- Arrange: preparación de datos y dependencias.
- Act: ejecución del comportamiento bajo prueba.
- Assert: verificación de resultados y efectos colaterales.

## Evidencia técnica

### Pruebas actualizadas o creadas

- `WaitingRoom.Tests.Application/CommandHandlers/CheckInPatientCommandHandlerTests.cs`
- `WaitingRoom.Tests.Integration/API/ReceptionistOnlyFilterTests.cs`
- `WaitingRoom.Tests.Integration/API/ExceptionHandlerMiddlewareTests.cs`
- `WaitingRoom.Tests.Integration/Infrastructure/PostgresPatientIdentityRegistryTests.cs`

### Resultados de ejecución

- WaitingRoom.Tests.Application: 12/12 pruebas exitosas.
- WaitingRoom.Tests.Integration: 19/19 pruebas exitosas.
- Corrida combinada Application + Integration: 31/31 pruebas exitosas.

### Cobertura focal obtenida

- `CheckInPatientCommandHandler`: 95.65%.CheckInPatientCommandHandler
- `ReceptionistOnlyFilter`: 81.82%.
- `ExceptionHandlerMiddleware`: 94.12%.
- `PostgresPatientIdentityRegistry`: 96.55%.

## Hallazgos

1. La lógica de identidad clínica ya no depende únicamente de validaciones en memoria; existe validación persistente con unicidad en base de datos.
2. El conflicto de identidad quedó formalizado con excepción de negocio y mapeo HTTP consistente (`409`).
3. Se cerró brecha de pruebas en seguridad operativa de recepción (rol requerido).
4. Se consolidó trazabilidad entre comportamiento esperado y evidencia de ejecución.

## Impacto real del cambio

### En negocio clínico

- Reduce riesgo de colisiones de identidad de paciente por captura inconsistente.
- Incrementa control operativo en recepción al restringir acceso por rol.
- Refuerza confiabilidad de asignación de cola al evitar queueId controlado por cliente.

### En calidad y mantenimiento

- Pruebas más legibles y auditables por estructura AAA y semántica BDD.
- Menor riesgo de regresión en cambios futuros de check-in.
- Evidencia reproducible para auditorías técnicas y de cumplimiento.

## Riesgos residuales

- El control de rol actual se basa en encabezado y no en autenticación robusta con claims/policies.
- Se recomienda migrar a esquema formal de authN/authZ para entorno productivo clínico.

## Recomendaciones siguientes

1. Implementar autenticación y autorización basada en identidad autenticada (JWT + policies).
2. Mantener cobertura focal de check-in por encima de 90%.
3. Ejecutar estas suites en CI como puerta obligatoria de merge.
