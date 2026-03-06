# Catálogo de Arquitecturas y Patrones de Diseño

> Referencia completa para el sub-agente `refactor-arch`. Cada patrón incluye definición, cuándo usarlo, y ejemplo aplicado al proyecto.

---

## 1. Arquitecturas de Software

### 1.1 Arquitectura Hexagonal (Ports & Adapters)

**Definición:** Aislar la lógica de negocio del mundo exterior mediante puertos (interfaces) y adaptadores (implementaciones concretas). El dominio define QUÉ necesita; la infraestructura decide CÓMO lo implementa.

```
          ┌──────────────────────────────┐
          │        DOMINIO (Núcleo)      │
          │  Entities, Value Objects,    │
          │  Domain Services, Ports      │
          ├──────────────────────────────┤
       ┌──┤     APPLICATION (Use Cases)  ├──┐
       │  └──────────────────────────────┘  │
 ┌─────┴─────┐                       ┌─────┴─────┐
 │  ADAPTER   │                       │  ADAPTER   │
 │  (Inbound) │                       │ (Outbound) │
 │ Controller │                       │ Repository │
 │   Gateway  │                       │ Publisher  │
 └────────────┘                       └────────────┘
```

**Aplicación en el proyecto:**

- **Puertos Inbound:** `CreateAppointmentPort`, `ProcessAppointmentPort`
- **Puertos Outbound:** `AppointmentRepository`, `MessagePublisher`, `NotificationGateway`
- **Adaptadores Inbound:** `AppointmentsController` (REST), `AppointmentsGateway` (WebSocket)
- **Adaptadores Outbound:** `MongooseAppointmentRepository`, `RabbitMQPublisher`

### 1.2 Clean Architecture

**Definición:** Capas concéntricas donde las dependencias apuntan hacia el centro. Similar a Hexagonal pero con capas más explícitas.

```
┌─────────────────────────────────────┐
│ Infrastructure (Frameworks, DB, UI) │
│  ┌─────────────────────────────┐    │
│  │ Application (Use Cases)     │    │
│  │  ┌─────────────────────┐    │    │
│  │  │ Domain (Entities)    │    │    │
│  │  └─────────────────────┘    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Regla de Dependencia:** Las capas internas NUNCA importan de capas externas.

### 1.3 Event-Driven Architecture

**Definición:** Los componentes se comunican mediante eventos asíncronos en lugar de llamadas directas.

**Aplicación en el proyecto:**

- Producer → publica evento `appointment.created` → RabbitMQ Queue → Consumer lo consume
- Consumer → emite evento WebSocket → Dashboard se actualiza en tiempo real

### 1.4 Microservices Architecture

**Definición:** El sistema se descompone en servicios independientes que se comunican por red.

**Aplicación en el proyecto:**

- **Producer:** API REST + publicación de eventos
- **Consumer:** Procesamiento de cola + persistencia + scheduler
- **Comunicación:** RabbitMQ (async), WebSocket (realtime)

---

## 2. Patrones de Diseño — Creacionales

> **Propósito:** Controlan CÓMO se crean los objetos.

### 2.1 Factory Method

**Definición:** Delega la creación de objetos a un método especializado, encapsulando la lógica de construcción y validación.

**Aplicación:**

```typescript
// domain/entities/appointment.entity.ts
// Pattern: Factory Method — Encapsula validación al crear la entidad
export class Appointment {
  private constructor(
    public readonly idCard: number,
    public readonly fullName: string,
    public readonly priority: Priority,
    public status: AppointmentStatus,
  ) {}

  static create(props: CreateAppointmentProps): Appointment {
    if (props.idCard < 10000000 || props.idCard > 9999999999) {
      throw new DomainError("Invalid idCard range");
    }
    return new Appointment(
      props.idCard,
      props.fullName,
      props.priority,
      AppointmentStatus.PENDING,
    );
  }
}
```

**Justificación:** Garantiza que toda entidad creada sea válida, sin depender de `class-validator` (infraestructura).

### 2.2 Abstract Factory

**Definición:** Proporciona una interfaz para crear familias de objetos relacionados sin especificar sus clases concretas.

**Aplicación potencial:**

```typescript
// Familia de adaptadores para diferentes entornos
interface RepositoryFactory {
  createAppointmentRepository(): AppointmentRepository;
  createOfficeRepository(): OfficeRepository;
}

