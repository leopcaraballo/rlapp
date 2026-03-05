# Architecture Decision Records (ADRs)

## Overview

This directory contains Architecture Decision Records (ADRs) documenting key architectural decisions for the appointment management system.

ADRs are concise records that capture important architectural decisions, their context, alternatives considered, and consequences. They serve as:

- **Design documentation** for team alignment
- **Decision rationale** explaining why choices were made
- **Change tracking** for architectural evolution
- **Knowledge base** for onboarding new team members

## What is an ADR?

An Architecture Decision Record is a short text file in Markdown describing a set of architecturally significant requirements and the decision that was made to address them.

Each ADR typically includes:

- **Status**: Proposed, Accepted, Deprecated, or Superseded
- **Context**: The issue or problem driving the decision
- **Decision**: What was decided and why
- **Consequences**: Trade-offs and implications
- **References**: Links to related code, issues, or documents

## Current Decisions (Status: ACCEPTED)

| ID                      | Title                                                    | Status   | Date       |
| ----------------------- | -------------------------------------------------------- | -------- | ---------- |
| [ADR-001](./ADR-001.md) | Hexagonal Architecture + Domain-Driven Design (Tactical) | ACCEPTED | 2026-02-20 |
| [ADR-002](./ADR-002.md) | Event-Driven Architecture + RabbitMQ                     | ACCEPTED | 2026-02-20 |
| [ADR-003](./ADR-003.md) | Policy Pattern for Business Rules                        | ACCEPTED | 2026-02-20 |
| [ADR-004](./ADR-004.md) | MongoDB (NoSQL) for Appointment Storage                  | ACCEPTED | 2026-02-20 |
| [ADR-005](./ADR-005.md) | Domain Events for Inter-Service Communication            | ACCEPTED | 2026-02-20 |

## Decision Timeline

### Phase 1: Foundation (Application Layer)

- **ADR-001**: Hexagonal Architecture provides the structural foundation
- **ADR-003**: Policy Pattern enables scalable rule management
- **ADR-004**: MongoDB selection for flexible data storage

### Phase 2: Distribution (Integration Layer)

- **ADR-002**: Event-Driven Architecture enables service decoupling
- **ADR-005**: Domain Events implement the event publishing mechanism

## Guidelines for Adding New ADRs

### 1. When to Create an ADR

Create an ADR when:

- Making architectural decisions affecting multiple components
- Choosing between significant alternatives
- Documenting non-obvious design choices
- Recording decisions that could be revisited

Do NOT create ADRs for:

- Minor implementation details
- Temporary spike solutions
- Decisions easily reversible without impact

### 2. ADR Numbering

- Use sequential numbers: ADR-001, ADR-002, etc.
- Do NOT reuse numbers of deprecated ADRs
- Reference superseding ADRs if replacing existing decisions

### 3. Status Values

- **PROPOSED**: Under discussion, not yet decided
- **ACCEPTED**: Decided and being implemented/implemented
- **DEPRECATED**: No longer applicable but kept for reference
- **SUPERSEDED**: Replaced by another ADR (reference new ADR)

### 4. Writing Style

- **Concise**: 1-2 pages, focus on essentials
- **Decision-first**: Lead with the decision, context before
- **Balanced**: Acknowledge trade-offs honestly
- **Technical**: Assume readers understand the domain
- **Immutable**: Avoid editing accepted ADRs (create new one if needed)

### 5. Structure Template

Use [ADR-template.md](./templates/ADR-template.md) as reference.

## Architectural Patterns Reference

### Layered Architecture (Our Stack)

```
┌─────────────────────────────────────┐
│  Infrastructure Layer               │  External Services, DB, Message Queue
├─────────────────────────────────────┤
│  Application Layer                  │  Use Cases, DTOs, Mappers
├─────────────────────────────────────┤
│  Domain Layer                       │  Entities, Value Objects, Policies
└─────────────────────────────────────┘
```

**Related ADRs**: ADR-001 (Hexagonal), ADR-003 (Policies)

### Event-Driven Integration

```
Producer (REST API)              Consumer (Workers)
      │                                 │
      └──→ Domain Events (RabbitMQ) ←──┘
          - AppointmentCreated
          - AppointmentUpdated
          - AppointmentCancelled
```

**Related ADRs**: ADR-002 (Event-Driven), ADR-005 (Domain Events)

## Cross-ADR Dependencies

```
ADR-001 (Hexagonal) ──┐
                      ├─→ ADR-003 (Policies) ─┐
                      │                         ├─→ Use Cases
                      └─→ ADR-005 (Events) ───┘

ADR-002 (Event-Driven) ──→ ADR-005 (Domain Events)
                              ↓
                        RabbitMQ Integration

ADR-004 (MongoDB) ──→ Domain Entities (ADR-001)
```

## Key Architecture Files

| File                                   | Purpose                           | Related ADR      |
| -------------------------------------- | --------------------------------- | ---------------- |
| `backend/producer/src/domain/`         | Domain layer (entities, policies) | ADR-001, ADR-003 |
| `backend/producer/src/application/`    | Use case layer                    | ADR-001          |
| `backend/producer/src/infrastructure/` | Technical layer (DB, API)         | ADR-001, ADR-004 |
| `backend/producer/src/events/`         | Domain events                     | ADR-005          |
| `docker-compose.yml`                   | Infrastructure setup              | ADR-002, ADR-004 |

## References

- **Domain-Driven Design**: Evans, E. (2003). _Tackling Complexity in the Heart of Software_
- **Hexagonal Architecture**: Cockburn, A. (2005). _Ports and Adapters_
- **Event-Driven Architecture**: Newman, S. (2015). _Building Microservices_
- **SOLID Principles**: Martin, R. C. (2009). _Clean Architecture_
- **Policy Pattern**: Gang of Four (1994). _Design Patterns: Elements of Reusable Object-Oriented Software_

## Related Documentation

- [DEBT_REPORT.md](../DEBT_REPORT.md) - Technical debt tracking
- [PROJECT_CONTEXT.md](../agent-context/PROJECT_CONTEXT.md) - Project overview
- [RULES.md](../agent-context/RULES.md) - Operational guidelines

## Revision History

| Date       | Author   | Change                                         |
| ---------- | -------- | ---------------------------------------------- |
| 2026-02-20 | AI Agent | Initial ADR documentation (ADR-001 to ADR-005) |

---

**Last Updated**: 2026-02-20  
**Status**: Active  
**Total ADRs**: 5 (5 Accepted, 0 Proposed, 0 Deprecated)
