# RLAPP — Application Flow

**Descripción paso a paso del flujo de ejecución de casos de uso.**

## ✅ Estado runtime actual (2026-02-19)

El flujo operativo vigente en aplicación es por rol:

1. `POST /api/reception/register`
2. `POST /api/cashier/call-next`
3. `POST /api/cashier/validate-payment`
4. `POST /api/medical/consulting-room/activate`
5. `POST /api/medical/call-next` (requiere `stationId` activo)
6. `POST /api/medical/start-consultation`
7. `POST /api/medical/finish-consultation`

Flujos alternos implementados:

- `cashier/mark-payment-pending`eliminar los contenedores de docker# RLAPP — Arquitectura Detallada

**Documento técnico que explica la arquitectura hexagonal, event sourcing y decisiones clave.**

---

## 📐 Modelo Arquitectónico

### Patrón Principal: Hexagonal (Ports & Adapters)

La arquitectura está organizada en **capas concéntricas** independientes:

```
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ASP.NET Core Minimal APIs + Middleware              │    │
│  │  - CorrelationIdMiddleware                           │    │
│  │  - ExceptionHandlerMiddleware                        │    │
│  │  - Endpoints (POST /check-in, GET /monitor, etc.)   │    │
│  │  ✗ NO lógica de negocios                            │    │
│  │  ✓ Mapeo DTO → Command                              │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │ COMANDOS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              APPLICATION LAYER                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CheckInPatientCommandHandler                        │    │
│  │  - Carga agregado del EventStore                     │    │
│  │  - Delega reglas al Domain                           │    │
│  │  - Persiste eventos                                  │    │
│  │  - Publica a IEventPublisher (Outbox)               │    │
│  │  ✗ NO reglas de negocios aquí                       │    │
│  │  ✓ PURE ORCHESTRATION                               │    │
│  │                                                       │    │
│  │  Excepciones:                                        │    │
│  │  - AggregateNotFoundException                        │    │
│  │  - EventConflictException                            │    │
│  │  - ApplicationException                              │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │ EVENTOS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                       │    │
│  │  AGREGADOS:                                          │    │
│  │  └─ WaitingQueue                                     │    │
│  │     ├─ Propiedades: Id, Version, Patients[]         │    │
│  │     ├─ Métodos:                                      │    │
│  │     │  ├─ Create()      → WaitingQueueCreated       │    │
│  │     │  ├─ CheckInPatient() → PatientCheckedIn       │    │
│  │     │  └─ When() [privado] → apply events           │    │
│  │     └─ Invariantes:                                  │    │
│  │        ├─ MaxCapacity never exceeded                │    │
│  │        ├─ No duplicate patients                     │    │
│  │        └─ Valid priorities only                     │    │
│  │                                                       │    │
│  │  EVENTOS DE DOMINIO:                                 │    │
│  │  ├─ WaitingQueueCreated                              │    │
│  │  └─ PatientCheckedIn                                 │    │
│  │                                                       │    │
│  │  VALUE OBJECTS:                                      │    │
│  │  ├─ WaitingQueueId                                   │    │
│  │  ├─ PatientId                                        │    │
│  │  ├─ Priority (Low, Medium, High, Urgent)            │    │
│  │  └─ ConsultationType (General, Cardiology, etc.)    │    │
│  │                                                       │    │
│  │  ENTIDADES:                                          │    │
│  │  └─ WaitingPatient (dentro del agregado)            │    │
│  │                                                       │    │
│  │  INVARIANTES:                                        │    │
│  │  └─ WaitingQueueInvariants                           │    │
│  │                                                       │    │
│  │  ✓ ZERO external dependencies                        │    │
│  │  ✓ PURE business logic                              │    │
│  │  ✓ TESTABLE sin mock (reflection en AggregateRoot)  │    │
│  │  ✓ DETERMINISTIC (same input → same output)         │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ PERSISTENCIA → EventStore
                     │ QUERIES → IEventPublisher
                     │
┌────────────────────▼────────────────────────────────────────┐
│             INFRASTRUCTURE LAYER                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PERSISTENCE:                                        │    │
│  │  ├─ PostgresEventStore (IEventStore impl.)          │    │
│  │  │  ├─ SaveAsync: Insert events + Outbox (atomic)  │    │
│  │  │  ├─ LoadAsync: Replay events                     │    │
│  │  │  └─ GetAllEventsAsync: Deterministic order       │    │
│  │  │                                                   │    │
│  │  │  Tabla: waiting_room_events (JSONB)             │    │
│  │  │  Tabla: waiting_room_outbox (status tracking)   │    │
│  │  │                                                   │    │
│  │  ├─ PostgresOutboxStore (IOutboxStore impl.)       │    │
│  │  │  ├─ GetPendingAsync: Fetch retry backoff        │    │
│  │  │  ├─ MarkDispatchedAsync: Status update          │    │
│  │  │  └─ MarkFailedAsync: Retry scheduling           │    │
│  │  │                                                   │    │
│  │  MESSAGING:                                         │    │
│  │  ├─ OutboxEventPublisher (IEventPublisher impl.)   │    │
│  │  │  └─ No-op: Outbox worker es el único publisher  │    │
│  │  │                                                   │    │
│  │  ├─ RabbitMqEventPublisher (dispatch to broker)    │    │
│  │  │  └─ PublishAsync → RabbitMQ topics              │    │
│  │  │                                                   │    │
│  │  SERIALIZATION:                                     │    │
│  │  ├─ EventSerializer (JSON → Domain Events)         │    │
│  │  └─ EventTypeRegistry (event type mapping)         │    │
│  │                                                       │    │
│  │  OBSERVABILITY:                                     │    │
│  │  ├─ PostgresEventLagTracker                         │    │
│  │  └─ EventLagMetrics (CREATED/PUBLISHED/PROCESSED)  │    │
│  │                                                       │    │
│  │  UTILITY:                                            │    │
│  │  ├─ SystemClock (IClock impl.)                      │    │
│  │  └─ EventStoreSchema (DDL)                          │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  EXTERNAL SYSTEMS:                                           │
│  ├─ PostgreSQL (Event Store + Outbox + Lag Metrics)        │
│  ├─ RabbitMQ (Event distribution)                           │
│  ├─ Prometheus (Metrics scraping)                           │
│  └─ Grafana (Dashboards)                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔀 Flujo de Dependencias

### Dirección de Dependencias (Sempre hacia adentro - centro)

```
PRESENTATION ──┐
               │