class MongooseRepositoryFactory implements RepositoryFactory { ... }
class InMemoryRepositoryFactory implements RepositoryFactory { ... }  // Para tests
```

### 2.3 Singleton

**Definición:** Garantiza que una clase tenga una única instancia global.

**Aplicación:** El contenedor de DI implementa Singleton por defecto para servicios registrados como instancia única.

```typescript
// El contenedor de DI maneja Singleton implícitamente
@Injectable() // scope: Scope.DEFAULT = Singleton
export class AppointmentsService { ... }
```

### 2.4 Builder

**Definición:** Construye objetos complejos paso a paso, separando la construcción de la representación.

**Aplicación potencial:**

```typescript
// Builder para queries complejos de appointment
const query = new AppointmentQueryBuilder()
  .withStatus(AppointmentStatus.PENDING)
  .withPriority(Priority.HIGH)
  .sortBy("createdAt", "asc")
  .limit(10)
  .build();
```

### 2.5 Prototype

**Definición:** Crea nuevos objetos clonando un prototipo existente.

**Aplicación:** Útil para crear copias de entidades de dominio para comparar estados (before/after).

---

## 3. Patrones de Diseño — Estructurales

> **Propósito:** Definen CÓMO se componen las clases y objetos.

### 3.1 Adapter

**Definición:** Convierte la interfaz de una clase en otra que el cliente espera. Permite que clases incompatibles trabajen juntas.

**Aplicación:**

```typescript
// infrastructure/persistence/postgres-appointment.repository.cs
// Pattern: Adapter — Adapta Mongoose al puerto AppointmentRepository del dominio
@Injectable()
export class MongooseAppointmentRepository implements AppointmentRepository {
  constructor(@InjectModel('Appointment') private model: Model<AppointmentDocument>) {}

  async save(appointment: Appointment): Promise<Appointment> {
    const doc = await this.model.create(this.toPersistence(appointment));
    return this.toDomain(doc);
  }

  // Mappers: Domain ↔ Persistence
  private toDomain(doc: AppointmentDocument): Appointment { ... }
  private toPersistence(entity: Appointment): Record<string, any> { ... }
}
```

**Justificación:** El dominio habla en `Appointment` (entidad pura). Mongoose habla en `AppointmentDocument` (schema). El Adapter traduce entre ambos.

### 3.2 Repository

**Definición:** Abstrae el acceso a datos detrás de una interfaz de colección, haciendo que la persistencia sea intercambiable.

**Aplicación:**

```typescript
// domain/ports/outbound/appointment.repository.ts (Puerto)
export interface AppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findByIdCard(idCard: number): Promise<Appointment | null>;
  findPending(): Promise<Appointment[]>;
  assignOffice(id: string, officeNumber: number): Promise<Appointment>;
}

// infrastructure/persistence/postgres-appointment.repository.cs (Adaptador PostgreSQL)
// infrastructure/persistence/in-memory-appointment.repository.ts (Adaptador para tests)
```

**Justificación:** Permite testear la lógica de negocio sin PostgreSQL, usando un `InMemoryRepository`.

### 3.3 Proxy

**Definición:** Controla el acceso a un objeto, añadiendo comportamiento previo o posterior.

**Aplicación:**

```typescript
// Pattern: Proxy — Logging automático para operaciones de repositorio
@Injectable()
export class LoggingAppointmentRepository implements AppointmentRepository {
  constructor(
    @Inject("REAL_REPO") private realRepo: AppointmentRepository,
    private logger: Logger,
  ) {}

