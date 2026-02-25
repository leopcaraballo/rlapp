---
name: docker-infra (Senior Level)
description: Resilient infrastructure orchestration, image optimization, and deployment security.
license: "MIT"
---

# Skill: Docker & Infrastructure (Senior Grade)

## Context

The project runs 5 services via Docker Compose:

- `producer` (NestJS, port 3000)
- `consumer` (NestJS, no external port)
- `frontend` (Next.js, port 3001)
- `rabbitmq` (Management UI on 15672)
- `mongodb` (port 27017)

## Rules

1. **Never hardcode credentials.** Always use `${VAR:-default}` with `.env`.
2. Every service MUST have a `healthcheck` definition.
3. Use `depends_on` with `condition: service_healthy` (not just `service_started`).
4. Development-only configs (volumes, `start:dev`) must have `// HUMAN CHECK` noting removal for production.
5. Management ports (RabbitMQ 15672, MongoDB 27017) must note they should NOT be exposed in production.
6. Use named networks (`app-network`) and named volumes.

## Tools Permitted

- **Read/Write:** `docker-compose.yml`, `.env`, `.env.example`, `Dockerfile` in backend/frontend
- **Explore:** Use `grep` to find hardcoded credentials, exposed ports, missing healthchecks
- **Terminal:** `docker compose config`, `docker compose up --build --dry-run`

## Workflow

1. Identify the infrastructure issue from the feedback.
2. Use `grep` to scan for affected patterns across Docker files.
3. Consult `assets/templates/` for reference patterns.
4. Apply changes and add `// HUMAN CHECK` for security-sensitive changes.
5. Return Action Summary (see `skills/action-summary-template.md`).

## Assets

- `assets/templates/healthcheck-pattern.yml` — Reference healthcheck configuration
- `assets/docs/production-hardening.md` — Checklist for production deployment