APPLICATION ──┤─→ DOMAIN
               │
INFRASTRUCTURE─┘
```

**Regla de Oro:** Domain NUNCA depende de nadie.

```
✓ OK:    Application → Domain
✓ OK:    Infrastructure → Domain
✓ OK:    Infrastructure → Application Ports
✓ OK:    Presentation → Application
✗ NEVER: Domain → anything
✗ NEVER: Domain → Infrastructure
```

### Acoplamiento Verificable

| Capa | Dependencias Permitidas | Dependencias Prohibidas |
|------|------------------------|-----------------------|
| Domain | Solo .NET Framework | EF, DB, HTTP, Config |
| Application | Domain + Ports (Interfaces) | Infrastructure |
| Infrastructure | Application Ports + External | Domain business logic |
| Presentation | Application + Exceptions | Infrastructure impls |

---

## 🎯 Patrones Implementados

### 1. Event Sourcing

**Principio:** El estado se reconstruye desde eventos, no se persiste directamente.

```csharp
// Write: Solo eventos se persisten
queue.CheckInPatient(...);  // Genera PatientCheckedIn event
await eventStore.SaveAsync(queue);  // Persiste evento

// Read: Estado se reconstruye
var events = await eventStore.GetEventsAsync(queueId);
var queue = AggregateRoot.LoadFromHistory<WaitingQueue>(queueId, events);
```

**Ventajas:**

- Auditoria completa (todos los cambios son eventos)
- Determinismo (replay → mismo estado)
- Escalabilidad (eventos → cache → queries)

**Invariantes:**

- Eventos son inmutables (record type)
- Versión auto-incrementa
- Idempotency key previene duplicados

### 2. CQRS (Command Query Responsibility Segregation)

**Write Model:**

```
Command → CheckInPatientCommandHandler → Domain → Events → EventStore
                                            ↓
                                        Outbox
```

**Read Model:**

```
Events → ProjectionEventProcessor → ProjectionHandlers → Views
                ↓
       EventLagTracker → Metrics
```

**Separación:** Escribir y leer son completamente independientes.

### 3. Outbox Pattern (Garantía de Entrega)

```
┌──────────────────┐
│  CheckIn Command │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────┐  ATOMIC
│  EventStore                 │  TRANSACTION
│  + OutboxTable              │
│  (save in single TX)         │
└──────────┬───────────────────┘
           │
           │ (success)
           ▼
┌──────────────────────────────────┐
│  OutboxWorker (BackgroundService) │
│  - Poll every 5 seconds           │
│  - Fetch pending messages         │
│  - Publish to RabbitMQ (idempotent)
│  - Mark as dispatched             │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  RabbitMQ                    │
│  (broker keeps until consumed)
└─────────────┬────────────────┘
              │
              ▼
        ┌─────────────┐
        │ Projections │
        └─────────────┘
```

**Garantías:**

- Si TX falla → evento no se persiste
- Si Outbox falla → worker lo reintenta
- Si RabbitMQ falla → backed off retry

### 4. Hexagonal Architecture (Ports & Adapters)

**Puertos (Interfaces):**

```csharp
public interface IEventStore  // Port
{
    Task<WaitingQueue?> LoadAsync(string aggregateId, ...);
    Task SaveAsync(WaitingQueue aggregate, ...);
    Task<IEnumerable<DomainEvent>> GetAllEventsAsync(...);
}

public interface IEventPublisher  // Port
{
    Task PublishAsync(IEnumerable<DomainEvent> events, ...);
}
```

**Adaptadores (Implementaciones):**

```csharp
internal class PostgresEventStore : IEventStore { }
internal class OutboxEventPublisher : IEventPublisher { }
internal class RabbitMqEventPublisher : IEventPublisher { }
```

**Beneficio:** Cambiar de DB o broker sin tocar Domain/Application.

### 5. Repository Pattern (vía Event Sourcing)

```csharp
// CheckInPatientCommandHandler
public async Task<int> HandleAsync(CheckInPatientCommand command, ...)
{
    // Load = Reconstruct from history
    var queue = await _eventStore.LoadAsync(command.QueueId, ...)
        ?? throw new AggregateNotFoundException(...);

    // Execute domain logic
    queue.CheckInPatient(...);  // If invalid → throw DomainException

    // Persist = Save new events (atomically with Outbox)
    await _eventStore.SaveAsync(queue, ...);

    // Publish = Queue for async distribution
    await _eventPublisher.PublishAsync(queue.UncommittedEvents, ...);

    return queue.UncommittedEvents.Count;
}
```

---

## 📊 Capas y Responsabilidades Detalladas

### Domain Layer (WaitingRoom.Domain)

**Responsabilidades:**

- Modelar la realidad del negocio (Wait Room)
- Ejecutar reglas de negocio
- Generar eventos que representan decisiones
- Validar invariantes

**Estructura:**

```
Aggregates/
├─ WaitingQueue (root aggregate)
   └─ Entities/WaitingPatient (only accessible from aggregate)

ValueObjects/
├─ WaitingQueueId
├─ PatientId
├─ Priority
└─ ConsultationType

Events/
├─ WaitingQueueCreated
└─ PatientCheckedIn

Invariants/
└─ WaitingQueueInvariants

Entities/
└─ WaitingPatient

