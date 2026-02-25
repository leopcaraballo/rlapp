---
name: refactor-arch (Senior Level)
description: Advanced refactoring towards Hexagonal Architecture, applying SOLID, design patterns, and technical trade-off analysis.
license: "MIT"
---

# Skill: Architecture Refactoring (Senior Grade)

## Context

This project demands an **enterprise-grade architecture**: decoupled, testable, maintainable, and ready to scale. "Spaghetti code" solutions are not accepted.

- **Hexagonal Architecture**: Strict Ports and Adapters.
- **SOLID**: The minimum acceptable standard.
- **Design Patterns**: Conscious use of creational, structural, and behavioral patterns.

### Target Architecture

```
src/
├── domain/              ← Pure core (no infrastructure imports)
│   ├── entities/        ← Domain entities (Appointment, Office)
│   ├── value-objects/   ← Value objects (IdCard, Priority)
│   ├── ports/           ← Interfaces (contracts)
│   │   ├── inbound/     ← Inbound ports (use cases)
│   │   └── outbound/    ← Outbound ports (repositories, messaging)
│   └── services/        ← Pure domain logic
├── application/         ← Use cases (orchestration)
│   ├── use-cases/       ← Inbound port implementations
│   └── dtos/            ← Data Transfer Objects
├── infrastructure/      ← Concrete adapters
│   ├── persistence/     ← Mongoose models, repositories
│   ├── messaging/       ← RabbitMQ adapters
│   ├── web/             ← Controllers, WebSocket Gateways
│   └── config/          ← NestJS modules, providers
```

## Rules

### Strict Layer Separation

1. **domain/** CANNOT import from `infrastructure/`, `@nestjs/*`, `mongoose`, `amqplib`, or any infrastructure library.
2. **application/** can import from `domain/` but NOT from `infrastructure/`.
3. **infrastructure/** implements the ports defined in `domain/ports/`.
4. All dependencies flow inwards: `infra → app → domain`.

### Mandatory SOLID Principles

| Principle | Application                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| **SRP**   | Each class has a single responsibility. Separate business logic from orchestration.       |
| **OCP**   | New features are added by creating new adapters, not modifying the domain.                |
| **LSP**   | Adapters must fulfill the port contract without altering expected behavior.               |
| **ISP**   | Small and specific port interfaces. Do not force unnecessary implementations.             |
| **DIP**   | The domain defines interfaces (ports). The infrastructure implements them (adapters).     |

### Design Patterns to Apply

| Category           | Pattern                 | Use in the project                                           |
| ------------------ | ----------------------- | ------------------------------------------------------------ |
| **Creational**     | Factory                 | Create domain entities with encapsulated validation          |
| **Creational**     | Singleton               | NestJS `@Injectable()` — single instance of services         |
| **Creational**     | Builder                 | Step-by-step construction of complex queries                 |
| **Structural**     | Repository              | Abstract persistence behind an outbound port                 |
| **Structural**     | Adapter                 | Connect infrastructure (Mongoose, RabbitMQ) to ports         |
| **Structural**     | Facade                  | Use Cases simplify orchestration of multiple services        |
| **Structural**     | Decorator               | DTOs with `class-validator` — declarative validation         |
| **Structural**     | Proxy                   | Automatic logging/caching over repositories                  |
| **Behavioral**     | Observer                | WebSocket notifications via domain events                    |
| **Behavioral**     | Strategy                | ack/nack strategies in consumer based on error type          |
| **Behavioral**     | Command                 | RabbitMQ messages as serialized commands                     |
| **Behavioral**     | Chain of Responsibility | NestJS Pipeline (Guards → Pipes → Controllers)               |
| **Behavioral**     | State                   | `AppointmentStatus` transitions with validation              |
| **Behavioral**     | Template Method         | Base flow for message processing                             |
| **Behavioral**     | Mediator                | NestJS Modules as dependency coordinators                    |

> **Complete reference:** See `assets/docs/architecture-patterns-catalog.md` for definitions, code examples, and technical justifications for each pattern.

### Conventions

- Add `// HUMAN CHECK` on each layer separation decision.
- Document which pattern is used and why in each file with a `// Pattern: <name> — <justification>` comment.
- Descriptive port names: `AppointmentRepository`, `MessagePublisher`, `NotificationGateway`.

## Tools Permitted

- **Read/Write:** Files within the defined scope in `backend/*/src/` and `frontend/src/`
- **Explore:** `grep`/`glob` to detect prohibited imports crossing layers
- **Terminal:** `npm run build`, `npm run test`, `npm run lint`

## Workflow

### Step 1 — Coupling Diagnosis

```bash
# Detect infrastructure imports in business logic
grep -rn "import.*mongoose\|import.*@nestjs\|import.*amqplib" backend/*/src/
```

### Step 2 — Define ports (interfaces)

Create interfaces in `domain/ports/` before moving code:

```typescript
// domain/ports/outbound/appointment.repository.ts
export interface AppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findByIdCard(idCard: number): Promise<Appointment | null>;
  findPending(): Promise<Appointment[]>;
}
```

### Step 3 — Extract domain entities

Move entities from Mongoose schemas to pure classes in `domain/entities/`:

```typescript
// domain/entities/appointment.entity.ts
// Pattern: Entity — Domain class without infrastructure dependencies
export class Appointment {
  constructor(
    public readonly idCard: number,
    public readonly fullName: string,
    public readonly priority: Priority,
    public status: AppointmentStatus = AppointmentStatus.PENDING,
  ) {}
}
```

### Step 4 — Create adapters

Implement the ports with concrete technologies:

```typescript
// infrastructure/persistence/mongoose-appointment.repository.ts
// Pattern: Adapter + Repository — Implements the port with Mongoose
@Injectable()
export class MongooseAppointmentRepository implements AppointmentRepository {
  constructor(
    @InjectModel("Appointment") private model: Model<AppointmentDocument>,
  ) {}

  async save(appointment: Appointment): Promise<Appointment> {
    const doc = await this.model.create(appointment);
    return this.toDomain(doc);
  }
}
```

### Step 5 — Verify isolation

```bash
# The domain MUST NOT have infrastructure imports
grep -rn "import.*mongoose\|import.*@nestjs\|import.*amqplib" backend/*/src/domain/
# Expected result: 0 matches
```

### Step 6 — Pure unit tests

Tests should mock outbound ports, not concrete implementations.

### Step 7 — Action Summary

Deliver summary using `skills/action-summary-template.md`.

## Assets

- `assets/templates/hexagonal-structure.md` — Reference directory structure
- `assets/docs/solid-checklist.md` — SOLID verification checklist per component
- `assets/docs/architecture-patterns-catalog.md` — Complete catalog: 4 architectures + 14 design patterns with examples