  async save(appointment: Appointment): Promise<Appointment> {
    this.logger.log(`Saving appointment for idCard: ${appointment.idCard}`);
    const result = await this.realRepo.save(appointment);
    this.logger.log(`Saved with id: ${result.id}`);
    return result;
  }
}
```

### 3.4 Facade

**Definición:** Proporciona una interfaz simplificada a un subsistema complejo.

**Aplicación:** Los Use Cases actúan como Facades — simplifican la interacción entre múltiples servicios de dominio y puertos de salida.

```typescript
// application/use-cases/create-appointment.use-case.ts
// Pattern: Facade — Simplifica la orquestación de crear + publicar + notificar
@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private repo: AppointmentRepository,
    private publisher: MessagePublisher,
    private notifier: NotificationGateway,
  ) {}

  async execute(dto: CreateAppointmentDto): Promise<Appointment> {
    const appointment = Appointment.create(dto);
    const saved = await this.repo.save(appointment);
    await this.publisher.publish("appointment.created", saved);
    this.notifier.notify("new-appointment", saved);
    return saved;
  }
}
```

### 3.5 Decorator

**Definición:** Añade funcionalidad a un objeto dinámicamente, sin modificar su clase.

**Aplicación:** Los frameworks modernos usan anotaciones/decoradores extensivamente para DI, endpoints y validación.

```typescript
// Pattern: Decorator — class-validator añade validación vía decoradores
export class CreateAppointmentDto {
  @IsNumber()
  @Min(10000000)
  @Max(9999999999)
  idCard: number;

  @IsString()
  @IsNotEmpty()
  fullName: string;
}
```

### 3.6 Composite

**Definición:** Trata objetos individuales y composiciones de objetos de manera uniforme.

**Aplicación potencial:** Validaciones compuestas donde una validación contiene sub-validaciones.

---

## 4. Patrones de Diseño — Comportamiento

> **Propósito:** Definen CÓMO los objetos interactúan y se comunican.

### 4.1 Observer

**Definición:** Define una relación uno-a-muchos donde cuando un objeto cambia, todos los suscriptores son notificados.

**Aplicación:**

```typescript
// infrastructure/web/appointments.gateway.ts
// Pattern: Observer — Clientes WebSocket suscritos reciben actualizaciones automáticas
@WebSocketGateway({ cors: true })
export class AppointmentsGateway {
  @WebSocketServer() server: Server;

  notifyNewAppointment(appointment: Appointment): void {
    // Notifica a TODOS los clientes suscritos
    this.server.emit("new-appointment", appointment);
  }

  notifyStatusChange(appointment: Appointment): void {
    this.server.emit("appointment-updated", appointment);
  }
}
```

**Justificación:** El Dashboard se suscribe y recibe actualizaciones en tiempo real sin polling.

### 4.2 Strategy

**Definición:** Define una familia de algoritmos intercambiables encapsulados en clases separadas.

**Aplicación:**

```typescript
// domain/ports/outbound/error-handling.strategy.ts
export interface ErrorHandlingStrategy {
  handle(error: Error, message: ConsumeMessage, channel: Channel): void;
}

// infrastructure/messaging/strategies/validation-error.strategy.ts
// Pattern: Strategy — nack sin requeue para errores de validación
export class ValidationErrorStrategy implements ErrorHandlingStrategy {
  handle(error: Error, msg: ConsumeMessage, channel: Channel): void {
    channel.nack(msg, false, false); // No requeue — dato inválido
  }
}

// infrastructure/messaging/strategies/transient-error.strategy.ts
// Pattern: Strategy — nack con requeue para errores temporales
export class TransientErrorStrategy implements ErrorHandlingStrategy {
  handle(error: Error, msg: ConsumeMessage, channel: Channel): void {
    channel.nack(msg, false, true); // Requeue — reintentar después
  }
}
```

**Justificación:** Permite cambiar la estrategia de manejo de errores sin modificar el consumer.

### 4.3 Command

**Definición:** Encapsula una solicitud como un objeto, permitiendo parametrizar, encolar y deshacer operaciones.

**Aplicación:**

```typescript
// Los mensajes de RabbitMQ actúan como Commands
// Pattern: Command — Cada mensaje en la cola es un comando serializado
interface CreateAppointmentCommand {
  idCard: number;
  fullName: string;
  priority: Priority;
  timestamp: Date;
}