Exceptions/
└─ DomainException
```

**Reglas de Negocio Codificadas:**

- Queue capacity never exceeded
- No duplicate patient check-ins
- Priority must be valid
- Patient name cannot be empty
- Valid consultation types

### Application Layer (WaitingRoom.Application)

**Responsabilidades:**

- Orquestar caso de uso
- Cargar/guardar agregado
- Publicar eventos
- Manejar excepciones de dominio

**Estructura:**

```
Commands/
├─ CheckInPatientCommand

CommandHandlers/
├─ CheckInPatientCommandHandler

DTOs/
├─ CheckInPatientDto
├─ PatientInQueueDto
└─ WaitingQueueDto

Ports/ (interfaces)
├─ IEventStore
└─ IEventPublisher

Services/
└─ SystemClock (IClock impl)

Exceptions/
├─ ApplicationException
├─ AggregateNotFoundException
└─ EventConflictException
```

**Flujo Típico:**

```csharp
1. Recibe Command desde API
2. Carga Agregado: await eventStore.LoadAsync(id)
3. Ejecuta caso de uso: aggregate.DoSomething(...)
   → Si falla → DomainException bubbles
4. Guarda eventos: await eventStore.SaveAsync(aggregate)
   → EventStore + Outbox (transacción atómica)
5. Publica: await eventPublisher.PublishAsync(events)
6. Retorna result
```

### Infrastructure Layer (WaitingRoom.Infrastructure)

**Responsabilidades:**

- Persistir eventos en PostgreSQL
- Gestionar tabla de Outbox
- Publicar a RabbitMQ
- Serializar/deserializar eventos
- Rastrear lag de proyecciones

**Estructura:**

```
Persistence/
├─ EventStore/
│  ├─ PostgresEventStore (IEventStore impl)
│  └─ EventStoreSchema
│
├─ Outbox/
│  ├─ PostgresOutboxStore (IOutboxStore impl)
│  ├─ OutboxMessage
│  └─ IOutboxStore

Messaging/
├─ RabbitMqEventPublisher (IEventPublisher impl)
├─ OutboxEventPublisher (IEventPublisher impl - no-op)
└─ RabbitMqOptions

Serialization/
├─ EventSerializer (IEventSerializer impl)
└─ EventTypeRegistry

Observability/
└─ PostgresEventLagTracker (IEventLagTracker impl)
```

**Decisiones Técnicas:**

- **Dapper** (no EF) → control fino SQL, performance
- **JSONB en PostgreSQL** → flexible schema, queryable
- **Npgsql** → driver nativo, confiable
- **RabbitMQ.Client** → directo, bajo nivel de control

### Presentation Layer (WaitingRoom.API)

**Responsabilidades:**

- Exponar endpoints HTTP
- Mapear DTOs → Commands
- Inyectar CorrelationId
- Manejar excepciones globales
- Proporcionar health checks

**Estructura:**

```
Program.cs
├─ DI Container setup
├─ Middleware pipeline
└─ Endpoint registration

Middleware/
├─ CorrelationIdMiddleware
└─ ExceptionHandlerMiddleware

Endpoints/
└─ WaitingRoomQueryEndpoints

(No "Controllers" - Minimal APIs)
```

---

## 🔄 Flujo Completo de Ejecución

### Caso: Patient Check-In

```
1. CLIENT REQUEST
   POST /api/waiting-room/check-in
   {
     queueId: "QUEUE-01",
     patientId: "PAT-001",
     patientName: "John Doe",
     priority: "High",
     consultationType: "General",
     actor: "nurse-001"
   }

2. PRESENTATION LAYER
   ↓
   CorrelationIdMiddleware
   ├─ Extract CorrelationId from header OR generate new
   ├─ Add to HttpContext.Items
   └─ Add to response headers
   ↓
   Endpoint: POST /api/waiting-room/check-in
   ├─ Map DTO → CheckInPatientCommand
   ├─ Extract correlationId from context
   └─ Call CheckInPatientCommandHandler.HandleAsync(command)

3. APPLICATION LAYER
   ↓
   CheckInPatientCommandHandler.HandleAsync()
   ├─ LoadAsync(queueId)
   │  └─ Aggregate reconstructed from events
   │
   ├─ queue.CheckInPatient() [Domain layer call]
   │  └─ Validates all business rules
   │     └─ If violation → throw DomainException
   │  └─ If valid → raises PatientCheckedIn event
   │     └─ Event added to UncommittedEvents
   │
   ├─ SaveAsync(queue)
   │  ├─ BEGIN TRANSACTION
   │  ├─ INSERT into waiting_room_events (PatientCheckedIn)
   │  ├─ INSERT into waiting_room_outbox (same TX)
   │  ├─ COMMIT TRANSACTION
   │  └─ queue.ClearUncommittedEvents()
   │
   ├─ PublishAsync(events)
   │  └─ OutboxEventPublisher.PublishAsync() [no-op]
   │  └─ Events are already in Outbox
   │
   └─ Return eventCount

4. INFRASTRUCTURE LAYER (Async - Background Worker)
   ↓
   OutboxWorker [BackgroundService]
   ├─ Every 5 seconds
   ├─ Call dispatcher.DispatchBatchAsync()
   │  ├─ GetPendingAsync(batchSize: 100)
   │  │  └─ SELECT * FROM waiting_room_outbox WHERE status = 'Pending'
   │  │
   │  ├─ For each message:
   │  │  ├─ Deserialize to DomainEvent
   │  │  ├─ PublishAsync to RabbitMQ
   │  │  ├─ MarkDispatchedAsync() [UPDATE status = 'Dispatched']
   │  │
   │  └─ If failed → MarkFailedAsync() with retry backoff

5. MESSAGE BROKER (RabbitMQ)
   ↓
   Topic: waiting_room_events.patient_checked_in
   ├─ Message persisted until consumed
   └─ Subscribers: Projections, External systems

