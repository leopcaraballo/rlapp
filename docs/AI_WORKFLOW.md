## AI_WORKFLOW Log

### 2026-03-02 — TDD dashboard (RED+REFACTOR)

- Actor: AI assistant (Copilot)
- Task: Ciclo TDD para la pantalla `/dashboard`; cobertura de título, tres secciones (En consultorio / En espera / Completados), empty states, isConnecting, error, y cita por cada estado.
- Files changed:
  - rlapp-frontend/test/app/dashboard/page.red.spec.tsx (nuevo — 12 pruebas)
- Commits atómicos:
  - `test(dashboard): red - título, secciones, empty states, isConnecting, error y citas por estado (12/12)` (incluye refactor)

- Actions performed:
  1. RED: se crearon 12 pruebas para `CompletedHistoryDashboard`, que es un wrapper delgado sobre `RealtimeAppointments`. Se mockearon `useQueueAsAppointments` y `audioService` para control total sin efectos secundarios. Producción correcta en 12/12 desde el inicio.
  2. REFACTOR: se aplicó `it.each` a los empty states (tests 5-7) y a las citas por estado (tests 10-12). El resultado fue incluido en el commit RED por haber sido aplicado antes del staging.

- Patrones consolidados:
  - `makeAppointment(overrides)` como factory tipada para construir fixtures de `Appointment` en un paso.
  - `it.each` con `{ label, texto/status, fullName }` para parametrizar variantes homogéneas.
  - Mock de `audioService` con `jest.mock` para evitar errores de HTMLAudioElement en jsdom.

- Notes / Human checks:
  - No se detectó deuda técnica; sin cambios en producción.

### 2026-03-02 — TDD waiting-room (RED, sin refactor pendiente)

- Actor: AI assistant (Copilot)
- Task: Ciclo TDD para la pantalla `/waiting-room/[queueId]`; cobertura de queueId en cabecera, refresh al montar, cuatro cards en estado null y con datos, links de acciones rápidas con queueId codificado, y botón Reconstruir (POST + refresh).
- Files changed:
  - rlapp-frontend/test/app/waiting-room/page.red.spec.tsx (nuevo — 12 pruebas)
- Commits atómicos:
  - `test(waiting-room): red - queueId, refresh mount, cards null/datos, links queueId, rebuild POST (12/12)`

- Actions performed:
  1. RED: se crearon 12 pruebas sincrónicas. La producción era correcta en todos los casos (12/12 desde el inicio). Casos cubiertos: queueId en `<h1>`, `useEffect → refresh()` al montar, `MonitorCard`/`QueueStateCard`/`NextTurnCard`/`RecentHistory` en estado null y con datos, hrefs de links de acciones rápidas con `encodeURIComponent(queueId)`, y botón Reconstruir que hace `POST /api/v1/waiting-room/{queueId}/rebuild` y llama `refresh`.
  2. REFACTOR: no aplicado — los tests son concisos y no presentan duplicación estructural explotable con `it.each` (cada card null state tiene texto y variable de mock diferente).

- Patrones reutilizados:
  - `jest.spyOn(React, "use").mockImplementation((_) => mockParams as any)` para `params: Promise<T>`.
  - `server.use(http.post(...))` ad-hoc para handler MSW del endpoint de rebuild.
  - `userEvent.setup()` + `waitFor` para el botón asíncrono.

- Notes / Human checks:
  - No se detectó deuda técnica; sin cambios en producción.
  - El botón Reconstruir usa `void (async () => {...})()` — patrón aceptado; podría extraerse a un handler tipado si se escala.

### 2026-03-02 — TDD display (RED→REFACTOR)

- Actor: AI assistant (Copilot)
- Task: Ciclo TDD para la pantalla `/display/[queueId]`; cobertura de queueId en cabecera, turno activo/nulo, consultorio destino, lista de espera, límite de 8 slots, orden y footer de última actualización.
- Files changed:
  - rlapp-frontend/test/app/display/page.red.spec.tsx (nuevo — 12 pruebas)
- Commits atómicos:
  - `test(display): red - queueId en cabecera, turno activo, lista, límite 8 slots, orden y lastUpdated (12/12)`
  - `refactor(display): it.each para tests de footer lastUpdated (10-11)`