// El Producer serializa el comando y lo envía a la cola
// El Consumer lo deserializa y lo ejecuta
```

**Justificación:** Desacopla al emisor del ejecutor. El Producer no sabe quién procesa el turno.

### 4.4 Chain of Responsibility

**Definición:** Pasa la solicitud por una cadena de handlers, donde cada uno decide si la procesa o la pasa al siguiente.

**Aplicación:** Middlewares, filtros e interceptores implementan este patrón:

```typescript
// Pipeline HTTP = Chain of Responsibility
Request → Guard → Interceptor (pre) → Pipe → Controller → Interceptor (post) → Response
```

### 4.5 Template Method

**Definición:** Define el esqueleto de un algoritmo, delegando pasos específicos a subclases.

**Aplicación potencial:**

```typescript
// Flujo base de procesamiento de mensajes
abstract class MessageProcessor<T> {
  async process(rawMessage: ConsumeMessage, channel: Channel): Promise<void> {
    const data = this.deserialize(rawMessage); // Paso 1: común
    const validated = this.validate(data); // Paso 2: específico
    await this.execute(validated); // Paso 3: específico
    this.acknowledge(rawMessage, channel); // Paso 4: común
  }

  protected abstract validate(data: unknown): T;
  protected abstract execute(data: T): Promise<void>;
}
```

### 4.6 State

**Definición:** Permite que un objeto altere su comportamiento cuando su estado interno cambia.

**Aplicación:**

```typescript
// Un Appointment tiene estados con transiciones válidas
// Pattern: State — Comportamiento diferente según el estado actual
enum AppointmentStatus {
  PENDING = "pending", // → IN_PROGRESS
  IN_PROGRESS = "in_progress", // → COMPLETED
  COMPLETED = "completed", // Estado final
}

// El dominio valida transiciones de estado
class Appointment {
  assignOffice(officeNumber: number): void {
    if (this.status !== AppointmentStatus.PENDING) {
      throw new DomainError("Only pending appointments can be assigned");
    }
    this.officeNumber = officeNumber;
    this.status = AppointmentStatus.IN_PROGRESS;
  }
}
```

### 4.7 Mediator

**Definición:** Define un objeto que encapsula cómo interactúan un conjunto de objetos, promoviendo bajo acoplamiento.

**Aplicación:** Los módulos de composición actúan como mediadores, coordinando la inyección de dependencias entre servicios.

---

## 5. Resumen Rápido de Aplicación en el Proyecto

| Categoría          | Patrón                  | ¿Dónde?                                | Justificación                         |
| ------------------ | ----------------------- | -------------------------------------- | ------------------------------------- |
| **Architecture**   | Hexagonal               | Todo el backend                        | Aislar dominio de infraestructura     |
| **Architecture**   | Event-Driven            | Producer → RabbitMQ → Consumer         | Comunicación asíncrona desacoplada    |
| **Architecture**   | Microservices           | Producer + Consumer                    | Servicios independientes y escalables |
| **Creacional**     | Factory                 | `domain/entities/`                     | Validación al crear entidades         |
| **Creacional**     | Singleton               | DI container registration              | Instancia única de servicios          |
| **Creacional**     | Builder                 | Query builders                         | Construcción de consultas complejas   |
| **Estructural**    | Repository              | `domain/ports/` → `infra/persistence/` | Abstraer persistencia                 |
| **Estructural**    | Adapter                 | `infrastructure/*/`                    | Conectar tech concreta a puertos      |
| **Estructural**    | Facade                  | `application/use-cases/`               | Simplificar orquestación              |
| **Estructural**    | Decorator               | DTOs con `class-validator`             | Validación declarativa                |
| **Estructural**    | Proxy                   | Logging repository                     | Control de acceso y logging           |
| **Comportamiento** | Observer                | WebSocket Gateway                      | Notificaciones realtime               |
| **Comportamiento** | Strategy                | ack/nack handlers                      | Manejo de errores flexible            |
| **Comportamiento** | Command                 | Mensajes RabbitMQ                      | Desacoplar emisor de ejecutor         |
| **Comportamiento** | Chain of Responsibility | HTTP pipeline                          | Middlewares → Filters → Handlers      |
| **Comportamiento** | State                   | `AppointmentStatus`                    | Transiciones de estado válidas        |
| **Comportamiento** | Template Method         | Message processors                     | Flujo base con pasos específicos      |
| **Comportamiento** | Mediator                | Composition module                     | Coordinación de dependencias          |
cumplimiento total
