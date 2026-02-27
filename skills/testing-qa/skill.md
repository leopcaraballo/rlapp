---
name: testing-qa (Senior Level)
description: Technical quality assurance through TDD, high-precision mocking, and validation of critical scenarios.
license: "MIT"
---

# Skill: Testing & QA (Senior Grade)

## TDD Methodology (mandatory)

All development and refactoring strictly follows **Test-Driven Development (TDD)**:

1. **Red Phase:** Write a failing test that defines the desired behavior based on the Acceptance Criteria (AC).
2. **Green Phase:** Implement the minimum amount of code necessary for the test to pass.
3. **Refactor Phase:** Optimize the code, eliminate duplication, and align with design patterns, keeping all tests green.

> **Anti-pattern:** Writing production code before having a failing test to back it up.
> **Anti-pattern:** Skipping the Refactor phase after achieving green.

## Requirements Structure (Given-When-Then)

Every testing task must start from structured requirements:

- **User Stories (US):** In the format "As a [role], I want [action], so that [benefit]".
- **Acceptance Criteria (AC):** Use the **Given-When-Then (GWT)** format as the starting point for designing tests:
  - **Given:** Initial context and preconditions (DB state, active mocks, initialized store).
  - **When:** User action or system event.
  - **Then:** Expected result verifiable through assertion.

```gherkin
# Example AC for backend service
Given an appointment with idCard 12345 exists in the database
When the findByIdCard(12345) method is invoked
Then the appointment with PENDING status is returned

# Example AC for frontend component
Given the store contains 3 appointments with PENDING status
When the user navigates to /dashboard
Then 3 visible appointment cards are rendered on screen
```

## AAA Pattern (Arrange-Act-Assert)

Structure **every** test by organizing the environment, executing the action, and asserting the results:

```typescript
describe('AppointmentService', () => {
  it('should return the appointment when idCard exists', async () => {
    // Arrange — Set up environment and preconditions
    const mockRepo = { findByIdCard: jest.fn().mockResolvedValue(mockAppointment) };
    const service = new AppointmentService(mockRepo);

    // Act — Execute the action under test
    const result = await service.findByIdCard(12345);

    // Assert — Verify expected results
    expect(result).toEqual(mockAppointment);
    expect(mockRepo.findByIdCard).toHaveBeenCalledWith(12345);
  });
});
```

> **Rule:** Do not mix multiple unrelated actions or assertions in the same Act/Assert block.

## Context

The project uses **Jest** with **NestJS Testing Module** for backend unit tests and **React Testing Library (RTL)** for frontend tests.

### Backend

- Producer tests: `rlapp-backend/src/Tests/`
- Consumer tests: `rlapp-backend/src/Tests/` and `rlapp-backend/src/**/*.spec.ts`

### Frontend (Next.js)

- Unit/Integration tests: `rlapp-frontend/test/`
- E2E tests: `rlapp-frontend/test/e2e/`
- Mocks: `rlapp-frontend/test/mocks/`
- Factories: `rlapp-frontend/test/factories/`

## Rules

1. Every spec file must use `Test.createTestingModule()` with properly typed mocks (backend).
2. Mock external dependencies (MongoDB models, RabbitMQ clients) — never hit real services.
3. Use `jest.fn()` for method mocks and type them correctly.
4. Test both success and error paths (especially ack/nack in Consumer).
5. File naming: `<service-name>.spec.ts` co-located with the source, or in `test/`.
6. Maintain coverage target >=90% per suite; if lower, add focused tests before merging.
7. Add `// HUMAN CHECK` for test scenarios that verify business-critical logic.
8. Forbidden: `any` in tests or mocks; type everything explicitly.

## Frontend Testing (Next.js)

### Tools by Test Level

| Level | Tool | Purpose | Location |
|---|---|---|---|
| **Unit** | Jest + React Testing Library (RTL) | Isolated components, hooks, Zustand stores | `rlapp-frontend/test/` |
| **Integration** | Jest + RTL + MSW | Flows with network-level mocked API calls | `rlapp-frontend/test/` |
| **E2E** | Playwright | Complete user flows against production build | `rlapp-frontend/test/e2e/` |

