cumplimiento total# Auditoría técnica integral del proyecto RLAPP

Fecha de corte: 27 de febrero de 2026
Fuente única de verdad: código fuente y configuración del repositorio

## 1. Resumen ejecutivo

El sistema real implementado es una solución de gestión de sala de espera médica basada en .NET 10 + Next.js 16, con persistencia en PostgreSQL, mensajería asíncrona con RabbitMQ y proyecciones CQRS en memoria dentro de la API.

La arquitectura observada no corresponde al stack JavaScript/NoSQL previamente documentado ni a un esquema Producer/Consumer en TypeScript. El backend principal es C# con Event Sourcing, Outbox Pattern y un Worker para despacho confiable de eventos.

## 2. Arquitectura real implementada

### 2.1 Topología lógica (texto)cumplimiento total

1. Cliente web (Next.js) envía comandos HTTP a la API (`WaitingRoom.API`).
2. La API traduce DTO -> Command -> CommandHandler.
3. El dominio (`WaitingQueue`) emite `DomainEvent` y el `EventStore` los persiste en PostgreSQL.
4. En la misma transacción se escriben mensajes en outbox (`waiting_room_outbox`).
5. `WaitingRoom.Worker` lee outbox y publica en RabbitMQ.
6. Las consultas se atienden desde proyecciones en memoria (`InMemoryWaitingRoomProjectionContext`) dentro de la API.
7. El frontend combina polling REST con SignalR para baja latencia.

### 2.2 Patrones verificados en código

- **Hexagonal Architecture** (puertos en aplicación e infraestructura como adapters).
- **Event Sourcing** (tabla de eventos + reconstrucción de agregado).
- **CQRS** (command endpoints vs query endpoints).
- **Outbox Pattern** (persistencia transaccional + dispatcher asíncrono).
- **Projection Engine** con handlers idempotentes.
- **Repository/Adapter Pattern** en frontend y backend.

## 3. Módulos reales implementados

### 3.1 Backend

- `WaitingRoom.API`: Minimal API, middleware, endpoints, health checks, métricas.
- `WaitingRoom.Domain`: agregado `WaitingQueue`, invariantes, eventos, value objects.
- `WaitingRoom.Application`: command handlers, DTOs, puertos (`IEventStore`, `IEventPublisher`, `IOutboxStore`).
- `WaitingRoom.Infrastructure`: EventStore PostgreSQL, OutboxStore PostgreSQL, publisher RabbitMQ, serialización.
- `WaitingRoom.Worker`: dispatch de outbox con retries y backoff exponencial.
- `WaitingRoom.Projections`: motor de proyecciones y contexto in-memory.

### 3.2 Frontend

- App Router con módulos operativos: `reception`, `cashier`, `medical`, `waiting-room/[queueId]`, `dashboard`.
- Capa de aplicación (`use cases`) y adapters HTTP/SignalR.
- Hooks operativos (`useWaitingRoom`, `useMedicalStation`, `useCashierStation`, `useConsultingRooms`).

## 4. Seguridad, validación y confiabilidad

### 4.1 Implementado

- Validación de DTO por `DataAnnotations` + `RequestValidationFilter`.
- Manejo global de excepciones con mapeo a códigos HTTP.
- Correlation ID (`X-Correlation-Id`) por middleware.
- CORS explícito para orígenes de desarrollo.
- Outbox con retries y control de mensajes fallidos.
- Proyecciones idempotentes por clave de idempotencia.
- Frontend con middleware de rate limiting y headers de seguridad (`proxi.ts`).

### 4.2 No implementado o incompleto

- **Authentication**: no existe `AddAuthentication`/`UseAuthentication`.
- **Authorization**: no existe `AddAuthorization`/`[Authorize]`.
- **Backend Rate Limiting**: no existe `AddRateLimiter`/`UseRateLimiter`.
- **Caching backend** persistente/distribuido: no hay Redis ni `IMemoryCache` operativo.
- **Persistencia de read models**: la proyección activa en API es in-memory (volátil).
- **Consumo de `X-Idempotency-Key` en API**: el header se envía desde frontend, pero no se integra explícitamente en pipeline API.

## 5. Clasificación de features

### 5.1 Estado por feature

- ✅ **CheckIn Patient Flow**: implementado de extremo a extremo.
- ✅ **Cashier Workflow** (`call-next`, `validate-payment`, `mark-payment-pending`, `mark-absent`, `cancel-payment`).
- ✅ **Medical Workflow** (`claim-next`, `start-consultation`, `finish-consultation`, `mark-absent`, `activate/deactivate room`).
- ✅ **Event Sourcing + Outbox + RabbitMQ** operativos en backend.
- ✅ **Health checks y métricas Prometheus** expuestas por API.
- ✅ **Pruebas backend** (domain/application/integration/projections) presentes y ejecutables.
- ⚠️ **Realtime push backend->frontend** parcial: hub SignalR existe, pero sin métodos ni contratos push explícitos en el hub.
- ⚠️ **Projections service dedicado** parcial: existe código de worker/subscriber de proyecciones, pero no está ensamblado como servicio ejecutable independiente.
- ⚠️ **Frontend middleware de seguridad** parcial: archivo nombrado `proxi.ts`; en Next.js estándar se espera `middleware.ts` para activación automática.
- ❌ **Authentication Module**
- ❌ **Authorization Module**
- ❌ **Backend Rate Limiting Module**
- ❌ **Persistent Projection Store Module**
- 🧩 **SocketIoAdapter** declarado pero no usado en runtime (solo cobertura de tests).
- 🧩 **HttpAppointmentRepository** declarado pero sin uso productivo (solo tests).

