---
name: backend-api (Senior Level)
description: Development of high-performance NestJS microservices, message orchestration, and pure domain logic.
license: "MIT"
---

# Skill: Backend API (Senior Grade)

## Context

This project uses **NestJS** with two microservices:

- **Producer:** REST API + WebSocket Gateway. Receives appointment requests and publishes to RabbitMQ.
- **Consumer:** Listens to RabbitMQ queue, persists to MongoDB, and runs a Scheduler to assign offices.

## Rules

1. All DTOs must use `class-validator` decorators with `ValidationPipe` globally enabled.
2. Field naming in **English**: `idCard`, `fullName`, `officeNumber`, `status`.
3. Shared event type: `AppointmentEventPayload`.
4. Every critical decision must include `// HUMAN CHECK` with justification.
5. Services should handle errors explicitly — no silent catches.
6. Consumer must use explicit `ack`/`nack` strategy:
   - `ack` on success only.
   - `nack(msg, false, false)` for validation errors (no requeue).
   - `nack(msg, false, true)` for transient errors (requeue).

## Tools Permitted

- **Read/Write:** Files within `backend/producer/src/` and `backend/consumer/src/`
- **Explore:** Use `grep`/`glob` to locate affected services, controllers, DTOs before changes
- **Terminal:** `npm run test`, `npm run lint`, `npm run build` (within `backend/producer` or `backend/consumer`)

## Workflow

1. Read the feedback item and identify affected files.
2. Use `grep` to locate all related components before proposing changes.
3. Consult the one-shot templates in `assets/templates/` for the expected pattern.
4. Implement the change following the rules above.
5. Add `// HUMAN CHECK` where applicable.
6. Return a concise Action Summary (see `skills/action-summary-template.md`).

## Assets

- `assets/templates/service-pattern.ts` — Reference NestJS service with race condition prevention
- `assets/docs/ack-nack-strategy.md` — Detailed ack/nack documentation
