---
name: backend-api (Senior Level)
description: Development of high-performance .NET services, message orchestration, and pure domain logic.
license: "MIT"
---

# Skill: Backend API (Senior Grade)

## Context

This project uses **.NET** services with API + Worker architecture:

- **API:** Receives HTTP commands and persists events in PostgreSQL Event Store + Outbox.
- **Worker:** Reads Outbox and publishes events to RabbitMQ with retry/backoff policies.

## Rules

1. All DTOs must use explicit validation (DataAnnotations/FluentValidation) and centralized request validation.
2. Field naming in **English**: `idCard`, `fullName`, `officeNumber`, `status`.
3. Shared event type: `AppointmentEventPayload`.
4. Every critical decision must include `// HUMAN CHECK` with justification.
5. Services should handle errors explicitly — no silent catches.
6. Worker/dispatcher must use explicit publish/retry strategy:
   - `ack` on success only.
   - `nack(msg, false, false)` for validation errors (no requeue).
   - `nack(msg, false, true)` for transient errors (requeue).

## Tools Permitted

- **Read/Write:** Files within `rlapp-backend/src/Services/WaitingRoom/` and `rlapp-backend/src/BuildingBlocks/`
- **Explore:** Use `grep`/`glob` to locate affected services, controllers, DTOs before changes
- **Terminal:** `dotnet test`, `dotnet build`

## Workflow

1. Read the feedback item and identify affected files.
2. Use `grep` to locate all related components before proposing changes.
3. Consult the one-shot templates in `assets/templates/` for the expected pattern.
4. Implement the change following the rules above.
5. Add `// HUMAN CHECK` where applicable.
6. Return a concise Action Summary (see `skills/action-summary-template.md`).

## Assets

- `assets/templates/service-pattern.ts` — Reference service pattern with race condition prevention
- `assets/docs/ack-nack-strategy.md` — Detailed ack/nack documentation
