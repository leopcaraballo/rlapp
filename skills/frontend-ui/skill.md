---
name: frontend-ui (Senior Level)
description: High-performance interfaces, accessibility (A11y), and reactive and decoupled state management.
license: "MIT"
---

# Skill: Frontend & UI (Senior Grade)

## Context

The frontend is a **Next.js** (App Router) application that:

- Displays a real-time dashboard of medical appointments.
- Connects to the Producer via **WebSocket** (Socket.IO) for live updates.
- Uses **CSS Modules** (`page.module.css`) exclusively — no external CSS frameworks.

## Rules

1. **No Tailwind, Bootstrap, or external CSS.** Only `page.module.css` per page/component.
2. Use `'use client'` directive for components that use hooks or browser APIs.
3. WebSocket connection must use `NEXT_PUBLIC_WS_URL` env var.
4. Component naming in **English** with PascalCase.
5. Types must align with `AppointmentEventPayload` from the backend.
6. Add `// HUMAN CHECK` for business logic decisions in the UI.

## TDD Methodology (mandatory)

Frontend development strictly follows **Test-Driven Development (TDD)**:

1. **Red Phase:** Write a failing test that defines the desired behavior based on the Acceptance Criteria (AC).
2. **Green Phase:** Implement the minimum amount of code necessary for the test to pass.
3. **Refactor Phase:** Optimize the code, eliminate duplication, and align with design patterns, keeping all tests green.

> **Anti-pattern:** Writing production code before having a failing test to back it up.

## Requirements Structure

Every frontend task must start from structured requirements:

- **User Stories (US):** In the format "As a [role], I want [action], so that [benefit]".
- **Acceptance Criteria (AC):** Use the **Given-When-Then (GWT)** format to capture dynamic flows:
  - **Given:** Initial context and preconditions (store state, mocked data, active route).
  - **When:** User action (click, navigation, text input, WebSocket event).
  - **Then:** Expected result or visual effect (rendering, state update, redirect).

```gherkin
# Example AC for dashboard component
Given the store contains 3 appointments with PENDING status
When the user navigates to /dashboard
Then 3 appointment cards with the .pendingCard class are rendered
```

## Clean Architecture (Frontend)

Apply layer separation to maintain scalability and testability:

```
rlapp-frontend/src/
├── domain/              ← Entities, interfaces, pure types (no framework dependencies)
├── application/         ← Orchestration logic, use cases, stores (Zustand)
├── infrastructure/      ← Adapters: fetch, WebSocket, localStorage, API clients
├── components/          ← Pure React components (presentation)
├── hooks/               ← Custom hooks (logic composition)
├── app/                 ← Next.js pages and layouts (App Router)
├── config/              ← Environment configuration
└── styles/              ← CSS Modules per component/page
```

### Layer Separation Rules

