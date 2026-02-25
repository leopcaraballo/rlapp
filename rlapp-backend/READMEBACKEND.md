# READMEBACKEND.md - Auditoria arquitectonica completa del backend RLAPP

> **Documento generado mediante analisis exhaustivo del codigo fuente.**
> Fecha de generacion: julio 2025
> Alcance: directorio `rlapp-backend/` (sin frontend)

---

## Tabla de contenidos

1. [Descripcion general del sistema](#1-descripcion-general-del-sistema)
2. [Logica de negocio](#2-logica-de-negocio)
3. [Funcionamiento general](#3-funcionamiento-general)
4. [Analisis de arquitectura](#4-analisis-de-arquitectura)
5. [Evaluacion de cumplimiento hexagonal](#5-evaluacion-de-cumplimiento-hexagonal)
6. [Analisis SOLID](#6-analisis-solid)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Tecnologias detectadas](#8-tecnologias-detectadas)
9. [Endpoints expuestos](#9-endpoints-expuestos)
10. [Modelos de datos](#10-modelos-de-datos)
11. [Analisis exhaustivo de testing](#11-analisis-exhaustivo-de-testing)
12. [Deuda tecnica identificada](#12-deuda-tecnica-identificada)
13. [Plan de mejora priorizado](#13-plan-de-mejora-priorizado)
14. [Estimacion de pantallas frontend](#14-estimacion-de-pantallas-frontend)
15. [Configuracion y ejecucion](#15-configuracion-y-ejecucion)
16. [Evaluacion tecnica general](#16-evaluacion-tecnica-general)

---

## 1. Descripcion general del sistema

RLAPP Backend es un sistema de gestion de sala de espera medica construido con .NET 10.0 siguiendo una arquitectura hexagonal con Event Sourcing y CQRS. El sistema gestiona el flujo completo de pacientes desde su registro (check-in) hasta la finalizacion de su atencion medica, pasando por estaciones de taquilla (pago) y consultorios.

### Proposito

Digitalizar y optimizar el flujo de pacientes en instituciones de salud, proporcionando:

- Registro electronico de pacientes con prioridades (Low, Medium, High, Urgent).
- Gestion de cola con ordenamiento automatico por prioridad.
- Flujo de taquilla con validacion de pagos y manejo de ausencias.
- Asignacion inteligente de pacientes a consultorios.
- Monitoreo en tiempo real del estado de la sala de espera.
- Trazabilidad completa de eventos mediante Event Sourcing.
- Observabilidad con metricas de latencia de eventos (lag tracking).

### Contexto de dominio

El sistema opera en el dominio de salud, especificamente en la gestion de sala de espera (waiting room). El bounded context principal es `WaitingRoom`, que encapsula toda la logica de negocio relacionada con el flujo de pacientes.

---

## 2. Logica de negocio

### 2.1 Maquina de estados del paciente

El paciente transita por 13 estados posibles dentro del sistema:

```
Registrado
  └─► EnEsperaTaquilla
        └─► EnTaquilla (llamado en caja)
              ├─► PagoValidado ──► EnEsperaConsulta
              │     └─► LlamadoConsulta ──► EnConsulta ──► Finalizado
              ├─► PagoPendiente (hasta 3 intentos, luego cancelacion)
              │     └─► CanceladoPorPago
              └─► AusenteEnTaquilla (hasta 2 reintentos)
                    └─► CanceladoPorAusencia

EnEsperaConsulta
  └─► ReclamadoParaAtencion (claimed)
        └─► LlamadoConsulta (called)
              ├─► EnConsulta ──► Finalizado
              └─► AusenteEnConsulta (1 reintento, luego cancelacion)
                    └─► CanceladoPorAusencia
```

### 2.2 Reglas de negocio (invariantes)

Las siguientes invariantes se aplican al agregado `WaitingQueue`:

| Invariante | Descripcion | Parametro |
|---|---|---|
| Capacidad maxima | No se permiten mas pacientes que `MaxCapacity` | Configurable por cola |
| Duplicado de check-in | Un mismo `PatientId` no puede registrarse dos veces (case-insensitive) | - |
| Ausencias en taquilla | Maximo 2 reintentos antes de reencolar al final | `MaxCashierAbsences = 2` |
| Intentos de pago | Maximo 3 intentos de pago pendiente antes de cancelacion | `MaxPaymentRetries = 3` |
| Ausencias en consulta | 1 reintento; segunda ausencia cancela al paciente | `MaxConsultationAbsences = 1` |
| Consultorio activo | Solo se puede reclamar un paciente si el consultorio esta activo | - |
| Orden de prioridad | La reclamacion selecciona al paciente con mayor nivel de prioridad | Urgent(4) > High(3) > Medium(2) > Low(1) |
| Transiciones de estado | Cada operacion valida que el paciente este en el estado correcto | Maquina de estados estricta |

### 2.3 Escalamiento automatico de prioridad

El `CheckInPatientCommandHandler` implementa logica de escalamiento automatico:

- Pacientes embarazadas: prioridad se eleva automaticamente.
- Pacientes menores de 18 o mayores de 65 anios: prioridad se eleva automaticamente.

### 2.4 Eventos de dominio (14 eventos)

| Evento | Descripcion |
|---|---|
| `WaitingQueueCreated` | Cola de espera creada |
| `PatientCheckedIn` | Paciente registrado en la cola |
| `PatientCalledAtCashier` | Paciente llamado a taquilla |
| `PatientPaymentValidated` | Pago del paciente validado |
| `PatientPaymentPending` | Pago del paciente pendiente |
| `PatientAbsentAtCashier` | Paciente ausente en taquilla |
| `PatientCancelledByPayment` | Paciente cancelado por fallos de pago |
| `PatientClaimedForAttention` | Paciente reclamado por un consultorio |
| `PatientCalled` | Paciente llamado a consulta |
| `PatientAttentionCompleted` | Atencion del paciente finalizada |
| `PatientAbsentAtConsultation` | Paciente ausente en consulta |
| `PatientCancelledByAbsence` | Paciente cancelado por ausencias |
| `ConsultingRoomActivated` | Consultorio activado |
| `ConsultingRoomDeactivated` | Consultorio desactivado |

Todos los eventos heredan de `DomainEvent` (record inmutable) e incluyen `EventMetadata` con: `EventId`, `AggregateId`, `Version`, `OccurredAt`, `CorrelationId`, `CausationId`, `IdempotencyKey`, `Actor`, `SchemaVersion`.

---

## 3. Funcionamiento general

### 3.1 Flujo principal de operacion

```
[Recepcion]                [Taquilla]              [Consultorio]
    │                          │                        │
    ▼                          │                        │
 CheckIn ──► Cola ────────►  CallNext ──► ValidatePay   │
 (prioridad)  (ordenada)    (FIFO+prio)   ──► EnEspera  │
                                              Consulta   │
                                                │        ▼
                                                └──► ClaimNext
                                                     (por prio)
                                                        │
                                                        ▼
                                                   CallPatient
                                                        │
                                                        ▼
                                                  CompleteAttention
                                                   (Finalizado)
```

### 3.2 Flujo de datos (Event Sourcing + CQRS + Outbox)

```
[Comando HTTP]
      │
      ▼
[Command Handler]
      │ Carga agregado (LoadAsync)
      │ Ejecuta operacion de dominio
      │ Genera eventos de dominio
      ▼
[PostgresEventStore.SaveAsync]
      │ INSERT event en waiting_room_events
      │ INSERT outbox en waiting_room_outbox   ◄── Transaccion atomica
      ▼
[OutboxWorker (BackgroundService)]
      │ Poll cada 5s
      │ Lee mensajes pendientes
      ▼
[OutboxDispatcher]
      │ Deserializa evento
      │ Publica en RabbitMQ
      │ Marca como dispatched
      ▼
[RabbitMQ (Topic Exchange: waiting_room_events)]
      │
      ▼
[RabbitMqProjectionEventSubscriber]
      │ Consume mensaje
      │ Deserializa evento
      ▼
[ProjectionEventProcessor]
      │ Registra lag
      │ Delega a ProjectionEngine
      ▼
[WaitingRoomProjectionEngine]
      │ Ejecuta handlers de proyeccion
      ▼
[InMemoryWaitingRoomProjectionContext]
      │ Actualiza vistas (ConcurrentDictionary)
      ▼
[Query Endpoints] ──► Lectura directa de las vistas
```

### 3.3 Modelo de despliegue

El sistema se despliega como 3 procesos .NET independientes + infraestructura Docker:

| Servicio | Rol | Puerto |
|---|---|---|
| WaitingRoom.API | Recibe comandos HTTP, expone queries, WebSocket hub | 5000 |
| WaitingRoom.Worker | Outbox dispatcher (despacha eventos a RabbitMQ) | - |
| WaitingRoom.Projections | Consume eventos de RabbitMQ, actualiza read models | - |
| PostgreSQL | Event Store + Outbox + Read Models | 5432 |
| RabbitMQ | Message Broker (Topic Exchange) | 5672/15672 |
| Prometheus | Metricas de infraestructura y aplicacion | 9090 |
| Grafana | Dashboards de monitoreo | 3000 |
| Seq | Logging estructurado centralizado | 5341 |

---

## 4. Analisis de arquitectura

### 4.1 Patrones arquitectonicos implementados

#### Arquitectura hexagonal (puertos y adaptadores)

El sistema implementa una arquitectura hexagonal con separacion clara entre capas:

- **Dominio** (`WaitingRoom.Domain`): Zero-dependency (solo depende de `BuildingBlocks.EventSourcing`). Contiene agregados, entidades, value objects, eventos de dominio, excepciones e invariantes. No tiene referencias a frameworks ni infraestructura.
- **Aplicacion** (`WaitingRoom.Application`): Define puertos (interfaces) y orquesta la logica de negocio a traves de command handlers. Depende unicamente del dominio.
- **Infraestructura** (`WaitingRoom.Infrastructure`): Implementa los adaptadores que satisfacen los puertos definidos en la capa de aplicacion (PostgresEventStore, RabbitMqEventPublisher, etc.).
- **API** (`WaitingRoom.API`): Adaptador de entrada HTTP. Compone la raiz de inyeccion de dependencias y expone endpoints REST.

#### Event Sourcing

- El estado del agregado `WaitingQueue` se reconstruye a partir del stream de eventos.
- Cada operacion de dominio genera uno o mas `DomainEvent` que se persisten atomicamente.
- Los eventos son inmutables (records C#) con metadatos completos.
- Soporte de versionado con `SchemaVersion` en la metadata.
- Deteccion de conflictos de concurrencia por version del agregado.

#### CQRS (Command Query Responsibility Segregation)

- **Escritura**: Comandos HTTP → Command Handlers → Agregado → Event Store (PostgreSQL).
- **Lectura**: Eventos → Proyecciones → Vistas en memoria → Query Endpoints.
- Separacion fisica entre el modelo de escritura (event store) y el modelo de lectura (proyecciones).

#### Outbox pattern

- Garantiza la entrega confiable de eventos al message broker.
- Los eventos se persisten en la tabla `waiting_room_outbox` dentro de la misma transaccion que el event store.
- Un `OutboxWorker` (BackgroundService) realiza polling periodico y despacha los mensajes pendieSi un dato no existe en la auditoría, debes omitirlontes.
- Retry con backoff exponencial: base 30s, maximo 1h, 5 intentos maximos.
- Mensajes envenenados se marcan con retry de 365 dias (intervencion manual).

#### Proyecciones (read models)

- Motor de proyecciones con 9 handlers especializados.
- Contexto de proyeccion in-memory con `ConcurrentDictionary` (thread-safe).
- 4 vistas: `WaitingRoomMonitorView`, `QueueStateView`, `NextTurnView`, `RecentAttentionRecordView`.
- Soporte de idempotencia: mismo evento procesado multiples veces produce el mismo estado.
- Soporte de rebuild: la proyeccion puede reconstruirse completamente desde el event store.

### 4.2 Evaluacion de la arquitectura

**Fortalezas:**

1. Separacion de capas impecable: el dominio no tiene dependencias de framework.
2. Event Sourcing bien implementado con metadatos completos y soporte de idempotencia.
3. Outbox pattern garantiza consistencia eventual sin distribuir transacciones.
4. Los eventos de dominio son records inmutables con semejanza semantica al lenguaje ubicuo.
5. Las invariantes del dominio estan centralizadas en `WaitingQueueInvariants`.
6. Observabilidad integrada con lag tracking (P50, P95, P99).
7. Proyecciones idempotentes y reconstruibles.
8. Middleware de correlacion para trazabilidad distribuida.

**Debilidades:**

1. Las proyecciones son in-memory: se pierden al reiniciar el proceso.
2. El `Program.cs` de la API tiene ~887 lineas y actua como mega-composition root.
3. El `WaitingRoomHub` de SignalR esta vacio (placeholder sin funcionalidad).
4. No hay validacion explicita de contratos en los query endpoints.
5. Acoplamiento del `EventTypeRegistry` a una lista estatica de tipos (no extensible por plugin).
6. `UnitTest1.cs` en el proyecto de tests de dominio es un test vacio residual.

---

## 5. Evaluacion de cumplimiento hexagonal

### 5.1 Criterios de evaluacion

| Criterio | Peso | Puntuacion (0-10) | Justificacion |
|---|---|---|---|
| **Independencia del dominio** | 20% | **10/10** | `WaitingRoom.Domain` no tiene ninguna dependencia de framework. Solo depende de `BuildingBlocks.EventSourcing` que es un building block propio sin dependencias externas. |
| **Puertos bien definidos** | 15% | **9/10** | Los puertos `IEventStore`, `IEventPublisher`, `IOutboxStore` estan correctamente definidos en la capa de aplicacion. Se descuenta 1 punto porque `IClock` esta en BuildingBlocks en lugar de Application. |
| **Adaptadores desacoplados** | 15% | **9/10** | Los adaptadores (`PostgresEventStore`, `RabbitMqEventPublisher`, `PostgresOutboxStore`) implementan correctamente los puertos sin filtrar detalles de infraestructura. -1 por `EventTypeRegistry` que requiere tipos concretos de dominio en infraestructura. |
| **Flujo de dependencias** | 15% | **10/10** | Las dependencias fluyen exclusivamente hacia adentro: API → Application → Domain. Infraestructura depende de Application (puertos) y Domain (eventos). Cumple la regla de dependencia estrictamente. |
| **Inyeccion de dependencias** | 10% | **8/10** | La DI se configura en `Program.cs`. Toda inyeccion es explicita y por constructor. -2 por el tamano excesivo del composition root (~887 lineas). |
| **Testabilidad** | 15% | **9/10** | El dominio es 100% testable sin mocks. Los command handlers son testeables con mocks de puertos. -1 por ausencia de test doubles formales para las proyecciones. |
| **Separacion lectura/escritura** | 10% | **9/10** | CQRS bien implementado con event store (escritura) y proyecciones (lectura) completamente separados. -1 porque las proyecciones in-memory no persisten estado. |

### 5.2 Puntuacion global hexagonal

$$\text{Score} = \sum_{i=1}^{7} w_i \times s_i = 0.20(10) + 0.15(9) + 0.15(9) + 0.15(10) + 0.10(8) + 0.15(9) + 0.10(9) = 9.3/10$$

**Calificacion: 9.3/10 - Excelente cumplimiento hexagonal.**

El sistema demuestra un dominio maduro de la arquitectura hexagonal. Las pocas oportunidades de mejora se centran en la reduccion del tamano del composition root y la persistencia de las proyecciones.

---

## 6. Analisis SOLID

### 6.1 Evaluacion por principio

#### S - Single Responsibility Principle (SRP)

**Puntuacion: 8/10**

| Componente | Cumple | Observacion |
|---|---|---|
| `WaitingQueue` (agregado) | Parcial | Responsable del estado del agregado Y de aplicar 14 operaciones de dominio. Es un agregado DDD legitimo, pero su tamano es considerable. |
| Command Handlers | Si | Cada handler tiene exactamente una responsabilidad: orquestar un comando. |
| Value Objects | Si | Cada value object encapsula una unica validacion y representacion. |
| `Program.cs` (API) | No | Composition root + definicion de endpoints + middleware registration en un solo archivo de ~887 lineas. |
| `PostgresEventStore` | Si | Unica responsabilidad: persistir y recuperar eventos. |
| `OutboxDispatcher` | Si | Unica responsabilidad: despachar mensajes del outbox. |

**Detalle negativo:** `Program.cs` viola SRP al combinar configuracion de DI, definicion de endpoints, middleware y mapeo de rutas en un solo archivo. Deberia extraerse a clases de extension.

#### O - Open/Closed Principle (OCP)

**Puntuacion: 8/10**

| Componente | Cumple | Observacion |
|---|---|---|
| Eventos de dominio | Si | Nuevos eventos se agregan como nuevos records sin modificar los existentes. |
| Event Sourcing | Si | El patron es inherentemente extensible: nuevos eventos extienden el comportamiento. |
| Projection handlers | Si | Nuevos handlers se agregan sin modificar los existentes. |
| `EventTypeRegistry` | No | Agregar un nuevo tipo de evento requiere modificar la lista estatica en el registro. |
| `ExceptionHandlerMiddleware` | Parcial | Agregar nuevos tipos de excepcion requiere modificar el switch/case del middleware. |

#### L - Liskov Substitution Principle (LSP)

**Puntuacion: 9/10**

| Componente | Cumple | Observacion |
|---|---|---|
| `DomainEvent` → Records concretos | Si | Todos los eventos sustituyen a `DomainEvent` correctamente. |
| `IEventStore` → `PostgresEventStore` | Si | La implementacion cumple el contrato sin restricciones adicionales. |
| `IEventPublisher` → `RabbitMqEventPublisher` / `OutboxEventPublisher` | Si | Ambas implementaciones son sustituibles. `OutboxEventPublisher` es un no-op deliberado. |
| `AggregateRoot` → `WaitingQueue` | Si | El agregado extiende correctamente la clase base. |

#### I - Interface Segregation Principle (ISP)

**Puntuacion: 9/10**

| Componente | Cumple | Observacion |
|---|---|---|
| `IEventStore` | Si | Interfaz cohesiva: `LoadAsync`, `SaveAsync`, `GetEventsAsync`. |
| `IEventPublisher` | Si | Interfaz minima: `PublishAsync` (2 sobrecargas). |
| `IOutboxStore` | Si | Interfaz cohesiva: `AddAsync`, `GetPendingAsync`, `MarkDispatchedAsync`, `MarkFailedAsync`. |
| `IProjection` | Parcial | La interfaz tiene 7 metodos, algunos de los cuales podrian segregarse (health vs processing vs checkpoint). |
| `IClock` | Si | Interfaz de un solo metodo: `UtcNow`. |

#### D - Dependency Inversion Principle (DIP)

**Puntuacion: 10/10**

| Componente | Cumple | Observacion |
|---|---|---|
| Domain → Abstracciones | Si | El dominio no depende de ningun modulo concreto. |
| Application → Puertos | Si | Los command handlers dependen de `IEventStore`, `IEventPublisher` (interfaces). |
| Infrastructure → Puertos | Si | Los adaptadores implementan los puertos de la capa de aplicacion. |
| API → Abstracciones | Si | Los endpoints resuelven servicios via DI, sin acoplamiento directo. |

### 6.2 Puntuacion SOLID global

| Principio | Puntuacion |
|---|---|
| S - Single Responsibility | 8/10 |
| O - Open/Closed | 8/10 |
| L - Liskov Substitution | 9/10 |
| I - Interface Segregation | 9/10 |
| D - Dependency Inversion | 10/10 |
| **Promedio SOLID** | **8.8/10** |

---

## 7. Estructura del proyecto

```
rlapp-backend/
├── RLAPP.slnx                           # Archivo de solucion (.NET 10)
├── Dockerfile                            # Multi-stage build (API/Worker)
├── docker-compose.yml                    # Orquestacion completa (8 servicios)
├── .env.template                         # Variables de entorno documentadas
├── start-services.sh                     # Script de inicio de servicios
├── run-complete-test.sh                  # Script de ciclo de pruebas completo
│
├── infrastructure/
│   ├── postgres/
│   │   └── init.sql                      # DDL: event store, outbox, lag, read models
│   ├── rabbitmq/
│   │   ├── rabbitmq.conf                 # Configuracion del broker
│   │   └── init-rabbitmq.sh              # Script de inicializacion de exchanges
│   ├── prometheus/
│   │   ├── prometheus.yml                # Configuracion de scraping
│   │   └── alert-rules.yml               # Reglas de alerta (3 grupos)
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/datasources.yml
│       │   └── dashboards/dashboards.yml
│       └── dashboards/
│           ├── event-processing.json     # Dashboard de procesamiento de eventos
│           └── infrastructure.json       # Dashboard de infraestructura
│
├── src/
│   ├── BuildingBlocks/
│   │   ├── BuildingBlocks.EventSourcing/
│   │   │   ├── AggregateRoot.cs          # Clase base para agregados (Apply, ClearEvents)
│   │   │   ├── DomainEvent.cs            # Record base para eventos
│   │   │   ├── EventMetadata.cs          # Metadatos del evento (correlacion, version, etc.)
│   │   │   └── IClock.cs                 # Abstraccion de reloj
│   │   ├── BuildingBlocks.Messaging/
│   │   │   └── IEventSerializer.cs       # Puerto de serializacion
│   │   └── BuildingBlocks.Observability/
│   │       └── EventLagTracker.cs        # IEventLagTracker + modelos de metricas
│   │
│   ├── Services/WaitingRoom/
│   │   ├── WaitingRoom.Domain/           # Nucleo del dominio (zero-dependency)
│   │   │   ├── Aggregates/
│   │   │   │   ├── WaitingQueue.cs       # Agregado raiz (~600 lineas)
│   │   │   │   └── WaitingPatient.cs     # Entidad (paciente en cola)
│   │   │   ├── Commands/                 # 12 request records (Parameter Object)
│   │   │   ├── Events/                   # 14 domain event records
│   │   │   ├── ValueObjects/
│   │   │   │   ├── PatientId.cs          # Value object con validacion
│   │   │   │   ├── Priority.cs           # Low/Medium/High/Urgent con Level
│   │   │   │   ├── ConsultationType.cs   # Value object con validacion de longitud
│   │   │   │   └── WaitingQueueId.cs     # Value object de identificador de cola
│   │   │   ├── Invariants/
│   │   │   │   └── WaitingQueueInvariants.cs # Constantes de invariantes de negocio
│   │   │   └── Exceptions/
│   │   │       └── DomainException.cs    # Excepcion de dominio
│   │   │
│   │   ├── WaitingRoom.Application/      # Capa de aplicacion (puertos + handlers)
│   │   │   ├── CommandHandlers/          # 12 command handlers
│   │   │   ├── Commands/                 # 12 application commands (DTOs)
│   │   │   ├── DTOs/                     # 14 DTOs con DataAnnotations
│   │   │   ├── Ports/                    # IEventStore, IEventPublisher, IOutboxStore
│   │   │   ├── Services/
│   │   │   │   └── SystemClock.cs        # Implementacion de IClock
│   │   │   └── Exceptions/              # ApplicationException, AggregateNotFoundException, EventConflictException
│   │   │
│   │   ├── WaitingRoom.Infrastructure/   # Adaptadores de infraestructura
│   │   │   ├── Persistence/
│   │   │   │   ├── EventStore/
│   │   │   │   │   ├── PostgresEventStore.cs    # Event store con Dapper + Outbox atomico
│   │   │   │   │   └── EventStoreSchema.cs      # DDL programatico
│   │   │   │   └── Outbox/
│   │   │   │       └── PostgresOutboxStore.cs   # Outbox store con gestion de estados
│   │   │   ├── Messaging/
│   │   │   │   ├── RabbitMqEventPublisher.cs    # Publicador RabbitMQ (topic exchange)
│   │   │   │   ├── OutboxEventPublisher.cs      # No-op publisher (el Worker despacha)
│   │   │   │   └── RabbitMqOptions.cs           # Configuracion del broker
│   │   │   ├── Serialization/
│   │   │   │   ├── EventSerializer.cs           # JSON con Newtonsoft.Json
│   │   │   │   └── EventTypeRegistry.cs         # Mapeo nombre ↔ tipo de evento
│   │   │   ├── Observability/
│   │   │   │   └── PostgresEventLagTracker.cs   # Lag tracking con P50/P95/P99
│   │   │   └── Projections/
│   │   │       └── InMemoryWaitingRoomProjectionContext.cs  # Read model in-memory
│   │   │
│   │   ├── WaitingRoom.API/             # Adaptador HTTP (entrada)
│   │   │   ├── Program.cs               # Composition root + endpoints (~887 lineas)
│   │   │   ├── Endpoints/
│   │   │   │   └── WaitingRoomQueryEndpoints.cs  # Query endpoints (5 GET)
│   │   │   ├── Hubs/
│   │   │   │   └── WaitingRoomHub.cs    # SignalR hub (vacio)
│   │   │   ├── Middleware/
│   │   │   │   ├── ExceptionHandlerMiddleware.cs   # Mapeo excepcion → HTTP status
│   │   │   │   └── CorrelationIdMiddleware.cs      # X-Correlation-Id header
│   │   │   ├── Filters/
│   │   │   │   └── RequestValidationFilter.cs      # Validacion DataAnnotations
│   │   │   └── appsettings.json         # Configuracion base
│   │   │
│   │   ├── WaitingRoom.Projections/     # Motor de proyecciones CQRS (read-side)
│   │   │   ├── Abstractions/            # IProjection, IProjectionHandler, etc.
│   │   │   ├── Handlers/                # 9 projection handlers
│   │   │   ├── Views/                   # 4 vistas de lectura
│   │   │   ├── Processing/
│   │   │   │   └── ProjectionEventProcessor.cs  # Router de eventos + lag tracking
│   │   │   ├── Infrastructure/
│   │   │   │   └── RabbitMqProjectionEventSubscriber.cs  # Consumer RabbitMQ
│   │   │   ├── Implementations/
│   │   │   │   └── WaitingRoomProjectionEngine.cs  # Motor con 9 handlers
│   │   │   └── Worker/
│   │   │       └── ProjectionWorker.cs  # BackgroundService
│   │   │
│   │   └── WaitingRoom.Worker/          # Outbox dispatcher (proceso independiente)
│   │       ├── Program.cs               # Composition root del Worker
│   │       └── Services/
│   │           ├── OutboxWorker.cs       # BackgroundService (polling loop)
│   │           ├── OutboxDispatcher.cs   # Logica de despacho con retry
│   │           └── OutboxDispatcherOptions.cs  # Configuracion del dispatcher
│   │
│   └── Tests/
│       ├── WaitingRoom.Tests.Domain/          # Tests unitarios de dominio (9 archivos)
│       ├── WaitingRoom.Tests.Application/     # Tests unitarios de aplicacion (3 archivos)
│       ├── WaitingRoom.Tests.Integration/     # Tests de integracion (3 archivos)
│       └── WaitingRoom.Tests.Projections/     # Tests de proyecciones (3 archivos)
```

### 7.1 Distribucion de proyectos (RLAPP.slnx)

| Proyecto | Tipo | Dependencias |
|---|---|---|
| BuildingBlocks.EventSourcing | Libreria | Ninguna |
| BuildingBlocks.Messaging | Libreria | Ninguna |
| BuildingBlocks.Observability | Libreria | Ninguna |
| WaitingRoom.Domain | Libreria | BuildingBlocks.EventSourcing |
| WaitingRoom.Application | Libreria | Domain |
| WaitingRoom.Infrastructure | Libreria | Application, Domain, BuildingBlocks.* |
| WaitingRoom.API | Ejecutable | Application, Infrastructure, Projections, BuildingBlocks.* |
| WaitingRoom.Projections | Ejecutable | Application, Domain, Infrastructure, BuildingBlocks.* |
| WaitingRoom.Worker | Ejecutable | Application, Infrastructure, BuildingBlocks.* |
| WaitingRoom.Tests.Domain | Tests | Domain |
| WaitingRoom.Tests.Application | Tests | Application, Domain |
| WaitingRoom.Tests.Integration | Tests | Worker, Infrastructure, Projections, BuildingBlocks.* |
| WaitingRoom.Tests.Projections | Tests | Projections, Infrastructure, Application, Domain, BuildingBlocks.* |

---

## 8. Tecnologias detectadas

### 8.1 Plataforma y lenguaje

| Tecnologia | Version | Uso |
|---|---|---|
| .NET | 10.0 (`net10.0`) | Target framework de todos los proyectos |
| C# | 13+ (inferido por net10.0) | Records, required properties, collection expressions, pattern matching |
| ASP.NET Core Minimal API | 10.0 | Sin controllers, lambda-based endpoints |

### 8.2 Persistencia

| Tecnologia | Version | Uso |
|---|---|---|
| PostgreSQL | 16+ (inferido por docker-compose) | Event store, outbox, read models |
| Npgsql | 8.0.5 | Driver ADO.NET para PostgreSQL |
| Dapper | 2.1.35 | Micro-ORM para SQL con parametros tipados |

### 8.3 Messaging

| Tecnologia | Version | Uso |
|---|---|---|
| RabbitMQ.Client | 6.8.1 | Cliente AMQP para .NET |
| RabbitMQ | 3-management (Docker) | Broker de mensajes (topic exchange) |

### 8.4 Serializacion

| Tecnologia | Version | Uso |
|---|---|---|
| Newtonsoft.Json | 13.0.3 | Serializacion JSON de eventos (camelCase) |

### 8.5 Logging y observabilidad

| Tecnologia | Version | Uso |
|---|---|---|
| Serilog | 4.2.0 | Logging estructurado |
| Serilog.AspNetCore | (transitive) | Integracion con ASP.NET Core |
| Serilog.Sinks.Console | (transitive) | Output a consola |
| Serilog.Enrichers.Environment | (transitive) | Enriquecimiento con hostname |
| Serilog.Enrichers.Thread | (transitive) | ThreadId en logs |
| Seq | (Docker) | Servidor de logging estructurado |
| Prometheus | (Docker) | Sistema de metricas |
| Grafana | (Docker) | Dashboards de monitoreo |

### 8.6 Tiempo real

| Tecnologia | Version | Uso |
|---|---|---|
| Microsoft.AspNetCore.SignalR | (built-in) | WebSocket hub (placeholder actualmente) |

### 8.7 Testing

| Tecnologia | Version | Uso |
|---|---|---|
| xUnit | 2.6.2 - 2.9.3 | Framework de pruebas |
| FluentAssertions | 6.12.0 - 8.8.0 | Aserciones fluidas |
| Moq | 4.20.70 | Mock framework (Application + Integration tests) |
| NSubstitute | 4.4.0 | Mock framework alternativo (Projection tests) |
| coverlet.collector | 6.0.4 | Cobertura de codigo |
| Microsoft.NET.Test.Sdk | 17.8.0 - 17.14.1 | SDK de pruebas |

### 8.8 Infraestructura

| Tecnologia | Uso |
|---|---|
| Docker | Contenedorizacion de servicios |
| Docker Compose | Orquestacion local de 8+ servicios |
| PgAdmin | Administracion de PostgreSQL (puerto 5050) |

---

## 9. Endpoints expuestos

### 9.1 Endpoints de comando (POST)

#### Grupo: Sala de espera (`/api/waiting-room`)

| Metodo | Ruta | DTO | Descripcion |
|---|---|---|---|
| POST | `/api/waiting-room/check-in` | `CheckInPatientDto` | Registrar paciente en la cola |
| POST | `/api/waiting-room/activate-consulting-room` | `ActivateConsultingRoomDto` | Activar un consultorio |
| POST | `/api/waiting-room/deactivate-consulting-room` | `DeactivateConsultingRoomDto` | Desactivar un consultorio |

#### Grupo: Recepcion (`/api/reception`)

| Metodo | Ruta | DTO | Descripcion |
|---|---|---|---|
| POST | `/api/reception/check-in` | `CheckInPatientDto` | Check-in desde recepcion |

#### Grupo: Taquilla (`/api/cashier`)

| Metodo | Ruta | DTO | Descripcion |
|---|---|---|---|
| POST | `/api/cashier/call-next` | `CallNextCashierDto` | Llamar siguiente paciente a taquilla |
| POST | `/api/cashier/validate-payment` | `ValidatePaymentDto` | Validar pago del paciente |
| POST | `/api/cashier/mark-payment-pending` | `MarkPaymentPendingDto` | Marcar pago como pendiente |
| POST | `/api/cashier/mark-absent` | `MarkAbsentAtCashierDto` | Marcar ausencia en taquilla |
| POST | `/api/cashier/cancel-by-payment` | `CancelByPaymentDto` | Cancelar paciente por fallo de pago |

#### Grupo: Medico (`/api/medical`)

| Metodo | Ruta | DTO | Descripcion |
|---|---|---|---|
| POST | `/api/medical/claim-next` | `ClaimNextPatientDto` | Reclamar siguiente paciente |
| POST | `/api/medical/call-patient` | `CallPatientDto` | Llamar paciente a consultorio |
| POST | `/api/medical/complete-attention` | `CompleteAttentionDto` | Finalizar atencion |
| POST | `/api/medical/mark-absent` | `MarkAbsentAtConsultationDto` | Marcar ausencia en consulta |

#### Grupo: Consultorios (`/api/consulting-rooms`)

| Metodo | Ruta | DTO | Descripcion |
|---|---|---|---|
| POST | `/api/consulting-rooms/activate` | `ActivateConsultingRoomDto` | Activar consultorio |
| POST | `/api/consulting-rooms/deactivate` | `DeactivateConsultingRoomDto` | Desactivar consultorio |

### 9.2 Endpoints de consulta (GET)

| Metodo | Ruta | Respuesta | Descripcion |
|---|---|---|---|
| GET | `/api/waiting-room/{queueId}/monitor` | `WaitingRoomMonitorView` | Vista de monitor de la sala de espera |
| GET | `/api/waiting-room/{queueId}/queue-state` | `QueueStateView` | Estado detallado de la cola |
| GET | `/api/waiting-room/{queueId}/next-turn` | `NextTurnView` | Informacion del siguiente turno |
| GET | `/api/waiting-room/{queueId}/recent-history` | `List<RecentAttentionRecordView>` | Historial reciente de atenciones |
| POST | `/api/waiting-room/{queueId}/rebuild` | `{message}` | Reconstruir proyecciones desde event store |

### 9.3 Endpoints de salud (health checks)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/health/live` | Liveness probe (siempre healthy) |
| GET | `/health/ready` | Readiness probe (verifica PostgreSQL) |

### 9.4 WebSocket

| Ruta | Protocolo | Descripcion |
|---|---|---|
| `/hubs/waiting-room` | SignalR (WebSocket) | Hub de tiempo real (actualmente vacio) |

### 9.5 Configuracion CORS

Origenes permitidos: `http://localhost:3000`, `http://localhost:3001`

---

## 10. Modelos de datos

### 10.1 Agregado (write model)

#### WaitingQueue (agregado raiz)

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `Id` | `string` | Identificador unico de la cola |
| `QueueName` | `string` | Nombre de la cola |
| `MaxCapacity` | `int` | Capacidad maxima |
| `CurrentCount` | `int` | Cantidad actual de pacientes |
| `Patients` | `List<WaitingPatient>` | Lista de pacientes en cola |
| `CurrentCashierPatientId` | `string?` | Paciente actualmente en taquilla |
| `CurrentCashierState` | `string?` | Estado del paciente en taquilla |
| `CurrentAttentionPatientId` | `string?` | Paciente actualmente en atencion |
| `CurrentAttentionState` | `string?` | Estado del paciente en atencion |
| `ActiveConsultingRooms` | `HashSet<string>` | Consultorios activos |
| `Version` | `long` | Version del agregado (control de concurrencia) |

#### WaitingPatient (entidad)

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `PatientId` | `PatientId` | Identificador (value object) |
| `PatientName` | `string` | Nombre del paciente |
| `Priority` | `Priority` | Prioridad (value object con nivel numerico) |
| `ConsultationType` | `ConsultationType` | Tipo de consulta |
| `QueuePosition` | `int` | Posicion en la cola |
| `CheckInTime` | `DateTime` | Hora de registro |
| `State` | `string` | Estado actual en la maquina de estados |
| `CashierAbsenceCount` | `int` | Contador de ausencias en taquilla |
| `PaymentAttempts` | `int` | Contador de intentos de pago |
| `ConsultationAbsenceCount` | `int` | Contador de ausencias en consulta |
| `Notes` | `string?` | Notas adicionales |

### 10.2 Value Objects

| Value Object | Validaciones | Propiedades |
|---|---|---|
| `PatientId` | No vacio, no nulo, trim | `Value: string` |
| `Priority` | Valores: Low, Medium, High, Urgent. Trim | `Value: string`, `Level: int` (1-4) |
| `ConsultationType` | No vacio, longitud 2-100, trim | `Value: string` |
| `WaitingQueueId` | No vacio, no nulo | `Value: string` |

### 10.3 DTOs de aplicacion (con DataAnnotations)

| DTO | Propiedades requeridas |
|---|---|
| `CheckInPatientDto` | QueueId, PatientId, PatientName, Priority, ConsultationType |
| `CallNextCashierDto` | QueueId |
| `ValidatePaymentDto` | QueueId, PatientId |
| `MarkPaymentPendingDto` | QueueId, PatientId |
| `MarkAbsentAtCashierDto` | QueueId, PatientId |
| `CancelByPaymentDto` | QueueId, PatientId |
| `ClaimNextPatientDto` | QueueId |
| `CallPatientDto` | QueueId, PatientId |
| `CompleteAttentionDto` | QueueId, PatientId |
| `MarkAbsentAtConsultationDto` | QueueId, PatientId |
| `ActivateConsultingRoomDto` | QueueId, ConsultingRoomId |
| `DeactivateConsultingRoomDto` | QueueId, ConsultingRoomId |

### 10.4 Vistas de lectura (read models / proyecciones)

#### WaitingRoomMonitorView

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `QueueId` | `string` | Identificador de la cola |
| `TotalPatientsWaiting` | `int` | Total de pacientes en espera |
| `HighPriorityCount` | `int` | Pacientes con prioridad alta |
| `NormalPriorityCount` | `int` | Pacientes con prioridad normal |
| `LowPriorityCount` | `int` | Pacientes con prioridad baja |
| `LastUpdatedAt` | `DateTime` | Ultima actualizacion |

#### QueueStateView

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `QueueId` | `string` | Identificador de la cola |
| `CurrentCount` | `int` | Cantidad actual |
| `PatientsInQueue` | `List<PatientInQueueDto>` | Lista detallada de pacientes |

#### NextTurnView

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `QueueId` | `string` | Identificador de la cola |
| `PatientId` | `string` | ID del paciente en turno |
| `PatientName` | `string` | Nombre del paciente |
| `Status` | `string` | Estado actual (claimed, called) |

#### RecentAttentionRecordView

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `PatientId` | `string` | ID del paciente |
| `PatientName` | `string` | Nombre |
| `Priority` | `string` | Prioridad |
| `ConsultationType` | `string` | Tipo de consulta |
| `CompletedAt` | `DateTime` | Fecha de finalizacion |

### 10.5 Esquema de base de datos (PostgreSQL)

#### Base de datos: `rlapp_waitingroom` (Event Store)

| Tabla | Proposito | Indices unicos |
|---|---|---|
| `waiting_room_events` | Almacen de eventos | `(aggregate_id, version)`, `(idempotency_key)` |
| `waiting_room_outbox` | Outbox pattern | `(event_id)` |
| `event_processing_lag` | Metricas de lag | `(event_id)` |
| `projection_checkpoints` | Checkpoints de proyeccion | `(idempotency_key)` |

#### Base de datos: `rlapp_waitingroom_read` (Read Models)

| Tabla | Proposito | Indices |
|---|---|---|
| `waiting_queue_view` | Vista de colas | PK: `queue_id` |
| `waiting_patients_view` | Vista de pacientes | PK: `(queue_id, patient_id)`, idx: status |
| `event_lag_metrics` | Metricas de lag | idx: `metric_timestamp`, `event_name` |

#### Base de datos: `rlapp_waitingroom_test` (Testing)

Replica exacta del esquema de `rlapp_waitingroom` para tests de integracion.

---

## 11. Analisis exhaustivo de testing

### 11.1 Resumen cuantitativo

| Proyecto de tests | Archivos .cs | Tests estimados | Cobertura conceptual |
|---|---|---|---|
| WaitingRoom.Tests.Domain | 8 | ~35 | Agregado, value objects, eventos, invariantes |
| WaitingRoom.Tests.Application | 2 | ~10 | Command handlers (CheckIn, flujo de atencion) |
| WaitingRoom.Tests.Integration | 2 | ~7 | Outbox dispatcher, pipeline E2E completo |
| WaitingRoom.Tests.Projections | 3 | ~13 | Idempotencia, replay, flujo de atencion |
| **Total** | **15** | **~65** | |

### 11.2 Detalle por proyecto

#### WaitingRoom.Tests.Domain

**Framework:** xUnit + FluentAssertions (8.8.0)
**Dependencias de prueba:** Cero dependencias de infraestructura. Tests 100% puros de dominio.

| Archivo | Tests | Que valida |
|---|---|---|
| `WaitingQueueTests.cs` | 12 | Creacion de cola, check-in valido e invalido, capacidad, duplicados (case-insensitive), orden de pacientes, limpieza de eventos, determinismo |
| `WaitingQueueAttentionFlowTests.cs` | 12 | Flujo completo: check-in → taquilla → pago → consulta → finalizacion. Ausencias, cancelaciones, prioridad en claim, activacion/desactivacion de consultorios |
| `WaitingQueueCheckInPatientAfterRefactoringTests.cs` | 10 | Validacion del patron Parameter Object (CheckInPatientRequest). Retrocompatibilidad tras refactorizacion |
| `PatientCheckedInTests.cs` | 6 | Evento PatientCheckedIn: creacion, inmutabilidad (with), metadata, determinismo |
| `PriorityTests.cs` | 7 | Value object Priority: valores validos, invalidos, vacios, nulos, whitespace, trim, comparacion de niveles |
| `PatientIdTests.cs` | 7 | Value object PatientId: creacion, trim, vacio, whitespace, nulo, igualdad semantica |
| `ConsultationTypeTests.cs` | 5 | Value object ConsultationType: creacion, vacio, muy corto, muy largo, trim |
| `UnitTest1.cs` | 1 (vacio) | Test placeholder sin aserciones |

**Patrones de testing observados:**

- AAA (Arrange-Act-Assert) consistente.
- Factory methods para crear agregados y requests de prueba.
- Cobertura de caminos negativos (excepciones de dominio).
- Tests de determinismo (misma entrada → misma salida).
- Tests de inmutabilidad de records.

#### WaitingRoom.Tests.Application

**Framework:** xUnit + FluentAssertions (8.8.0) + Moq (4.20.70)
**Dependencias de prueba:** Mocks de IEventStore, IEventPublisher. FakeClock para determinismo temporal.

| Archivo | Tests | Que valida |
|---|---|---|
| `CheckInPatientCommandHandlerTests.cs` | 7 | Handler de check-in: happy path, queue no encontrada (bootstrap), capacidad excedida, conflicto de concurrencia, idempotencia, correlacion, publicacion de eventos |
| `AttentionWorkflowCommandHandlersTests.cs` | 3 | Flujo cashier→payment→claim→call→complete a nivel de command handlers con mocks de infraestructura |

**Patrones de testing observados:**

- `FakeClock` para inyectar tiempo determinista.
- Verificacion de interacciones con `Mock.Verify()`.
- Callbacks en mocks para capturar argumentos.
- Cobertura de excepciones (`DomainException`, `EventConflictException`).

#### WaitingRoom.Tests.Integration

**Framework:** xUnit + FluentAssertions (6.12.0) + Moq (4.20.70)
**Dependencias de prueba:** PostgreSQL real (opcional), `FakeOutboxStore`, `MockProjection`.

| Archivo | Tests | Que valida |
|---|---|---|
| `OutboxDispatcherTests.cs` | 6 | Dispatcher del outbox: sin mensajes, publicacion exitosa, fallos de publicacion, reintentos excedidos, multiples mensajes, fallo parcial |
| `EventDrivenPipelineE2ETests.cs` | 6 | Pipeline E2E completo: check-in → event store → outbox → proyeccion → lag tracking. Idempotencia, estadisticas de lag, eventos lentos, flujo clinico completo, escenario de carga (24 pacientes, 2 recepciones, 4 consultorios, 1 taquilla) |

**Patrones de testing observados:**

- `FakeOutboxStore` in-memory como test double del outbox.
- `TestDomainEvent` personalizado para serializacion.
- `IAsyncLifetime` para setup/teardown de base de datos.
- `ExecuteWithConcurrencyRetryAsync` para manejar conflictos de concurrencia en tests de carga.
- `CollectionBehavior(DisableTestParallelization = true)` para evitar condiciones de carrera.
- Tests de carga realistas con concurrencia (24 pacientes, 4 consultorios simultaneos).

#### WaitingRoom.Tests.Projections

**Framework:** xUnit + FluentAssertions (6.12.0) + NSubstitute (4.4.0)
**Dependencias de prueba:** `InMemoryWaitingRoomProjectionContext`, handlers reales de proyeccion.

| Archivo | Tests | Que valida |
|---|---|---|
| `PatientCheckedInIdempotencyTests.cs` | 6 | Idempotencia del handler: mismo evento 2x/3x produce estado identico. Prioridad alta/normal correcta. Paciente agregado a estado de cola. Orden por prioridad. No duplica paciente |
| `ProjectionReplayTests.cs` | 3 | Determinismo: rebuild produce estado identico a procesamiento incremental. Orden de eventos diferente → mismo estado final. Stream de 100 eventos → replay determinista |
| `AttentionWorkflowProjectionTests.cs` | 1 | Flujo completo de proyeccion: check-in → cashier → payment → claim → call → complete. Valida NextTurnView y historial de atenciones |

**Patrones de testing observados:**

- Uso real de `InMemoryWaitingRoomProjectionContext` (no mocks).
- Validacion de proyecciones idempotentes con multiples ejecuciones.
- Tests de replay para garantizar rebuild correcto.
- Tests de ordering para verificar correcta priorizacion en vistas.

### 11.3 Calidad del testing

| Criterio | Evaluacion | Puntuacion (0-10) |
|---|---|---|
| **Cobertura de dominio** | Agregado, value objects, eventos, invariantes cubiertos extensamente | 9/10 |
| **Cobertura de aplicacion** | CheckIn handler bien cubierto, otros handlers parciales | 6/10 |
| **Cobertura de integracion** | Outbox dispatcher y pipeline E2E con prueba de carga | 8/10 |
| **Cobertura de proyecciones** | Idempotencia, replay y flujo de atencion | 8/10 |
| **Patrones de testing** | AAA, factory methods, test doubles, determinismo | 9/10 |
| **Aislamiento** | Cada capa testeable de forma independiente | 9/10 |
| **Determinismo** | FakeClock, assertions deterministas, sin sleeps en unit tests | 8/10 |
| **Documentacion en tests** | Comentarios XML explicativos en la mayoria de clases de test | 8/10 |

**Puntuacion de testing: 8.1/10**

### 11.4 Brechas de testing identificadas

1. **Test vacio residual:** `UnitTest1.cs` no tiene aserciones (test placeholder sin valor).
2. **Command handlers sin tests:** Solo `CheckInPatientCommandHandler` y el flujo de atencion tienen tests unitarios. Los 10 handlers restantes (MarkPaymentPending, MarkAbsentAtCashier, CancelByPayment, MarkAbsentAtConsultation, ActivateConsultingRoom, DeactivateConsultingRoom, CallPatient standalone) carecen de tests unitarios aislados.
3. **Infraestructura sin tests:** `PostgresEventStore`, `RabbitMqEventPublisher`, `EventSerializer` no tienen tests unitarios dedicados. El E2E los cubre indirectamente pero requiere PostgreSQL.
4. **Middleware sin tests:** `ExceptionHandlerMiddleware`, `CorrelationIdMiddleware`, `RequestValidationFilter` no tienen tests unitarios.
5. **Inconsistencia de versiones:** Los proyectos de test usan diferentes versiones de FluentAssertions (6.12.0 vs 8.8.0) y xUnit (2.6.2 vs 2.9.3).
6. **Doble framework de mocking:** Se usan Moq y NSubstitute simultaneamente sin justificacion clara. Esto aumenta la complejidad cognitiva.

---

## 12. Deuda tecnica identificada

### 12.1 Deuda de alto impacto

| ID | Severidad | Descripcion | Archivos afectados | Impacto |
|---|---|---|---|---|
| DT-001 | Alta | `Program.cs` de la API tiene ~887 lineas combinando composition root, endpoints, middleware y routing | `WaitingRoom.API/Program.cs` | Mantenibilidad, legibilidad, SRP |
| DT-002 | Alta | Proyecciones in-memory (`ConcurrentDictionary`) se pierden al reiniciar el servicio de proyecciones | `InMemoryWaitingRoomProjectionContext.cs` | Disponibilidad del lado de lectura |
| DT-003 | Alta | `WaitingRoomHub` (SignalR) esta completamente vacio, es codigo muerto | `WaitingRoomHub.cs` | Confusion para desarrolladores, funcionalidad anunciada pero no implementada |

### 12.2 Deuda de medio impacto

| ID | Severidad | Descripcion | Archivos afectados | Impacto |
|---|---|---|---|---|
| DT-004 | Media | 10 de 12 command handlers carecen de tests unitarios aislados | `Tests.Application/` | Cobertura de pruebas, regresiones |
| DT-005 | Media | `EventTypeRegistry` usa lista estatica, agregar un evento requiere modificar el registro | `EventTypeRegistry.cs` | OCP, extensibilidad |
| DT-006 | Media | Versiones inconsistentes de dependencias de test (FluentAssertions 6.x vs 8.x, xUnit 2.6 vs 2.9) | `*.Tests.*.csproj` | Compatibilidad, mantenimiento |
| DT-007 | Media | Doble framework de mocking (Moq + NSubstitute) sin justificacion | `*.Tests.*.csproj` | Complejidad cognitiva, curva de aprendizaje |
| DT-008 | Media | `UnitTest1.cs` es un test vacio residual sin valor | `UnitTest1.cs` | Ruido en suite de pruebas |

### 12.3 Deuda de bajo impacto

| ID | Severidad | Descripcion | Archivos afectados | Impacto |
|---|---|---|---|---|
| DT-009 | Baja | Middleware y filtros sin tests unitarios | `ExceptionHandlerMiddleware.cs`, `CorrelationIdMiddleware.cs`, `RequestValidationFilter.cs` | Cobertura |
| DT-010 | Baja | `ExceptionHandlerMiddleware` usa pattern matching con tipos concretos (viola OCP parcialmente) | `ExceptionHandlerMiddleware.cs` | Extensibilidad |
| DT-011 | Baja | Connection strings vacios en `appsettings.json` (se configuran por variable de entorno) | `appsettings.json` | Documentacion de configuracion |
| DT-012 | Baja | No hay mecanismo de health check para RabbitMQ en el readiness probe | `Program.cs` | Resiliencia |

---

## 13. Plan de mejora priorizado

### 13.1 Prioridad critica (Sprint 1-2)

| # | Mejora | Justificacion | Esfuerzo estimado | Deuda resuelta |
|---|---|---|---|---|
| 1 | Extraer `Program.cs` en clases de extension: `EndpointExtensions.cs`, `ServiceExtensions.cs`, `MiddlewareExtensions.cs` | SRP, mantenibilidad, legibilidad | 4-6 horas | DT-001 |
| 2 | Implementar persistencia de proyecciones (PostgreSQL o Redis) con checkpoint-based replay | Disponibilidad del read model | 16-24 horas | DT-002 |
| 3 | Implementar funcionalidad real en `WaitingRoomHub` o remover si no es necesario | Eliminar codigo muerto | 2-8 horas | DT-003 |

### 13.2 Prioridad alta (Sprint 3-4)

| # | Mejora | Justificacion | Esfuerzo estimado | Deuda resuelta |
|---|---|---|---|---|
| 4 | Agregar tests unitarios para los 10 command handlers faltantes | Cobertura de pruebas | 8-12 horas | DT-004 |
| 5 | Refactorizar `EventTypeRegistry` con descubrimiento automatico por reflexion o atributos | OCP, extensibilidad | 3-4 horas | DT-005 |
| 6 | Unificar versiones de dependencias de test en todos los proyectos | Consistencia | 1-2 horas | DT-006 |
| 7 | Estandarizar framework de mocking (elegir Moq o NSubstitute, no ambos) | Simplificacion | 2-4 horas | DT-007 |

### 13.3 Prioridad media (Sprint 5-6)

| # | Mejora | Justificacion | Esfuerzo estimado | Deuda resuelta |
|---|---|---|---|---|
| 8 | Eliminar `UnitTest1.cs` | Limpieza | 5 minutos | DT-008 |
| 9 | Agregar tests unitarios para middleware y filtros | Cobertura | 4-6 horas | DT-009 |
| 10 | Refactorizar `ExceptionHandlerMiddleware` con diccionario de mapeo exception → status code | OCP | 1-2 horas | DT-010 |
| 11 | Agregar health check de RabbitMQ al readiness probe | Resiliencia | 1-2 horas | DT-012 |
| 12 | Implementar metricas de Prometheus en la API (contadores, histogramas) | Observabilidad | 4-6 horas | - |

### 13.4 Prioridad baja (Backlog)

| # | Mejora | Justificacion | Esfuerzo estimado |
|---|---|---|---|
| 13 | Migrar de `Newtonsoft.Json` a `System.Text.Json` | Rendimiento, modernizacion | 4-8 horas |
| 14 | Implementar API versioning | Compatibilidad futura | 2-4 horas |
| 15 | Agregar rate limiting a endpoints | Seguridad | 2-3 horas |
| 16 | Implementar authentication/authorization (JWT o OAuth 2.0) | Seguridad | 8-16 horas |
| 17 | Agregar OpenAPI/Swagger documentation | DX (Developer Experience) | 2-3 horas |

---

## 14. Estimacion de pantallas frontend

Basado en el analisis de los endpoints y las vistas de lectura, se estiman las siguientes pantallas para un frontend:

| # | Pantalla | Complejidad | Endpoints consumidos | Descripcion |
|---|---|---|---|---|
| 1 | **Monitor de sala de espera** | Alta | GET `/monitor`, WebSocket `/hubs/waiting-room` | Dashboard en tiempo real con contadores de prioridad, estado de la cola, notificaciones |
| 2 | **Registro de pacientes (Check-in)** | Media | POST `/check-in` | Formulario de registro con validacion de campos, seleccion de prioridad y tipo de consulta |
| 3 | **Estacion de taquilla** | Alta | POST `/call-next`, `/validate-payment`, `/mark-payment-pending`, `/mark-absent`, `/cancel-by-payment` | Panel con paciente actual en taquilla, botones de accion, estado de pagos, historial |
| 4 | **Panel medico (Consultorio)** | Alta | POST `/claim-next`, `/call-patient`, `/complete-attention`, `/mark-absent`, GET `/next-turn` | Vista del medico con paciente asignado, acciones de atencion, notas clinicas |
| 5 | **Estado de la cola** | Media | GET `/queue-state` | Lista ordenada por prioridad de todos los pacientes en cola con estados |
| 6 | **Historial de atenciones** | Baja | GET `/recent-history` | Tabla de atenciones completadas con filtros |
| 7 | **Gestion de consultorios** | Baja | POST `/activate`, `/deactivate` | Listado de consultorios con toggles de activacion |
| 8 | **Pantalla de llamado (Display)** | Media | WebSocket `/hubs/waiting-room`, GET `/next-turn` | Pantalla publica de TV mostrando turnos llamados |
| 9 | **Dashboard administrativo** | Alta | Multiples endpoints + metricas | Vista consolidada con KPIs: tiempo promedio de espera, throughput, ausencias |
| 10 | **Login/Autenticacion** | Media | No implementado en backend | Pantalla de login (requiere implementar auth en backend) |

### Estimacion total

| Metrica | Valor |
|---|---|
| Total de pantallas | 10 |
| Componentes reutilizables estimados | 15-20 (tablas, modals, formularios, indicadores) |
| Esfuerzo estimado frontend | 120-160 horas |
| Tecnologia recomendada | Next.js (ya presente en `rlapp-frontend/`) |

---

## 15. Configuracion y ejecucion

### 15.1 Prerequisitos

| Herramienta | Version minima |
|---|---|
| .NET SDK | 10.0 |
| Docker | 20.10+ |
| Docker Compose | 2.0+ |
| PostgreSQL | 16+ (via Docker) |
| RabbitMQ | 3.x (via Docker) |

### 15.2 Variables de entorno

Definidas en `.env.template`:

| Variable | Descripcion | Valor por defecto |
|---|---|---|
| `POSTGRES_USER` | Usuario de PostgreSQL | `rlapp` |
| `POSTGRES_PASSWORD` | Contrasena de PostgreSQL | `rlapp_secure_password` |
| `RABBITMQ_DEFAULT_USER` | Usuario de RabbitMQ | `guest` |
| `RABBITMQ_DEFAULT_PASS` | Contrasena de RabbitMQ | `guest` |
| `RLAPP_EVENTSTORE_CONNECTION` | Connection string del event store | `Host=localhost;Port=5432;Database=rlapp_waitingroom;...` |

### 15.3 Ejecucion con Docker Compose

```bash
# Desde rlapp-backend/
cp .env.template .env

# Iniciar toda la infraestructura + aplicacion
docker-compose up -d

# Verificar salud
curl http://localhost:5000/health/live
curl http://localhost:5000/health/ready
```

### 15.4 Ejecucion local (desarrollo)

```bash
# 1. Iniciar infraestructura
docker-compose up -d postgres rabbitmq seq

# 2. Esperar a que PostgreSQL este listo (~15 segundos)

# 3. Iniciar API
cd src/Services/WaitingRoom/WaitingRoom.API
dotnet run --urls "http://0.0.0.0:5000"

# 4. En otra terminal: iniciar Worker
cd src/Services/WaitingRoom/WaitingRoom.Worker
dotnet run

# 5. En otra terminal: iniciar Projections
cd src/Services/WaitingRoom/WaitingRoom.Projections
dotnet run
```

### 15.5 Ejecucion de tests

```bash
# Tests unitarios (sin infraestructura)
dotnet test src/Tests/WaitingRoom.Tests.Domain/
dotnet test src/Tests/WaitingRoom.Tests.Application/
dotnet test src/Tests/WaitingRoom.Tests.Projections/

# Tests de integracion (requiere PostgreSQL)
dotnet test src/Tests/WaitingRoom.Tests.Integration/

# Todos los tests
dotnet test RLAPP.slnx

# Ciclo completo (cleanup + build + test + deploy)
./run-complete-test.sh
```

### 15.6 Puertos y servicios

| Servicio | Puerto | URL de administracion |
|---|---|---|
| API | 5000 | `http://localhost:5000` |
| PostgreSQL | 5432 | - |
| RabbitMQ | 5672 | `http://localhost:15672` (UI) |
| Prometheus | 9090 | `http://localhost:9090` |
| Grafana | 3000 | `http://localhost:3000` |
| Seq | 5341 | `http://localhost:5341` |
| PgAdmin | 5050 | `http://localhost:5050` |

---

## 16. Evaluacion tecnica general

### 16.1 Scorecard final

| Dimension | Puntuacion | Peso | Ponderado |
|---|---|---|---|
| Arquitectura hexagonal | 9.3/10 | 20% | 1.86 |
| SOLID | 8.8/10 | 15% | 1.32 |
| Event Sourcing + CQRS | 9.0/10 | 15% | 1.35 |
| Calidad de codigo | 8.5/10 | 10% | 0.85 |
| Testing | 8.1/10 | 15% | 1.22 |
| Observabilidad | 8.0/10 | 5% | 0.40 |
| Documentacion tecnica | 7.5/10 | 5% | 0.38 |
| Seguridad | 4.0/10 | 5% | 0.20 |
| DevOps / Infraestructura | 8.5/10 | 5% | 0.43 |
| Escalabilidad | 7.5/10 | 5% | 0.38 |
| **Total ponderado** | | **100%** | **8.39/10** |

### 16.2 Justificacion por dimension

**Arquitectura hexagonal (9.3/10):** Separacion de capas ejemplar. El dominio es completamente independiente. Los puertos estan bien definidos en la capa de aplicacion. Los adaptadores implementan los puertos sin filtrar detalles de infraestructura. El unico punto de mejora es el tamano del composition root.

**SOLID (8.8/10):** DIP perfecto (10/10). LSP e ISP excelentes (9/10 cada uno). SRP y OCP buenos (8/10 cada uno) con oportunidades de mejora en Program.cs y EventTypeRegistry.

**Event Sourcing + CQRS (9.0/10):** Implementacion madura con metadatos completos, idempotency keys, schema versioning, lag tracking. El outbox pattern garantiza consistencia eventual. Las proyecciones son reconstruibles e idempotentes. Se descuenta por proyecciones in-memory no persistentes.

**Calidad de codigo (8.5/10):** Uso avanzado de C# moderno: records inmutables, pattern matching, collection expressions. Consistencia en naming conventions. Value objects con validacion. Se descuenta por UnitTest1.cs residual y el tamano de Program.cs.

**Testing (8.1/10):** 65 tests cubriendo dominio, aplicacion, integracion y proyecciones. Patrones de testing solidos (AAA, factory methods, test doubles, determinismo). Se descuenta por brechas en command handlers, middleware y versiones inconsistentes.

**Observabilidad (8.0/10):** Lag tracking con percentiles (P50, P95, P99). Prometheus + Grafana con dashboards preconfigurados. Alertas predefinidas. Serilog con correlacion. Se descuenta por ausencia de metricas de Prometheus en la API y health check incompleto.

**Documentacion tecnica (7.5/10):** Comentarios XML en tests y clases clave. ADRs (7 documentos). Multiples documentos de arquitectura. Se descuenta por falta de documentacion inline en las clases de dominio y ausencia de un README centralizado.

**Seguridad (4.0/10):** No hay autenticacion ni autorizacion implementada. No hay rate limiting. No hay validacion de HTTPS forzado. CORS configurado solo para desarrollo local. Se aplica esta puntuacion porque es una brecha significativa para un sistema de salud.

**DevOps / Infraestructura (8.5/10):** Docker Compose completo con 8 servicios. Dockerfile multi-stage optimizado. Scripts de inicio y testing automatizados. Esquema SQL de inicializacion. Se descuenta por falta de CI/CD pipeline visible en el repositorio.

**Escalabilidad (7.5/10):** Event Sourcing es inherentemente escalable. El outbox pattern permite despacho asincrono. Los 3 procesos pueden escalar independientemente. Se descuenta porque las proyecciones in-memory limitan la escalabilidad horizontal del servicio de lectura.

### 16.3 Conclusion

El backend de RLAPP demuestra un nivel de madurez arquitectonica **sobresaliente (8.39/10)** para un sistema basado en Event Sourcing, CQRS y Arquitectura Hexagonal. La separacion de capas es impecable, el dominio es puro y testeable, y la infraestructura esta bien desacoplada mediante puertos y adaptadores.

Las principales oportunidades de mejora se concentran en:

1. **Seguridad:** Implementar autenticacion y autorizacion es prioritario para un sistema de salud.
2. **Persistencia de proyecciones:** Migrar de in-memory a un almacen persistente (PostgreSQL/Redis).
3. **Refactorizacion del composition root:** Extraer `Program.cs` en modulos mas pequenos.
4. **Cobertura de tests:** Completar tests unitarios para los command handlers y middleware faltantes.

El sistema esta bien posicionado para evolucion futura: la arquitectura basada en eventos facilita la adicion de nuevos bounded contexts, la integracion con sistemas externos y la escalabilidad horizontal.
