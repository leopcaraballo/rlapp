---
name: testing-qa (Senior Level)
description: Technical quality assurance through TDD, high-precision mocking, and validation of critical scenarios.
trigger: When feedback mentions tests, specs, unit testing, mocking, coverage, test failures, or QA validation.
scope: backend/producer/test/, backend/consumer/test/, backend/consumer/src/**/*.spec.ts, backend/producer/src/**/*.spec.ts
author: "Orchestrator Team"
version: "2.1.0 (Senior Grade)"
license: "MIT"
autoinvoke: true
---

# Skill: Testing & QA (Senior Grade)

## Context

The project uses **Jest** with **NestJS Testing Module** for unit tests.

- Producer tests: `backend/producer/test/`
- Consumer tests: `backend/consumer/test/` and `backend/consumer/src/**/*.spec.ts`

## Rules

1. Every spec file must use `Test.createTestingModule()` with properly typed mocks.
2. Mock external dependencies (MongoDB models, RabbitMQ clients) — never hit real services.
3. Use `jest.fn()` for method mocks and type them correctly.
4. Test both success and error paths (especially ack/nack in Consumer).
5. File naming: `<service-name>.spec.ts` co-located with the source, or in `test/`.
6. Maintain coverage target >=90% per suite; if lower, add focused tests before merging.
7. Add `// HUMAN CHECK` for test scenarios that verify business-critical logic.
8. Forbidden: `any` in tests or mocks; type everything explicitly.

## Planning and Governance

- Define scope, risks, and entry/exit criteria for each cycle; track metrics (coverage, pass rate, defect reopen rate).
- Participate in agile ceremonies (inception, refinement, planning, dailies, reviews, retros) to surface quality risks early.
- Map critical paths and regression packs to ensure they stay automated.

## Verification (Shift-left)

- Review requirements with INVEST; clarify acceptance criteria and edge cases before coding.
- Inspect design/docs for testability, observability, and failure modes; raise gaps early.
- Perform preventive analysis of logic branches to reduce late defects.

## Test Design and Environments

- Levels: unit (fast, pure functions), integration (modules/adapters), e2e (API→queue→consumer→DB), regression (automated), acceptance/UAT (business flow).
- Automation selection: prioritize regression, critical paths, and repeatable flows; keep exploratory/manual for UX and rare edge cases.
- Sprint 0 readiness: ensure test env, seeds, and mocks/factories exist before building cases.

## Execution and Quality Control

- Commands: `npm run test`, `npm run test -- --coverage`, `npm run test -- --testPathPattern=<file>`.
- Defect workflow: reproduce → file with steps/data → fix → re-test → regression pass.
- Always re-test fixed bugs and run smoke/regression pack on impacted areas.
- Monitor coverage threshold (>=90%) and failing assertions; block merge if unmet.

## Validation (Build the right product)

- Confirm acceptance criteria and UAT flows; validate happy path and negative paths from user perspective.
- Basic UX/compatibility checks: critical flows on main browsers/devices when applicable.

## Specialized Testing (triggers)

- Performance/load when throughput or latency risks appear.
- Security when handling auth, sensitive data, or exposed endpoints.
- Usability/accessibility when UI/flows change materially.

## Continuous Improvement

- Share findings in reviews/retros; log recurring defects and propose preventive actions.
- Update checklists/templates when new patterns emerge; keep regression pack current.

## Tools Permitted

- **Read/Write:** Spec files within `backend/*/test/` and `backend/*/src/**/*.spec.ts`
- **Explore:** Use `grep` to find untested services and existing mock patterns
- **Terminal:** `npm run test`, `npm run test -- --coverage`, `npm run test -- --testPathPattern=<file>`

## Workflow

1. Identify what needs testing from the feedback.
2. Use `grep` to find existing test patterns and mock factories.
3. Consult `assets/templates/` for the reference mocking pattern.
4. Write the test following the rules above.
5. Verify: `npm run test -- --testPathPattern=<file>`.
6. Return Action Summary (see `skills/action-summary-template.md`).

## Assets

- `assets/templates/spec-pattern.ts` — Reference NestJS spec with Mongoose mocking
- `assets/docs/mocking-guide.md` — Mock factory patterns for common providers