### Mock Service Worker (MSW)

Intercept API calls at the network level for isolated and realistic tests without depending on real servers:

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/appointments', () => {
    return HttpResponse.json([
      { id: '1', fullName: 'Juan Perez', status: 'PENDING' },
    ]);
  }),
  http.post('/api/appointments', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '2', ...body }, { status: 201 });
  }),
];
```

### Next.js Mocking

Mock Next.js modules to validate redirects, parameters, and navigation:

```typescript
// test/mocks/next-navigation.ts
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

> **Alternative:** Use `next-router-mock` for more complex navigation tests.

### Zustand Store Testing

Patterns for testing stores and selectors in isolation:

```typescript
// test/stores/appointment.store.test.ts
import { useAppointmentStore } from '@/application/stores/appointment.store';
import { buildAppointment } from '../factories/appointment.factory';

describe('useAppointmentStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAppointmentStore.setState({ appointments: [], isLoading: false });
  });

  it('should add an appointment to the store', () => {
    // Arrange
    const appointment = buildAppointment({ fullName: 'Maria Lopez' });

    // Act
    useAppointmentStore.getState().addAppointment(appointment);

    // Assert
    const { appointments } = useAppointmentStore.getState();
    expect(appointments).toHaveLength(1);
    expect(appointments[0].fullName).toBe('Maria Lopez');
  });
});
```

### Playwright for E2E

Always run against the production build to avoid dev server false positives:

```typescript
// test/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard displays pending appointments', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  await expect(page.locator('[data-testid="appointment-card"]')).toHaveCount(3);
});
```

## MC-FIRE: Test Quality Assessment

After each implementation or refactoring, verify that tests meet these criteria:

| Criterion | Description | Failure Indicator |
|---|---|---|
| **Maintainable** | Easy to update when requirements change | Test requires changes in 3+ places for a simple adjustment |
| **Consistent** | Deterministic results; do not depend on execution order | Test passes/fails intermittently |
| **Fast** | Quick execution; do not block the development flow | Suite takes more than 30s to execute |
| **Isolated** | Each test is independent; does not share mutable state | Test fails when run alone but passes in full suite |
| **Readable** | Purpose is clear without additional context | Reading production code is required to understand the test |
| **Expressive** | Names describe the expected behavior | Generic name like "test1" or "should work" |

> **Rule:** If a test does not meet 4/6 MC-FIRE criteria, it must be refactored before approving the merge.

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

- **Read/Write:** Spec files within `rlapp-backend/src/Tests/`, `rlapp-backend/src/**/*.spec.ts`, `rlapp-frontend/test/`, and `rlapp-frontend/src/**/*.test.{ts,tsx}`
- **Explore:** Use `grep` to find untested services, existing mock patterns, and coverage gaps
- **Terminal (backend):** `npm run test`, `npm run test -- --coverage`, `npm run test -- --testPathPattern=<file>`
- **Terminal (frontend):** `npm run test`, `npm run test -- --coverage`, `npx playwright test` (within `rlapp-frontend/`)

## Workflow

1. Identify the task from the US and AC in GWT format.
2. **Red Phase:** Write the failing test that reflects the AC (AAA pattern).
3. Use `grep` to find existing test patterns, mock factories, and coverage gaps.
4. Consult `assets/templates/` for the reference mocking pattern.
5. **Green Phase:** Implement the minimum code to pass the test.
6. **Refactor Phase:** Optimize test and code, evaluate with MC-FIRE.
7. Verify: `npm run test -- --testPathPattern=<file>` and `npm run test -- --coverage`.
8. Return Action Summary (see `skills/action-summary-template.md`).

## Assets

- `assets/templates/spec-pattern.ts` — Reference NestJS spec with Mongoose mocking
- `assets/docs/mocking-guide.md` — Mock factory patterns for common providers