### 5.2 Registro obligatorio de faltantes

- FALTA IMPLEMENTAR: AuthenticationModule
- FALTA IMPLEMENTAR: AuthorizationModule
- FALTA IMPLEMENTAR: BackendRateLimitingModule
- FALTA IMPLEMENTAR: PersistentProjectionStore

## 6. Flujo real de negocio

1. Recepción registra paciente (`/api/reception/register` o `/api/waiting-room/check-in`).
2. Caja llama siguiente, valida/pendiente/cancela pago.
3. Consulta médica reclama siguiente paciente elegible.
4. Médico inicia/finaliza atención o marca ausencia.
5. Query endpoints entregan monitor, estado de cola, next turn e historial reciente.

## 7. Endpoints reales identificados

### 7.1 Commands

- `POST /api/waiting-room/check-in`
- `POST /api/reception/register`
- `POST /api/cashier/call-next`
- `POST /api/cashier/validate-payment`
- `POST /api/cashier/mark-payment-pending`
- `POST /api/cashier/mark-absent`
- `POST /api/cashier/cancel-payment`
- `POST /api/medical/call-next`
- `POST /api/medical/consulting-room/activate`
- `POST /api/medical/consulting-room/deactivate`
- `POST /api/medical/start-consultation`
- `POST /api/medical/finish-consultation`
- `POST /api/medical/mark-absent`
- `POST /api/waiting-room/claim-next`
- `POST /api/waiting-room/call-patient`
- `POST /api/waiting-room/complete-attention`

### 7.2 Queries

- `GET /api/v1/waiting-room/{queueId}/monitor`
- `GET /api/v1/waiting-room/{queueId}/queue-state`
- `GET /api/v1/waiting-room/{queueId}/next-turn`
- `GET /api/v1/waiting-room/{queueId}/recent-history`
- `POST /api/v1/waiting-room/{queueId}/rebuild`

### 7.3 Operación y observabilidad

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /openapi/v1.json`
- `GET|WS /ws/waiting-room`

## 8. Persistencia y modelos de datos

- Event Store en PostgreSQL (`waiting_room_events`) con control de concurrencia e idempotencia.
- Outbox en PostgreSQL (`waiting_room_outbox`) para publicación confiable.
- Read models en memoria (`WaitingRoomMonitorView`, `QueueStateView`, `NextTurnView`, `RecentAttentionRecordView`).

## 9. Pruebas y calidad

- Backend: suites domain/application/integration/projections identificadas y ejecutables.
- Evidencia de ejecución en esta auditoría: muestras backend exitosas (sin fallos).
- Cobertura puntual observada en muestra de `WaitingQueue.cs`: baja cuando se ejecuta solo una clase de tests aislada (no representa cobertura global).
- Frontend: existen pruebas Jest y Playwright, pero el runner integrado de esta sesión no detectó tests en el entorno auditado.

## 10. Deuda técnica detectada

- Proyección de lectura volátil en API (pérdida de estado al reinicio).
- Ausencia de authn/authz.
- Rate limiting únicamente en frontend (insuficiente para protección backend).
- CORS acotado a desarrollo en configuración principal.
- Inconsistencia entre nombre esperado de middleware Next (`middleware.ts`) y archivo presente (`proxi.ts`).
- Duplicidad de clientes HTTP/adapters en frontend (riesgo de deriva funcional).

## 11. Riesgos técnicos

- Riesgo alto de exposición no autenticada de operaciones clínicas.
- Riesgo de pérdida de consistencia de vistas tras reinicio por proyección in-memory.
- Riesgo de bypass de rate limit al consumir backend directamente.
- Riesgo de desalineación operacional por documentación histórica contradictoria.

## 12. Código muerto o sin uso operativo

- `SocketIoAdapter` (uso real no detectado fuera de tests).
- `HttpAppointmentRepository` (uso productivo no detectado).
- `WaitingRoom.Projections/Worker` y `RabbitMqProjectionEventSubscriber` sin ensamblaje de servicio ejecutable real en proyecto actual.

## 13. Inconsistencias arquitectónicas

- Documentos históricos describen un stack JavaScript/NoSQL y una topología de servicios distinta, pero el código real es .NET/PostgreSQL.
- Se documenta “servicio de proyecciones” como proceso ejecutable, pero no existe `Program.cs` en `WaitingRoom.Projections`.
- Se documenta uso de Socket.IO productivo, pero el runtime usa SignalR + polling.

## 14. Lista priorizada de mejoras

1. Implementar `AuthenticationModule` y `AuthorizationModule` en backend.
2. Implementar rate limiting en backend (global + por endpoint sensible).
3. Persistir read models en PostgreSQL y eliminar dependencia de in-memory para producción.
4. Corregir activación de middleware de seguridad frontend (`middleware.ts`).
5. Unificar adapters HTTP frontend para evitar duplicidad y deriva.
6. Definir y versionar contratos de eventos push de SignalR.
7. Fortalecer CI para frontend (ejecución efectiva + umbrales de cobertura verificables).

## 15. Checklist técnico de pendientes

- [ ] Implementar authentication backend.
- [ ] Implementar authorization por rol/permisos.
- [ ] Implementar rate limiting backend.
- [ ] Persistir read models/projections.
- [ ] Formalizar SignalR hub con contratos explícitos.
- [ ] Corregir middleware frontend a convención oficial.
- [ ] Consolidar capa de infraestructura HTTP en frontend.
- [ ] Alinear pipelines CI con rutas/proyectos reales.
