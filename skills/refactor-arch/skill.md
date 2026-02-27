---
name: refactor-arch (Senior Level)
description: Advanced refactoring towards Hexagonal Architecture, applying SOLID, design patterns, and technical trade-off analysis.
license: "MIT"
---

# Skill: Architecture Refactoring (Senior Grade)

## TDD as Safety Net (mandatory)

Every refactoring must be backed by tests that guarantee behavior preservation:

1. **Pre-refactor:** Verify that tests covering the current behavior exist. If they do not exist, write them **before** refactoring.
2. **During refactor:** Execute the TDD cycle continuously:
   - **Red:** If new behavior is being added, write the failing test first.
   - **Green:** Implement the minimum change to pass.
   - **Refactor:** Optimize internal structure keeping all tests green.
3. **Post-refactor:** Run the full test suite to confirm no regressions.

> **Anti-pattern:** Refactoring without prior test coverage. Tests are the safety net that enables confident refactoring.

## MC-FIRE: Post-Refactor Test Quality Assessment

After each refactoring, verify that the resulting tests meet these criteria:

| Criterion | Description | Corrective Action |
|---|---|---|
| **Maintainable** | Easy to update when requirements change | Extract reusable factories and helpers |
| **Consistent** | Deterministic results; do not depend on execution order | Eliminate shared state between tests |
| **Fast** | Quick execution; do not block the flow | Replace redundant E2E tests with unit tests |
| **Isolated** | Each test is independent | Reset mocks and state in beforeEach |
| **Readable** | Purpose is clear without additional context | Use AAA pattern (Arrange-Act-Assert) |
| **Expressive** | Names describe expected behavior | `should return error when idCard does not exist` |

> **Rule:** If a test does not meet 4/6 MC-FIRE criteria after the refactor, refactor the test as well.

## Extended DRY Standards

### In Production Code

- Extract common logic into domain services, value objects, or utility functions.
- Identify repeated patterns between adapters and consolidate into abstract base classes.
- Use TypeScript generics to eliminate duplicate implementations.

### In Test Code

- Extract reusable **test factories** in `test/factories/` to create domain entities with default data.
- Centralize **common mocks** in `test/mocks/` to avoid configuration duplication.
- Use **custom render helpers** (frontend) for repeated provider and store configurations.
- Create **mock builders** for complex dependencies that repeat across suites.

```typescript
// Example of reusable factory
// test/factories/appointment.factory.ts
import type { Appointment } from '@/domain/entities/appointment';

export function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'default-id',
    idCard: 12345,
    fullName: 'Test Patient',
    priority: 'NORMAL',
    status: 'PENDING',
    ...overrides,
  };
}
```

## Frontend Refactoring (Next.js)

### Zustand Patterns

When refactoring state management towards Zustand, apply:

| Pattern | Before (anti-pattern) | After (correct) |
|---|---|---|
| Atomic selectors | `const { todos, filter, user } = useStore()` | `const todos = useStore(s => s.todos)` |
| Actions as events | `setTodos([...todos, newTodo])` | `addTodo(newTodo)` |
| State/actions separation | Everything mixed in a flat object | State and actions clearly separated |
| Per-request store (SSR) | Global store in module (singleton) | Store injected via Context per request |

### Clean Architecture in Presentation Layer

When refactoring frontend components, migrate towards layer separation:

```
rlapp-frontend/src/
├── domain/         ← Pure entities and types (no framework dependencies)
├── application/    ← Zustand stores, use cases, orchestration
├── infrastructure/ ← Adapters: fetch, WebSocket, API clients
├── components/     ← Pure React components (typed props only)
├── hooks/          ← Custom hooks (logic composition)
└── app/            ← Next.js pages and layouts (App Router)
```

**Migration rules:**
1. Move types and interfaces to `domain/` if they do not depend on React or Next.js.
2. Move state logic to `application/stores/` as Zustand stores.
3. Move API/WebSocket calls to `infrastructure/`.
4. Components only receive typed props; they do not access infrastructure directly.

### Next.js App Router

When refactoring pages, respect App Router conventions:
- Separate Server Components from Client Components (`'use client'`).
- Move hooks and interactive state to dedicated client components.
- Keep layouts and pages as lightweight as possible (delegating to components).

## Technical Debt Tracking

### Continuous Process

1. **Identification:** During each refactoring, mark detected debt with `// HUMAN CHECK — TECH DEBT: [description]`.
2. **Registration:** Document findings in `DEBT_REPORT.md` with severity, impact, and proposed solution.
3. **Prioritization:** Classify by severity (Critical, High, Medium, Low) and prioritize in the next cycle.
4. **Resolution:** Apply continuous refactoring to prevent accumulation.
5. **Verification:** After resolving, update `DEBT_REPORT.md` marking as Done and log in `AI_WORKFLOW.md`.

### Technical Debt Indicators

| Indicator | Alert Threshold |
|---|---|
| Unresolved cross-layer dependencies | Any import that violates the inward flow rule |
| Duplicated code | More than 3 identical lines in 2+ files |
| Test coverage | Drop below 80% in any module |
| Cyclomatic complexity | Functions with complexity > 10 |
| Pending `// HUMAN CHECK` | More than 5 unresolved in the same module |

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