- Actions performed:
  1. RED: se crearon 12 pruebas síncronas. Problema resuelto: `React.use(params)` en Next.js App Router recibe `params: Promise<{queueId}>` y llama a `React.use(promise)`, lo que suspende indefinidamente en Jest 30. **Solución definitiva**: `jest.spyOn(React, "use").mockImplementation((_: unknown) => mockParams as any)` con variable `let mockParams` mutable que se actualiza en `beforeEach` y en `renderDisplay()`. La producción era correcta en todos los casos (12/12 desde el inicio).
  2. REFACTOR: se consolidaron los tests 10 y 11 (footer `lastUpdated`) en un `it.each` con parámetros `{ lastUpdated, containsDash, label }`. Sin cambios en producción.

- Patrones consolidados:
  - `jest.spyOn(React, "use").mockImplementation((_) => mockParams as any)` como solución canónica para páginas App Router con `params: Promise<T>` en Jest.
  - Variable `let mockParams` mutable — actualizada tanto en `beforeEach` como en `renderDisplay(queueId)` para control por test.

- Notes / Human checks:
  - Aplicar el mismo patrón `mockParams` en cualquier otra página App Router que reciba `params` como Promise.
  - No se detectó deuda técnica; sin cambios en producción.

### 2026-03-02 — TDD consultorios (RED→REFACTOR)

- Actor: AI assistant (Copilot)
- Task: Ciclo TDD para la pantalla `/consulting-rooms`; cobertura de toggle activate/deactivate, idempotencia de estado ante fallos de red, busy, propagación de error y queueId desde query param.
- Files changed:
  - rlapp-frontend/test/app/consulting-rooms/page.red.spec.tsx (nuevo — 12 pruebas)
- Commits atómicos:
  - `test(consulting-rooms): red - tests de toggle, idempotencia, fallo de red, busy y propagación de error (12/12)`
  - `refactor(consulting-rooms): extraer helpers getCard/activateCard para eliminar patrón repetido`

- Actions performed:
  1. RED: se crearon 12 pruebas. La producción era correcta en todos los casos (12/12 desde el inicio). Casos cubiertos: renderizado de 4 salas, queueId desde query param, activate/deactivate con payload correcto, transición de etiqueta del botón, showSuccess/showInfo, no-flip de estado si el hook devuelve `false`, botones deshabilitados con `busy`, propagación de error + clearError.
  2. REFACTOR: se extrajeron dos helpers — `getCard(stationId)` encapsula `.closest('div')`, y `activateCard(user, stationId)` encapsula el clic + waitFor del flujo previo de activación. Se eliminó código duplicado en 5 tests.

- Patrones consolidados:
  - `getCard` como alternativa tipada a `.closest('div') as HTMLElement`.
  - `activateCard` como precondición reutilizable cuando un test necesita una tarjeta ya activa.

- Notes / Human checks:
  - No se detectó deuda técnica; sin cambios en producción.

### 2026-03-02 — TDD médico (RED→REFACTOR + corrección de producción)

- Actor: AI assistant (Copilot)
- Task: Ciclo TDD para la pantalla `/medical`; cobertura de claim, call, complete, markAbsent, guards de patientId, busy, propagación de errores y query param. Descubrimiento y corrección de defecto en coerción de `outcome`.
- Files changed:
  - rlapp-frontend/test/app/medical/page.red.spec.tsx (nuevo — 12 pruebas)
  - rlapp-frontend/src/app/medical/page.tsx (corrección `??` → `||` en `outcome`)
- Commits atómicos:
  - `test(medical): red - tests de claim, call, complete, absent, guards de patientId, busy y propagación de errores (12/12)`
  - `refactor(medical): extraer ActionRow, simplificar fillStation y corregir outcome coercion vacío→null`

- Actions performed:
  1. RED: se crearon 12 pruebas cubrien todas las acciones de la pantalla. La producción ya era correcta en 11/12; el único fallo (regex `/Activar estación/i` sub-matching "Desactivar estación") fue corregido en autoría antes del commit.
  2. REFACTOR: se extrajo el tipo `ActionRow`, se simplificó el helper `fillStation` para siempre limpiar los campos. Este cambio **reveló un defecto real**: `data.outcome ?? null` no coerciona `""` a `null`; se corrigió a `data.outcome || null` en `onFinishConsult`. Resultado final: 12/12.

