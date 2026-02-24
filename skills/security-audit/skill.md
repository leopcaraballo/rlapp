---
name: "security-audit"
description: "Offensive and defensive security auditing, vulnerability analysis (OWASP), infrastructure hardening, and secrets management."
trigger: "When feedback mentions security, vulnerabilities, audit, authentication, authorization, OWASP, secrets, certificates, encryption, or pen-testing."
scope: "backend/producer/src/, backend/consumer/src/, frontend/src/, docker-compose.yml, .env.example"
author: "Orchestrator Team"
version: "1.0.0 (Elite Grade)"
license: "MIT"
autoinvoke: true
---

# Skill: Security Audit (Elite Grade)

## Context

This project handles patient data and asynchronous communication. Security is critical to ensure the privacy and integrity of medical appointments.

## Rules

1. **Zero Trust**: Never assume that the internal Docker network is secure.
2. **Secret Management**: Secrets MUST NEVER be in the code. Verify `.env.example`.
3. **OWASP Top 10**: Validate against injection, broken authentication, and sensitive data exposure.
4. **Least Privilege**: Containers and processes must run with the minimum necessary permissions.
5. **Human Check**: Every security change requires `// HUMAN CHECK`.

## Tools Permitted

- **Explore**: `grep` to search for hardcoded secrets or insecure patterns.
- **Terminal**: `npm audit`, `snyk` (if available), `docker scan`.

## Workflow

1. **Static Analysis**: Search for secrets, misconfigured CORS, or missing security headers.
2. **Logic Audit**: Verify that Use Cases validate data ownership and permissions.
3. **Infra Hardening**: Review exposed ports and Docker privileges.
4. **Report**: Generate a `SECURITY_AUDIT.md` using the template in `assets/templates/`.

## Assets

- `assets/templates/security-audit-report.md` — Professional structure for findings.
- `assets/docs/security-check-list.md` — Quick hardening checklist.