6. PROJECTIONS (Async - Event subscribers)
   ↓
   ProjectionEventProcessor
   ├─ Receive PatientCheckedIn from RabbitMQ
   ├─ FindHandler() for PatientCheckedIn
   │  └─ PatientCheckedInProjectionHandler
   │
   ├─ CheckIdempotency() via idempotency key
   │  └─ If already processed → skip
   │
   ├─ HandleAsync()
   │  ├─ UpdateMonitorViewAsync() - increment counter for High priority
   │  ├─ AddPatientToQueueAsync() - add to queue list
   │  └─ MarkProcessedAsync() - mark idempotency key as done
   │
   └─ SaveCheckpointAsync() - track progress (version)

7. RESPONSE TO CLIENT
   ↓
   HTTP 200 OK
   {
     "success": true,
     "message": "Patient checked in successfully",
     "correlationId": "<same as in header>",
     "eventCount": 1
   }
```

---

## ⚡ Características de Desacoplamiento

### 1. Commands vs Events

**Commands (intent):**

- `CheckInPatientCommand` - "Check in a patient"
- NOT persisted
- Can fail (returns exception)
- Synchronous in handler

**Events (fact):**

- `PatientCheckedIn` - "Patient was checked in"
- Persisted immutably
- ALWAYS happened (already persisted)
- Distributed asynchronously

### 2. Write Model vs Read Model

**Write Model (OLTP):**

- `WaitingQueue` aggregate
- Strict consistency
- Validates once per command
- Source of truth

**Read Model (OLAP):**

- `WaitingRoomMonitorView`, `QueueStateView`
- Eventual consistency
- Optimized for queries
- Derived from events

**Nota:** Lectura viene de proyecciones, no de agregado en EventStore.

### 3. Synchronous vs Asynchronous

**Synchronous (Blocking):**

- Command execution (application handler)
- Domain logic validation
- EventStore save

**Asynchronous (Non-Blocking):**

- Outbox dispatch → RabbitMQ
- Projection updates
- Lag tracking

Esto permite que la API responda rápido sin esperar a que todos los proyecciones se actualicen (`eventual consistency`).

---

## 🎬 Estados y Transiciones

### Queue Lifecycle

```
POST /api/reception/register
   -> EnEsperaTaquilla
POST /api/cashier/call-next
   -> EnTaquilla
POST /api/cashier/validate-payment
   -> PagoValidado -> EnEsperaConsulta
POST /api/medical/consulting-room/activate
   -> ConsultingRoomActivated
POST /api/medical/call-next (stationId activo)
   -> LlamadoConsulta
POST /api/medical/start-consultation
   -> EnConsulta
POST /api/medical/finish-consultation
   -> Finalizado

Alternos:
- cashier/mark-payment-pending -> PagoPendiente
- cashier/mark-absent -> AusenteTaquilla -> EnEsperaTaquilla
- cashier/cancel-payment -> CanceladoPorPago
- medical/mark-absent -> AusenteConsulta (1 reintento) o CanceladoPorAusencia
```

---

## 🔐 Invariantes y Validaciones

### Niveles de Validación

```
API Layer:
└─ DTO validation (range, format)

Application Layer:
├─ Command validation (not null)
└─ Aggregate existence check

Domain Layer: ⭐⭐⭐
├─ WaitingQueueInvariants
│  ├─ ValidateCapacity(currentCount, maxCapacity)
│  ├─ ValidateDuplicateCheckIn(patientId, queuedPatientIds)
│  ├─ ValidatePriority(priority)
│  └─ ValidateQueueName(queueName)
│
└─ ValueObject creation
   ├─ PatientId.Create() checks not empty
   ├─ Priority.Create() validates against whitelist
   └─ ConsultationType.Create() validates length
```

**Invariante crítica:** Si Domain.CheckInPatient() no lanza excepción, entonces el evento es válido.

---

## 🛠️ Extensibilidad

### Agregar Nuevo Evento

1. **Domain:** Create new event class in `Domain/Events/`
2. **ValueObjects:** Add supporting value objects if needed
3. **Aggregate:** Add `When(NewEvent)` handler method
4. **Registry:** Add to `EventTypeRegistry.CreateDefault()`
5. **Serializer:** Automatic (reflection-based)
6. **Projection:** Create new handler in `Projections/Handlers/`
7. **Tests:** Add tests for new business rule

### Agregar Nueva Proyección

1. **Define View:** Create new DTO in `Projections/Views/`
2. **Implement Handler:** Create `IProjectionHandler` in `Projections/Handlers/`
3. **Register:** Add to `WaitingRoomProjectionEngine._handlers`
4. **Query Endpoint:** Add to `WaitingRoomQueryEndpoints`
5. **Context Method:** Add to `IWaitingRoomProjectionContext`
6. **Tests:** Add projection tests

---

## 📈 Performance Considerations

### Event Store Lookup

```csharp
// O(N) - Loads ALL events for an aggregate
var events = await eventStore.GetEventsAsync(aggregateId);
var queue = AggregateRoot.LoadFromHistory<WaitingQueue>(id, events);
```

**Optimización para agregados grandes:**

- Implementar Snapshot pattern
- Persistir snapshot cada 100 eventos
- Cargar último snapshot + delta

### Projection Updates

```csharp
// O(1) per event - Direct in-memory updates
await context.UpdateMonitorViewAsync(queueId, priority, "increment");
```

**Escalamiento:**

- Proyecciones actuales: In-Memory (tests)
- Futuro: PostgreSQL con índices
- Muy future: Redis cache

---

## 🔍 Debugging y Observabilidad

### Correlation ID

Cada request tiene un ID único rastreado a través de todos los logs:

```
Request: X-Correlation-Id: f47ac10b-58cc-4372-a567-0e02b2c3d479

Logs:
  CorrelationId: f47ac10b-58cc-4372-a567-0e02b2c3d479 - CheckIn request
  CorrelationId: f47ac10b-58cc-4372-a567-0e02b2c3d479 - EventStore save
  CorrelationId: f47ac10b-58cc-4372-a567-0e02b2c3d479 - Outbox dispatch
  CorrelationId: f47ac10b-58cc-4372-a567-0e02b2c3d479 - Projection update