- Defecto corregido:
  - Archivo: `src/app/medical/page.tsx`, función `onFinishConsult`
  - Síntoma: cuando el campo "Resultado" se deja vacío y luego se borra, `react-hook-form` reporta `""` en vez de `null`; `?? null` deja pasar `""` tal cual.
  - Corrección: `data.outcome || null` coerciona tanto `""` como `undefined` a `null`.

- Notes / Human checks:
  - Patrón `^Ancla$` en regex de botones con prefijo común (Activar/Desactivar) debe estandarizarse en otras suites.
  - Considerar aplicar la misma corrección `|| null` en otros formularios con campos opcionales (`registration`, `cashier` si aplica).

### 2026-03-02 — TDD caja (RED→GREEN→REFACTOR)

- Actor: AI assistant (Copilot)
- Task: Ciclo TDD completo para la pantalla `/cashier`; cobertura de acciones, doble submit, propagación de errores y estado vacío.
- Files changed:
  - rlapp-frontend/test/app/cashier/page.red.spec.tsx (nuevo — 12 pruebas)
- Commits atómicos:
  - `test(cashier): red - tests de acciones, payload, doble submit y errores del hook`
  - `feat(cashier): green - mock configurable por variable y assertions corregidas (12/12)`
  - `refactor(cashier): parametrizar tests de acciones con it.each para eliminar duplicidad`

- Actions performed:
  1. RED (2 fallos / 10 pasan): se crearon 12 pruebas que cubren `callNext`, `validate`, `markPending`, `markAbsent`, `cancel`, refresco y limpieza de selección, bloqueo por `busy`, propagación de errores del hook y estado vacío. Los 2 fallos detectados (`getByText` ambiguo y `jest.resetModules` inefectivo al usar módulos ya importados) son de autoría, no de producción.
  2. GREEN: se sustituyó la aserción de texto ambiguo por una basada en rol de botón; se reemplazó `jest.resetModules()` por una variable mutable `patientsQueue` a nivel de módulo que el mock de `useWaitingRoom` consume dinámicamente. Resultado: 12/12.
  3. REFACTOR: los 4 tests individuales de acciones (`validate`, `markPending`, `markAbsent`, `cancel`) se consolidaron en un único bloque `it.each` parametrizado. Resultado: 12/12 sin regresiones.

- Notes / Human checks:
  - La página de caja ya estaba implementada; los tests actúan como red de seguridad y documentación viva.
  - La variable `patientsQueue` es el patrón preferido para controlar datos de mock por test sin resetear módulos.

### 2026-03-01 — Plan TDD frontend

- Actor: AI assistant (Copilot)
- Task: Elaborar plan detallado de TDD y refactor para el frontend, con commits atómicos Red → Green → Refactor y trazabilidad.
- Files changed:
  - rlapp-frontend/docs/TDD_PLAN.md (nuevo plan por pantalla)

- Actions performed:
  1. Se definieron objetivos, alcance y secuencia de trabajo por pantallas (`/`, `reception`, `cashier`, `medical`, `consulting-rooms`, `display/[queueId]`, `waiting-room/[queueId]`, `dashboard`, `registration`).
  2. Se establecieron convenciones de commits (`test/feat/refactor`) y casos borde prioritarios (trim de nombre, opcionales → null, circuit breaker, rate limit, doble submit, reconexión).
  3. Se documentó la estrategia de mocks (DependencyContext.mock, MSW, SignalR mock), cobertura meta y checklist previa a merge.

- Notes / Human checks:
  - Sin cambios de código ni de negocio; planificación únicamente.
  - Actualizar DEBT_REPORT.md solo si surgen hallazgos durante la ejecución.

### 2026-03-01 — TDD recepción (RED→GREEN)

- Actor: AI assistant (Copilot)
- Task: Fase RED/GREEN para recepción; normalizar payload y evitar doble submit.
- Files changed:
  - rlapp-frontend/test/app/reception/page.red.spec.tsx (nuevas pruebas RED)
  - rlapp-frontend/src/app/reception/page.tsx (ajuste GREEN: trim de nombre, guard de doble submit)

