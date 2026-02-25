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

## Tools Permitted

- **Read/Write:** Files within `frontend/src/`
- **Explore:** Use `grep`/`glob` to locate components, styles, and WebSocket handlers
- **Terminal:** `npm run dev`, `npm run build`, `npm run lint` (within `frontend/`)

## Workflow

1. Identify the UI issue from the feedback.
2. Use `grep` to find all affected components and styles.
3. Consult `assets/templates/` for the expected component pattern.
4. Implement the change using CSS Modules.
5. Ensure WebSocket events use the correct payload types.
6. Return Action Summary (see `skills/action-summary-template.md`).

## Assets

- `assets/templates/page-pattern.tsx` — Reference Next.js page with CSS Modules
- `assets/docs/css-modules-conventions.md` — CSS Modules naming and structure