1. **domain/** CANNOT import from `infrastructure/`, `next/*`, or external libraries.
2. **application/** can import from `domain/` but NOT from `infrastructure/`.
3. **infrastructure/** implements the interfaces defined in `domain/`.
4. **components/** only receive typed props; they do not access infrastructure directly.
5. Dependency flow: `app → components → hooks → application → domain`.

## State Management with Zustand

### Mandatory Best Practices

| Practice | Description | Example |
|---|---|---|
| **Atomic selectors** | Use specific selectors to avoid unnecessary re-renders | `useTodoStore(state => state.todos)` |
| **Action separation** | Organize the store separating state from functions (actions) | `{ todos: [], addTodo: () => {} }` |
| **Actions as events** | Actions must capture business logic, not be generic setters | `addTodo(text)` instead of `setTodos(newArray)` |
| **Per-request store (SSR)** | Avoid global stores shared across server requests | Use Context API to inject the store per client/request |

### Recommended Store Pattern

```typescript
// application/stores/appointment.store.ts
// Pattern: Zustand Store — Atomic selectors + actions as events
import { create } from 'zustand';
import type { Appointment } from '@/domain/entities/appointment';

interface AppointmentState {
  appointments: Appointment[];
  isLoading: boolean;
}

interface AppointmentActions {
  addAppointment: (appointment: Appointment) => void;
  removeAppointment: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppointmentStore = create<AppointmentState & AppointmentActions>(
  (set) => ({
    // State
    appointments: [],
    isLoading: false,
    // Actions as events
    addAppointment: (appointment) =>
      set((state) => ({ appointments: [...state.appointments, appointment] })),
    removeAppointment: (id) =>
      set((state) => ({
        appointments: state.appointments.filter((a) => a.id !== id),
      })),
    setLoading: (loading) => set({ isLoading: loading }),
  }),
);
```

### Safe Hydration in Next.js

```typescript
// components/providers/StoreProvider.tsx
// Pattern: Context Provider — Per-request store to prevent hydration errors
'use client';

import { createContext, useContext, useRef } from 'react';
import { useAppointmentStore } from '@/application/stores/appointment.store';

const StoreContext = createContext<typeof useAppointmentStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef(useAppointmentStore);
  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  );
}
```

## Frontend Testing Strategy and Tools

### AAA Pattern (Arrange-Act-Assert)

Structure each test by organizing the environment, executing the action, and asserting the results:

```typescript
// test/components/AppointmentCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppointmentCard } from '@/components/AppointmentCard';
import { buildAppointment } from '../factories/appointment.factory';

describe('AppointmentCard', () => {
  it('should display the patient name when rendered', () => {
    // Arrange
    const appointment = buildAppointment({ fullName: 'Juan Perez' });

    // Act
    render(<AppointmentCard appointment={appointment} />);

    // Assert
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
  });
});
```

### Tools by Test Level

| Level | Tool | Purpose |
|---|---|---|
| **Unit** | Jest + React Testing Library (RTL) | Isolated components, hooks, stores |
| **Integration** | Jest + RTL + MSW | Flows with mocked API calls |
| **E2E** | Playwright | Complete user flows against production build |

### Mock Service Worker (MSW)

Intercept API calls at the network level for isolated and realistic tests:

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/appointments', () => {
    return HttpResponse.json([
      { id: '1', fullName: 'Juan Perez', status: 'PENDING' },
    ]);
  }),
];
```

### Next.js Mocking

Mock Next.js modules to validate redirects and parameters:

```typescript
// test/mocks/next-navigation.ts
// Mock next/navigation for unit tests
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

### Playwright for E2E

```typescript
// test/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard displays pending appointments', async ({ page }) => {
  // Always run against production build to avoid dev server false positives
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  await expect(page.locator('[data-testid="appointment-card"]')).toHaveCount(3);
});
```

## Frontend Refactoring Standards

### MC-FIRE: Test Quality Assessment

After each refactoring, verify that tests meet these criteria:

| Criterion | Description |
|---|---|
| **Maintainable** | Tests are easy to update when requirements change |
| **Consistent** | Deterministic results; do not depend on execution order |
| **Fast** | Quick execution; do not block the development flow |
| **Isolated** | Each test is independent; does not share mutable state |
| **Readable** | The test purpose is clear without additional context |
| **Expressive** | Test names describe the expected behavior |

### DRY in Production and Test Code

- Extract reusable test factories in `test/factories/`.
- Centralize common mocks in `test/mocks/`.
- Use custom render helpers for repeated provider configurations.
- Eliminate redundant logic in production code during the Refactor phase of the TDD cycle.

### Technical Debt Tracking

- Mark with `// HUMAN CHECK — TECH DEBT:` any pending refactoring detected.
- Log findings in `DEBT_REPORT.md` for systematic follow-up.
- Prioritize duplication elimination before adding new functionality.

## Tools Permitted

- **Read/Write:** Files within `rlapp-frontend/src/` and `rlapp-frontend/test/`
- **Explore:** Use `grep`/`glob` to locate components, styles, stores, and WebSocket handlers
- **Terminal:** `npm run dev`, `npm run build`, `npm run lint`, `npm run test`, `npx playwright test` (within `rlapp-frontend/`)

## Workflow

1. Identify the task from the US and AC in GWT format.
2. **Red Phase:** Write the failing test that reflects the AC.
3. Use `grep` to find all affected components, styles, and stores.
4. Consult `assets/templates/` for the expected component pattern.
5. **Green Phase:** Implement the minimum code to pass the test using CSS Modules and Zustand.
6. **Refactor Phase:** Optimize, apply DRY, and evaluate with MC-FIRE.
7. Ensure WebSocket events use the correct payload types.
8. Validate: `npm run test`, `npm run lint`, `npm run build`.
9. Return Action Summary (see `skills/action-summary-template.md`).

## Assets

- `assets/templates/page-pattern.tsx` — Reference Next.js page with CSS Modules
- `assets/docs/css-modules-conventions.md` — CSS Modules naming and structure