- Actions performed:
  1. Se agregaron pruebas RED que verifican trim de `patientName`, opcionales a `null` y bloqueo de doble submit.
  2. Se ajustó `onSubmit` para recortar el nombre y evitar doble envío si `submitting` es true.
  3. Se ejecutó `npx jest --testPathPatterns reception/page.red.spec` (3/3 tests en verde; warnings de `act` informativos, sin fallo).

- Notes / Human checks:
  - Los warnings de React sobre `act(...)` provienen de `setSubmitting` al finalizar la promesa; no impactan el pase de tests, pero puede limpiarse en refactor.

### 2026-03-01 — TDD recepción (REFACTOR)

- Actor: AI assistant (Copilot)
- Task: Limpiar avisos de act en tests de recepción.
- Files changed:
  - rlapp-frontend/test/app/reception/page.red.spec.tsx (uso de `userEvent.setup()` para envolver interacciones en act)

- Actions performed:
  1. Se actualizaron los tests para usar `userEvent.setup()` y así envolver las interacciones en act.
  2. Se reejecutó `npx jest --testPathPatterns reception/page.red.spec` (3/3 en verde; persisten warnings informativos de React por setState post-promesa, sin fallos).

- Notes / Human checks:
  - Los warnings de act persisten por el flujo interno de setState de `react-hook-form`; se consideran aceptables (sin fallos). Si se desea eliminarlos por completo, envolver el submit en utilidades de prueba personalizadas o ajustar el hook para exponer una promesa de finalización del submit.

### 2026-02-24 — Pulir frontend: validación y estilos

- Actor: AI assistant (Copilot)
- Task: Añadir validación a formularios `reception`, `cashier`, `medical`; estilos responsivos; tests básicos; build y despliegue frontend.
- Files changed:
  - rlapp-frontend/src/app/reception/page.tsx (form migrated to react-hook-form + zod)
  - rlapp-frontend/src/app/cashier/page.tsx (form migrated to react-hook-form + zod)
  - rlapp-frontend/src/app/medical/page.tsx (form migrated to react-hook-form + zod)
  - rlapp-frontend/src/app/*/page.module.css (new CSS modules for responsive layout)
  - rlapp-frontend/src/infrastructure/adapters/SignalRAdapter.ts (added compatibility alias)
  - rlapp-frontend/src/infrastructure/adapters/SocketIoAdapter.ts (added compatibility alias)
  - rlapp-frontend/src/domain/ports/RealTimePort.ts (added optional alias method)
  - test/app/{reception,cashier,medical}.spec.tsx (basic rendering tests)

- Actions performed:
  1. Audited reception/cashier/medical pages and implemented typed validation using `react-hook-form` + `zod`.
  2. Added basic responsive CSS modules and wired them into pages.
  3. Installed dependencies (`react-hook-form`, `zod`, `@hookform/resolvers`) using `npm install --legacy-peer-deps`.
  4. Fixed TypeScript compatibility issues by adding backwards-compatible aliases for real-time adapters; `npx tsc --noEmit` passed.
  5. Added minimal unit tests for the three pages and adjusted test mocks for `next/navigation`.
  6. Built and started `frontend` container via `docker compose build` and `docker compose up -d frontend`; validated `/test` route responds 200.

- Notes / Human checks:
  - TODO: show user-facing error messages for API failures (left as `// TODO` in handlers).
  - Server-side SignalR group emits are recommended to provide real-time updates without polling.
  - Prefer to run full test suite and E2E tests in CI where backend services are available to avoid network-related flaky tests.

  ### 2026-02-25 — Limpieza de artefactos versionados

  - Actor: AI assistant (Copilot)
  - Task: Ajustar ignores y retirar artefactos generados del control de versiones para evitar ruido en estados y commits.
  - Files changed:
    - rlapp-backend/.gitignore (agregado `test-results.log`)
    - Eliminaciones del indice en bin/ y obj/ bajo rlapp-backend

  - Actions performed:
    1. Se identificaron artefactos generados versionados en `bin/`, `obj/` y `test-results.log`.
    2. Se removieron del indice git para que queden ignorados en adelante.
    3. Se actualizo el ignore del backend para `test-results.log`.

  - Notes / Human checks:
    - Ninguna.