```

### Event Lag Tracking

```
EventLagMetrics:
├─ EventCreatedAt: 2026-02-19T10:00:00Z
├─ EventPublishedAt: 2026-02-19T10:00:05Z (5s - Outbox dispatch)
├─ EventProcessedAt: 2026-02-19T10:00:07Z (2s - Projection)
└─ TotalLagMs: 7000 (Event creation to projection update)
```

Monitor en Grafana para detectar bottlenecks.

---

## ✅ Resumen de Decisiones Arquitectónicas

| Decisión | Justificación | Alternativas |
|----------|--------------|--------------|
| **Event Sourcing** | Auditoría completa, replay, determinismo | CRUD + Snapshots |
| **CQRS** | Modelo de lectura optimizado, escala | Unified model |
| **Outbox Pattern** | Garantía de entrega sin duplicados | Direct publish (risky) |
| **Hexagonal** | Máxima independencia de infraestructura | Monolítico acoplado |
| **Dapper** (no EF) | Control fino, performance, simplicity | EF (overkill for events) |
| **PostgreSQL JSONB** | Flexible schema, queryable, ACID | Document DB (eventual)  |
| **In-Memory Projections** | Tests rápidos, simplicity | PostgreSQL projections |

---

**Última actualización:** Febrero 2026

- `cashier/mark-absent`PRINCIPIOS DE INGENIERÍA (OBLIGATORIOS)

* Clean Code
* SOLID
* DRY
* KISS
* YAGNI
* Explicit over implicit
* Fail fast
* Deterministic systems
* Observable by design
* Domain integrity first
* Architecture > Convenience
* Correctness > Speed
- `cashier/cancel-payment`
- `medical/mark-absent`

Compatibilidad: los endpoints legacy `/api/waiting-room/*` siguen publicados para integración gradual.

---

## 🎯 Caso de Uso: Check-In de Paciente

El caso de uso principal es que un paciente se registre en una cola de espera.

### Participantes

- **Actor:** Personal sanitario (nurse) o sistema
- **Agregado:** WaitingQueue
- **Comando:** CheckInPatientCommand
- **Manejador:** CheckInPatientCommandHandler
- **Persistencia:** IEventStore (PostgreSQL)
- **Publicación:** IEventPublisher (Outbox)

---

## 📋 Flujo Detallado

### PASO 1: HTTP Request llega a API

```
POST /api/waiting-room/check-in
Content-Type: application/json

{
  "queueId": "QUEUE-01",
  "patientId": "PAT-001",
  "patientName": "Juan Pérez",
  "priority": "High",
  "consultationType": "General",
  "actor": "nurse-001",
  "notes": "Asma aguda"
}
```

### PASO 2: Middleware - CorrelationIdMiddleware

```csharp
// CorrelationIdMiddleware.cs
context.Items["CorrelationId"] =
    context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
    ?? Guid.NewGuid().ToString();

// corr-id = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
// Available for all downstream handlers
```

**Propósito:** Inyectar ID de rastreo para logs distribuidos.

### PASO 3: Endpoint Handler

```csharp
// Program.cs
app.MapPost("/api/waiting-room/check-in", async (
    CheckInPatientDto dto,                      // ← Binding automático del JSON
    HttpContext httpContext,                    // ← Inyectado por ASP.NET
    CheckInPatientCommandHandler handler,       // ← Inyectado del DI
    ILogger<Program> logger,                    // ← Inyectado del DI
    CancellationToken cancellationToken) =>
{
    var correlationId = httpContext.Items["CorrelationId"]?.ToString()
        ?? Guid.NewGuid().ToString();

    logger.LogInformation(
        "CheckIn request received. CorrelationId: {CorrelationId}, " +
        "QueueId: {QueueId}, PatientId: {PatientId}",
        correlationId, dto.QueueId, dto.PatientId);

    // Mapear DTO → Command
    var command = new CheckInPatientCommand
    {
        QueueId = dto.QueueId,
        PatientId = dto.PatientId,
        PatientName = dto.PatientName,
        Priority = dto.Priority,
        ConsultationType = dto.ConsultationType,
        Notes = dto.Notes,
        Actor = dto.Actor,
        CorrelationId = correlationId  // ← Propagar para tracing
    };

    // Delegar al handler
    var eventCount = await handler.HandleAsync(command, cancellationToken);

    logger.LogInformation(
        "CheckIn completed. CorrelationId: {CorrelationId}, " +
        "EventCount: {EventCount}",
        correlationId, eventCount);

    return Results.Ok(new
    {
        Success = true,
        Message = "Patient checked in successfully",
        CorrelationId = correlationId,
        EventCount = eventCount
    });
})
.WithName("CheckInPatient")
.Produces(200)
.Produces(400)
.Produces(404)
.Produces(409)
.Produces(500);
```

**Lo que sucede:**

1. ASP.NET bindea JSON a DTO automáticamente
2. Inyecta dependencias del Container
3. Mapea DTO a Command
4. Llama al handler
5. Retorna respuesta HTTP

### PASO 4: CheckInPatientCommandHandler

```csharp
public sealed class CheckInPatientCommandHandler
{
    private readonly IEventStore _eventStore;
    private readonly IEventPublisher _eventPublisher;
    private readonly IClock _clock;

    public async Task<int> HandleAsync(
        CheckInPatientCommand command,
        CancellationToken cancellationToken = default)
    {
        // ═══════════════════════════════════════════════════════════════
        // PASO 4A: CARGA EL AGREGADO (Reconstrye desde eventos)
        // ═══════════════════════════════════════════════════════════════

        var queue = await _eventStore.LoadAsync(command.QueueId, cancellationToken)
            ?? throw new AggregateNotFoundException(command.QueueId);

        // En EventStore.LoadAsync():
        //   1. SELECT * FROM waiting_room_events WHERE aggregate_id = 'QUEUE-01'
        //   2. Foreach evento: call queue.ApplyEvent(evento)
        //   3. Retorna queue con estado reconstruido
        //
        // Resultado:
        //   queue.Id = "QUEUE-01"
        //   queue.Version = 2 (si hay 2 eventos)
        //   queue.Patients = [PAT-001]


        // ═══════════════════════════════════════════════════════════════
        // PASO 4B: CREA METADATOS PARA AUDITORIA
        // ═══════════════════════════════════════════════════════════════

        var metadata = EventMetadata.CreateNew(
            aggregateId: command.QueueId,
            actor: command.Actor,                          // "nurse-001"
            correlationId: command.CorrelationId           // Propagar para tracing
                ?? Guid.NewGuid().ToString());

        // Resultado:
        // {
        //   EventId: "e47ac10b-58cc-4372-a567-0e02b2c3d479",
        //   AggregateId: "QUEUE-01",
        //   Version: (será set por EventStore),
        //   CorrelationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        //   CausationId: (mismo que EventId),
        //   Actor: "nurse-001",
        //   OccurredAt: DateTime.UtcNow,
        //   IdempotencyKey: Guid.NewGuid()
        // }


        // ═══════════════════════════════════════════════════════════════
        // PASO 4C: CREA VALUE OBJECTS (Validación)
        // ═══════════════════════════════════════════════════════════════

        var patientId = PatientId.Create(command.PatientId);
        // Si command.PatientId es vacío → throws DomainException

        var priority = Priority.Create(command.Priority);
        // Si "High" → normaliza a "High" (canonical)
        // Si "URGENTE" → throws DomainException

        var consultationType = ConsultationType.Create(command.ConsultationType);
        // Si length < 2 o > 100 → throws DomainException


        // ═══════════════════════════════════════════════════════════════
        // PASO 4D: EJECUTA LOGICA DE DOMINIO (Agregado)
        // ═══════════════════════════════════════════════════════════════

        queue.CheckInPatient(
            patientId: patientId,
            patientName: command.PatientName,
            priority: priority,
            consultationType: consultationType,
            checkInTime: _clock.UtcNow,
            metadata: metadata,
            notes: command.Notes);

        // En WaitingQueue.CheckInPatient():
        //   1. Validate invariants:
        //      - Capacity check: currentCount < maxCapacity
        //      - Duplicate check: patientId not in queue
        //      - Priority validation
        //   2. If any fail → throw DomainException
        //   3. If all pass:
        //      - Create PatientCheckedIn event
        //      - Call RaiseEvent(event)
        //        → ApplyEvent(event) [updates state]
        //        → _uncommittedEvents.Add(event)
        //      - queue.Patients now includes PAT-001
        //      - queue.Version = 3

        // Si violación de regla → exception propaga al endpoint
        // Endpoint → ExceptionHandlerMiddleware:
        //   - DomainException → 400 Bad Request
        //   - Mensaje: "Queue is at maximum capacity (20). Cannot add more patients."


        // ═══════════════════════════════════════════════════════════════
        // PASO 4E: PERSISTENCIA ATOMICA (EventStore + Outbox)
        // ═══════════════════════════════════════════════════════════════

        var eventsToPublish = queue.UncommittedEvents.ToList();

        await _eventStore.SaveAsync(queue, cancellationToken);

        // En PostgresEventStore.SaveAsync(queue):
        //   1. BEGIN TRANSACTION
        //   2. Get current version from DB:
        //      SELECT COALESCE(MAX(version), 0) FROM waiting_room_events
        //      WHERE aggregate_id = 'QUEUE-01'
        //      → currentVersion = 2
        //   3. Check version conflict:
        //      expectedVersion = queue.Version - uncommitted.Count
        //                      = 3 - 1 = 2
        //      If currentVersion != expectedVersion → throw EventConflictException
        //      (Concurrent modification detected)
        //   4. Insert events:
        //      INSERT INTO waiting_room_events (
        //        event_id, aggregate_id, version, event_name,
        //        occurred_at, correlation_id, causation_id, actor,
        //        idempotency_key, schema_version, payload
        //      ) VALUES (
        //        'e47ac10b-...', 'QUEUE-01', 3, 'PatientCheckedIn',
        //        '2026-02-19T10:05:00Z', 'f47ac10b-...', 'e47ac10b-...',
        //        'nurse-001', 'idempotency-...', 1,
        //        '{"queueId":"QUEUE-01","patientId":"PAT-001",...}'
        //      )
        //      ON CONFLICT (idempotency_key) DO NOTHING
        //      (Idempotencia: si se reintenta, no duplica)
        //   5. Insert outbox messages (SAME TX):
        //      INSERT INTO waiting_room_outbox (
        //        outbox_id, event_id, event_name, occurred_at,
        //        correlation_id, causation_id, payload,
        //        status, attempts, next_attempt_at, last_error
        //      ) VALUES (
        //        ..., 'e47ac10b-...', 'PatientCheckedIn', ...,
        //        'Pending', 0, NULL, NULL
        //      )
        //      ON CONFLICT (event_id) DO NOTHING
        //   6. COMMIT TRANSACTION (all or nothing)
        //   7. queue.ClearUncommittedEvents()


        // ═══════════════════════════════════════════════════════════════
        // PASO 4F: PUBLICACION (Outbox - No-op en API)
        // ═══════════════════════════════════════════════════════════════

        if (eventsToPublish.Count > 0)
        {
            await _eventPublisher.PublishAsync(eventsToPublish, cancellationToken);
        }

        // En API: OutboxEventPublisher.PublishAsync() → no-op (returns immediately)
        // En Worker: RabbitMqEventPublisher.PublishAsync() → actual publish
        //
        // Razón: Separación clara de responsabilidades
        // - API se enfoca en escribir rápido
        // - Worker se enfoca en distribución confiable


        return eventsToPublish.Count;
    }
}
```

### PASO 5: Return HTTP Response

```json
200 OK
{
  "success": true,
  "message": "Patient checked in successfully",
  "correlationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "eventCount": 1
}
```

**Tiempo de respuesta:** ~50-100 ms (más rápido porque Outbox dispatch es async)

---

## 🔄 Flujo Asincrónico (OutboxWorker)

**Mientras el cliente está fuera (segundos después del check-in):**

### PASO 6: OutboxWorker.ExecuteAsync() (BackgroundService)

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    while (!stoppingToken.IsCancellationRequested)
    {
        try
        {
            // Cada 5 segundos (~configurable)
            var dispatchedCount = await _dispatcher.DispatchBatchAsync(stoppingToken);

            if (dispatchedCount == 0)
            {
                _logger.LogDebug("No messages dispatched");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in dispatcher loop. Continuing...");
        }

        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
    }
}
```

### PASO 7: OutboxDispatcher.DispatchBatchAsync()

```csharp
public async Task<int> DispatchBatchAsync(CancellationToken cancellationToken = default)
{
    // STEP A: Fetch pending messages
    var messages = await _outboxStore.GetPendingAsync(
        batchSize: 100,
        cancellationToken);

    // En PostgresOutboxStore.GetPendingAsync():
    //   SELECT * FROM waiting_room_outbox
    //   WHERE status = 'Pending'
    //     AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
    //   ORDER BY occurred_at
    //   LIMIT 100;
    //
    // Resultado: [OutboxMessage { eventId: ..., payload: ... }]

    var successCount = 0;

    foreach (var message in messages)
    {
        try
        {
            // STEP B: Dispatch single message
            await DispatchSingleMessageAsync(message, cancellationToken);
            successCount++;
        }
        catch (Exception ex)
        {
            // STEP C: Handle failure with retry
            await HandleFailureAsync(message, ex, cancellationToken);
        }
    }

    _logger.LogInformation(
        "Dispatched {SuccessCount}/{TotalCount} messages",
        successCount, messages.Count);

    return successCount;
}
```

### PASO 8: DispatchSingleMessageAsync()

```csharp
private async Task DispatchSingleMessageAsync(
    OutboxMessage message,
    CancellationToken cancellationToken)
{
    var dispatchStart = DateTime.UtcNow;

    // STEP A: Deserialize event
    var domainEvent = _serializer.Deserialize(
        message.EventName,           // "PatientCheckedIn"
        message.Payload);            // JSON

    // En EventSerializer.Deserialize():
    //   1. Get type from registry: "PatientCheckedIn" → typeof(PatientCheckedIn)
    //   2. JsonConvert.DeserializeObject(json, typeof(PatientCheckedIn))
    //   3. Retorna DomainEvent (strongly typed)

    // STEP B: Publish to RabbitMQ
    await _publisher.PublishAsync(domainEvent, cancellationToken);

    // En RabbitMqEventPublisher.PublishAsync():
    //   1. Create connection to RabbitMQ (localhost:5672)
    //   2. Create channel
    //   3. Declare exchange: "waiting_room_events" (topic)
    //   4. Publish message:
    //      - RoutingKey: "PatientCheckedIn"
    //      - Body: JSON serialized
    //      - Properties:
    //          CorrelationId: metadata.CorrelationId (for tracing)
    //          MessageId: metadata.IdempotencyKey (for deduplication)
    //   5. Close connection

    // STEP C: Mark as dispatched
    await _outboxStore.MarkDispatchedAsync(
        new[] { message.EventId },
        cancellationToken);

    // En PostgresOutboxStore.MarkDispatchedAsync():
    //   UPDATE waiting_room_outbox
    //   SET status = 'Dispatched',
    //       attempts = attempts + 1,
    //       next_attempt_at = NULL,
    //       last_error = NULL
    //   WHERE event_id = 'e47ac10b-...';

    _logger.LogInformation(
        "Successfully dispatched event {EventId} - {EventName}",
        message.EventId, message.EventName);
}
```

---

## 🎯 Flujo de Proyecciones

**Cuando RabbitMQ distribuye el evento:**

### PASO 9: ProjectionEventProcessor

```csharp
public async Task ProcessEventAsync(
    DomainEvent @event,
    CancellationToken cancellation = default)
{
    var startTime = DateTime.UtcNow;

    // STEP A: Log event reception
    _logger.LogDebug(
        "Processing event {EventType} (aggregate: {AggregateId})",
        @event.GetType().Name,
        @event.Metadata.AggregateId);

    try
    {
        // STEP B: Delegate to projection engine
        await _projection.ProcessEventAsync(@event, cancellation);

        // En WaitingRoomProjectionEngine.ProcessEventAsync():
        //   1. Find handler for PatientCheckedIn
        //   2. Call handler.HandleAsync(event)
        //   3. Update checkpoint

        // STEP C: Record success metrics
        var processingDurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

        await _lagTracker.RecordEventProcessedAsync(
            eventId: @event.Metadata.EventId,
            processedAt: DateTime.UtcNow,
            processingDurationMs: processingDurationMs,
            cancellation: cancellation);

        _logger.LogInformation(
            "Successfully processed event {EventType} (duration: {Duration}ms)",
            @event.GetType().Name,
            processingDurationMs);
    }
    catch (Exception ex)
    {
        // STEP D: Handle failure
        await _lagTracker.RecordEventFailedAsync(...);
        throw;
    }
}
```

### PASO 10: WaitingRoomProjectionEngine.ProcessEventAsync()

```csharp
public async Task ProcessEventAsync(
    DomainEvent @event,
    CancellationToken cancellationToken = default)
{
    await ProcessEventInternalAsync(@event, cancellationToken);

    // Update checkpoint for progress tracking
    var checkpoint = new ProjectionCheckpoint
    {
        ProjectionId = ProjectionId,
        LastEventVersion = @event.Metadata.Version,
        CheckpointedAt = DateTimeOffset.UtcNow,
        IdempotencyKey = Guid.NewGuid().ToString(),
        Status = "processing"
    };

    await _context.SaveCheckpointAsync(checkpoint, cancellationToken);
}

private async Task ProcessEventInternalAsync(
    DomainEvent @event,
    CancellationToken cancellationToken)
{
    var handlerName = @event.EventName;  // "PatientCheckedIn"

    if (!_handlers.TryGetValue(handlerName, out var handler))
    {
        _logger.LogWarning(
            "No handler found for event {EventName}",
            handlerName);
        return;
    }

    // Elegi un handler
    await handler.HandleAsync(@event, _context, cancellationToken);
}
```

### PASO 11: PatientCheckedInProjectionHandler.HandleAsync()

```csharp
public async Task HandleAsync(
    DomainEvent @event,
    IProjectionContext context,
    CancellationToken cancellationToken = default)
{
    if (@event is not PatientCheckedIn evt)
        throw new ArgumentException("Expected PatientCheckedIn");

    var waitingContext = (IWaitingRoomProjectionContext)context;

    // STEP A: Generate idempotency key
    var idempotencyKey = GenerateIdempotencyKey(evt);
    // "patient-checked-in:QUEUE-01:<aggregateId>:<eventId>"

    // STEP B: Check idempotency
    if (await context.AlreadyProcessedAsync(idempotencyKey, cancellationToken))
        return;  // Skip if already handled

    // STEP C: Update MonitorView
    await waitingContext.UpdateMonitorViewAsync(
        queueId: evt.QueueId,
        priority: NormalizePriority(evt.Priority),  // "high" → "High"
        operation: "increment",                      // Count++
        cancellationToken);

    // En InMemoryWaitingRoomProjectionContext.UpdateMonitorViewAsync():
    //   Get or create view
    //   _views[queueId + ":monitor"]
    //   Increment counter for "High" priority
    //   _monitorViews[evt.QueueId].HighPriorityCount++

    // STEP D: Update QueueStateView
    await waitingContext.AddPatientToQueueAsync(
        queueId: evt.QueueId,
        patient: new PatientInQueueDto
        {
            PatientId = evt.PatientId,
            PatientName = evt.PatientName,
            Priority = NormalizePriority(evt.Priority),
            CheckInTime = evt.Metadata.OccurredAt,
            WaitTimeMinutes = 0
        },
        cancellationToken);

    // En InMemoryWaitingRoomProjectionContext.AddPatientToQueueAsync():
    //   Get or create QueueStateView
    //   Add PatientInQueueDto to Patients[]
    //   _queueStates[evt.QueueId].Patients.Add(...)

    // STEP E: Mark as processed
    await context.MarkProcessedAsync(idempotencyKey, cancellationToken);

    // En context.MarkProcessedAsync():
    //   Add idempotencyKey to _processedKeys set
    //   (prevents reprocessing if event is retried)
}
```

---

## 📊 Modelo de Excepción

### Mapa de Excepciones → HTTP Status

```
Domain Layer (business rule violation)
  ↓
└─ DomainException
   └─ Propagate → Application
      └─ CheckInPatientCommandHandler catches implicitly
         └─ Bubbles to Presentation

Presentation Layer (ExceptionHandlerMiddleware)
  ↓
  If DomainException
    └─ HTTP 400 Bad Request
       {
         "error": "DomainViolation",
         "message": "Queue is at maximum capacity..."
       }

Application Layer (custom)
  ↓
  If AggregateNotFoundException
    └─ HTTP 404 Not Found
       {
         "error": "AggregateNotFound",
         "message": "Aggregate with ID 'QUEUE-01' not found..."
       }

  If EventConflictException
    └─ HTTP 409 Conflict
       {
         "error": "ConcurrencyConflict",
         "message": "The resource was modified by another request..."
       }

Infrastructure (unexpected)
  ↓
  If any other exception
    └─ HTTP 500 Internal Server Error
       {
         "error": "InternalServerError",
         "message": "An unexpected error occurred..."
       }
```

### Flujo Completo de Error

**Caso: Cola llena**

```
1. API receives request
2. Handler loads queue (2 events replayed, 20 patients)
3. queue.CheckInPatient() called
4. WaitingQueueInvariants.ValidateCapacity()
   └─ throw new DomainException("Queue is at maximum...")
5. Exception bubbles up (not caught)
6. ExceptionHandlerMiddleware catches
7. Maps to HTTP 400
8. Returns error response
9. Client receives 400 with message
```

---

## 🔐 Idempotencia

### Garantía de Idempotencia

**Nivel 1: EventStore**

```csharp
INSERT INTO waiting_room_events (...)
ON CONFLICT (idempotency_key) DO NOTHING;
```

Si mismo comando se ejecuta 2x con mismo idempotency_key → no duplica evento.

**Nivel 2: Outbox**

```csharp
INSERT INTO waiting_room_outbox (...)
ON CONFLICT (event_id) DO NOTHING;
```

Si mensaje se procesa 2x → no duplica en outbox.

**Nivel 3: Projections**

```csharp
if (await context.AlreadyProcessedAsync(idempotencyKey, cancellation))
    return;  // Skip
```

Si evento llega 2x a proyección → handler es idempotente (memoization).

---

## 📈 Performance Characteristics

| Operación | Tiempo Típico | Bottleneck |
|-----------|---------------|-----------|
| EndPoint (sync) | 50-100 ms | EventStore load/save |
| Outbox dispatch | 100-500 ms | RabbitMQ network |
| Projection update | 10-50 ms | In-memory operation |
| Total (latency) | 50-100 ms (API response only) | - |
| Total (end-to-end) | 100-200 ms (projection updated) | Async processing |

**Optimización:** API responde rápido porque projection update es asincrónico.

---

**Última actualización:** Febrero 2026
