# Technical Debt

## 1. Purpose

Registro estructurado de deuda tecnica identificada en el backend RLAPP. Cada item incluye severidad, impacto, archivos afectados y estado de resolucion.

## 2. Context

Fuente: auditoria arquitectonica del codigo fuente (julio 2025). Se identificaron 12 items de deuda tecnica clasificados en tres niveles de severidad: alta (3), media (5) y baja (4).

## 3. Technical Details

### Registro de deuda tecnica

| ID | Description | Severity | Impact | Status | Sprint |
|---|---|---|---|---|---|
| DT-001 | `Program.cs` de la API tiene ~887 lineas combinando composition root, endpoints, middleware y routing | Alta | Mantenibilidad, legibilidad, SRP | Pendiente | 1-2 |
| DT-002 | Proyecciones in-memory (`ConcurrentDictionary`) se pierden al reiniciar el servicio de proyecciones | Alta | Disponibilidad del lado de lectura | Pendiente | 1-2 |
| DT-003 | `WaitingRoomHub` (SignalR) esta completamente vacio, es codigo muerto | Alta | Confusion para desarrolladores, funcionalidad anunciada pero no implementada | Pendiente | 1-2 |
| DT-004 | 10 de 12 command handlers carecen de tests unitarios aislados | Media | Cobertura de pruebas, regresiones | Pendiente | 3-4 |
| DT-005 | `EventTypeRegistry` usa lista estatica, agregar un evento requiere modificar el registro | Media | OCP, extensibilidad | Pendiente | 3-4 |
| DT-006 | Versiones inconsistentes de dependencias de test (FluentAssertions 6.x vs 8.x, xUnit 2.6 vs 2.9) | Media | Compatibilidad, mantenimiento | Pendiente | 3-4 |
| DT-007 | Doble framework de mocking (Moq + NSubstitute) sin justificacion | Media | Complejidad cognitiva, curva de aprendizaje | Pendiente | 3-4 |
| DT-008 | `UnitTest1.cs` es un test vacio residual sin valor | Media | Ruido en suite de pruebas | Pendiente | 5-6 |
| DT-009 | Middleware y filtros sin tests unitarios (`ExceptionHandlerMiddleware`, `CorrelationIdMiddleware`, `RequestValidationFilter`) | Baja | Cobertura | Pendiente | 5-6 |
| DT-010 | `ExceptionHandlerMiddleware` usa pattern matching con tipos concretos (viola OCP parcialmente) | Baja | Extensibilidad | Pendiente | 5-6 |
| DT-011 | Connection strings vacios en `appsettings.json` (se configuran por variable de entorno) | Baja | Documentacion de configuracion | Pendiente | 5-6 |
| DT-012 | No hay mecanismo de health check para RabbitMQ en el readiness probe | Baja | Resiliencia | Pendiente | 5-6 |

### Distribucion por severidad

| Severidad | Cantidad | IDs |
|---|---|---|
| Alta | 3 | DT-001, DT-002, DT-003 |
| Media | 5 | DT-004, DT-005, DT-006, DT-007, DT-008 |
| Baja | 4 | DT-009, DT-010, DT-011, DT-012 |

### Archivos afectados

| ID | Archivos |
|---|---|
| DT-001 | `WaitingRoom.API/Program.cs` |
| DT-002 | `InMemoryWaitingRoomProjectionContext.cs` |
| DT-003 | `WaitingRoomHub.cs` |
| DT-004 | `Tests.Application/` |
| DT-005 | `EventTypeRegistry.cs` |
| DT-006 | `*.Tests.*.csproj` |
| DT-007 | `*.Tests.*.csproj` |
| DT-008 | `UnitTest1.cs` |
| DT-009 | `ExceptionHandlerMiddleware.cs`, `CorrelationIdMiddleware.cs`, `RequestValidationFilter.cs` |
| DT-010 | `ExceptionHandlerMiddleware.cs` |
| DT-011 | `appsettings.json` |
| DT-012 | `Program.cs` |

## 4. Operational / Maintenance Notes

### Esfuerzo estimado de resolucion

| ID | Esfuerzo estimado |
|---|---|
| DT-001 | 4-6 horas |
| DT-002 | 16-24 horas |
| DT-003 | 2-8 horas |
| DT-004 | 8-12 horas |
| DT-005 | 3-4 horas |
| DT-006 | 1-2 horas |
| DT-007 | 2-4 horas |
| DT-008 | 5 minutos |
| DT-009 | 4-6 horas |
| DT-010 | 1-2 horas |Si un dato no existe en la auditoría, debes omitirlo
| DT-011 | Not applicable based on current audit scope. |
| DT-012 | 1-2 horas |

### Priorizacion por sprint

| Sprint | IDs | Justificacion |
|---|---|---|
| 1-2 | DT-001, DT-002, DT-003 | Severidad alta. Impactan mantenibilidad, disponibilidad y limpieza del codigo |
| 3-4 | DT-004, DT-005, DT-006, DT-007 | Severidad media. Impactan cobertura de pruebas y extensibilidad |
| 5-6 | DT-008, DT-009, DT-010, DT-011, DT-012 | Severidad baja a media. Limpieza y mejoras incrementales |

### Items resueltos (migrados desde DEBT_REPORT.md)

| ID | Descripcion | Severidad | Solucion aplicada | Estado |
|---|---|---|---|---|
| DR-001 | Duplicacion de reproyeccion post-comando en API | Media | Eliminada reproyeccion duplicada en pipeline de commands | Resuelto |
| DR-002 | Validacion inconsistente de DTOs en borde HTTP | Media | Implementado `RequestValidationFilter` centralizado con FluentValidation | Resuelto |
| DR-003 | Secretos hardcodeados en configuracion backend | Alta | Migrados a variables de entorno en Docker Compose | Resuelto |
| DR-004 | Rebuild asincrono acoplado a token HTTP | Media | Desacoplado rebuild a proceso background sin dependencia de request HTTP | Resuelto |
