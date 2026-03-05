# Plan TDD para frontend

> Plan detallado para refactorizar con TDD pantalla por pantalla, usando commits atómicos Red → Green → Refactor y asegurando trazabilidad completa.

---

## 0. Estado actual — 4 de marzo de 2026

### 0.1 Cobertura global (última ejecución registrada)

| Métrica | Anterior | Actual | Objetivo |
|---|---|---|---|
| Líneas | 83.96% | **93.17%** | >80% |
| Sentencias | 81.61% | **91.00%** | >80% |
| Funciones | 76.53% | **87.97%** | >80% |
| Ramas | 70.56% | **79.04%** | >70% |

Todos los objetivos superados tras ejecutar los Bloques A, B y C.

### 0.2 Progreso por pantalla

| Pantalla | RED | GREEN | REFACTOR | Commit GREEN |
|---|---|---|---|---|
| `/` (ruta base) | ✓ | ✓ | ✓ | incluido en reception |
| `/reception` | ✓ | ✓ | ✓ | `cc7bdc9` |
| `/cashier` | ✓ | ✓ | ✓ | `dd9aa1f` |
| `/medical` | ✓ | ✓ | ✓ | `89d4912` (12 tests post-PR#51) |
| `/consulting-rooms` | ✓ | (implícito) | ✓ | `ac03fe2` |
| `/display/[queueId]` | ✓ | (implícito) | ✓ | `bd67c85` |
| `/dashboard` | ✓ | (implícito) | ✓ | `c97119b` |
| `/registration` | ✓ | **PENDIENTE** | **PENDIENTE** | — |
| `/waiting-room/[queueId]` | ✓ | ✓ | (implícito) | 12/12 pasan tras merge PR#51 |

> "Implícito": el refactor y los ajustes de producción se realizaron en el mismo ciclo sin commit GREEN separado, lo cual viola la convención R/G/R del §2. No requiere rehacer el trabajo, pero se debe documentar.

### 0.3 Brechas de cobertura críticas

Archivos con cobertura inferior al umbral objetivo que **deben cubrirse en los ciclos pendientes**:

| Archivo | Líneas | Funciones | Ramas | Causa | Estado |
|---|---|---|---|---|---|
| `services/api/waitingRoom.ts` | ~~17.1%~~ **97%** | ~~20.7%~~ **100%** | ~~16.0%~~ **79%** | Sin tests de integración del servicio | ✅ `c75ffa4` |
| `infrastructure/adapters/SignalRAdapter.ts` | ~~18.0%~~ **100%** | ~~0.0%~~ **100%** | ~~0.0%~~ **70%** | Sin mock de SignalR en ningún test | ✅ `f434c5e` |
| `services/signalr/waitingRoomSignalR.ts` | ~~67.1%~~ **97%** | ~~29.4%~~ **88%** | ~~50.0%~~ **76%** | Callbacks de reconexión no cubiertos | ✅ `f434c5e` |
| `hooks/useWaitingRoom.tsx` | ~~69.3%~~ **98%** | ~~35.0%~~ **85%** | ~~26.7%~~ **73%** | Estados paralelos y error paths sin cubrir | ✅ `c75ffa4` |

Archivos con brechas de ramas secundarias (no bloquean umbral global, pero degradan calidad):

| Archivo | Ramas antes | Ramas después | Estado |
|---|---|---|---|
| `components/NetworkStatus.tsx` | 30.0% | **100%** | ✅ `b4aa690` |
| `proxi.ts` | 57.1% | **92.85%** | ✅ `214f4e0` |
| `config/env.ts` | 77.8% | **88.88%** | ✅ `802291f` |
| `hooks/useConsultingRooms.ts` | 75.0% | **100%** | ✅ `0f19a87` |
| `components/WaitingRoom/QueueStateCard.tsx` | 75.0% | **100%** | ✅ `016477b` |
| `components/WaitingRoom/MonitorCard.tsx` | 77.8% | **100%** | ✅ `016477b` |

---

## 11. Plan de trabajo pendiente (detallado)

### 11.1 Bloque A — `/registration` GREEN + REFACTOR

**Prioridad:** alta. El RED tiene 14 tests listos en `test/app/registration/page.red.spec.tsx`.

**Pasos:**

1. Ejecutar `npx jest --testPathPatterns="registration/page.red"` y confirmar que todos fallan (estado RED real).
2. **feat(registration): green** — implementar en `src/app/registration/page.tsx`:
   - Surface explícito de errores Zod campo a campo (mensajes bajo cada input).
   - Manejo de `circuit open` y `timeout` desde `httpClient`: capturar `CircuitOpenError` y `TimeoutError`, mostrar alerta con `showError`.
   - Deshabilitar submit mientras `busy === true` (doble submit).
   - Mapear errores 429 a mensaje de rate limit localizado.
3. Ejecutar suite completa: `npm test` — debe pasar sin regresiones.
4. **refactor(registration)** — limpiar:
   - Extraer `RegistrationErrorSummary` si hay lógica de mapeo de errores duplicada con `/reception`.
   - Reutilizar `FormLoadingOverlay` (ya existe en `components/`).
   - Eliminar `any` si se introdujo durante green.
5. Ejecutar `npm run test:cov` — verificar que `app/registration/page.tsx` alcanza >90% líneas.
6. Registrar en `docs/AI_WORKFLOW.md`.

**Archivos a modificar:** `src/app/registration/page.tsx`
**Archivos de test:** `test/app/registration/page.red.spec.tsx`, `test/app/registration/page.spec.tsx`
**Commits esperados:** `feat(registration): green - ...` + `refactor(registration): ...`

---

### 11.2 Bloque B — `/waiting-room/[queueId]` GREEN + REFACTOR + cobertura de capas

**Prioridad:** alta. Es el bloque con mayor deuda técnica de cobertura (ver §0.3).

**Paso B.1 — GREEN de la página**

1. Ejecutar `npx jest --testPathPatterns="waiting-room/page.red"` y confirmar estado RED.
2. **feat(waiting-room): green** — en `src/app/waiting-room/[queueId]/page.tsx`:
   - Orquestar fetches paralelos con `Promise.all` para `monitor`, `queue`, `nextTurn`, `history`.
   - Suscribirse al evento `rlapp:command-success` para disparar refresh.
   - Manejar estado de loading y error por sección independientemente.
   - Exponer el botón de rebuild POST al endpoint correcto.
3. Ejecutar `npm test` — sin regresiones.
4. Commit: `feat(waiting-room): green - fetch paralelo, refresh post-comando y rebuild projection`.

**Paso B.2 — Tests de `hooks/useWaitingRoom.tsx`**

Archivo con 69.3% líneas / 35.0% funciones / 26.7% ramas. Crear `test/hooks/useWaitingRoom.spec.ts`:

- Estado inicial: `nextTurn null`, `patientsInQueue []`, `lastUpdated null`.
- Fetch correcto al montar: verificar que llama `waitingRoomService.getMonitor(queueId)`.
- Error en fetch: `isError true`, mensaje visible.
- Refresh manual: llamar `refresh()` y verificar re-fetch.
- Evento `rlapp:command-success`: verificar que dispara re-fetch automático.
- Estado `loading` durante fetch.

Commit: `test(waiting-room): cobertura useWaitingRoom - estados, error, refresh y evento`.

**Paso B.3 — Tests de `services/api/waitingRoom.ts`**

Archivo con 17.1% líneas. Crear `test/services/waitingRoomApi.spec.ts` usando MSW handlers:

- `getMonitor(queueId)`: respuesta 200 → objeto mapeado; 500 → error lanzado.
- `getQueue(queueId)`: respuesta 200 → array; 404 → array vacío o error según contrato.
- `getNextTurn(queueId)`: respuesta 200; null cuando 204/404.
- `getRecentHistory(queueId)`: respuesta 200 → array parcial.
- `postRebuild(queueId)`: respuesta 200 → void; 503 → error de circuit.

Commit: `test(waiting-room): cobertura services/api/waitingRoom con MSW`.

**Paso B.4 — Tests de `infrastructure/adapters/SignalRAdapter.ts`**

Archivo con 18.0% líneas / 0.0% funciones. Crear `test/infrastructure/signalRAdapter.spec.ts`:

- Mock de `@microsoft/signalr` con `HubConnectionBuilder`.
- `connect()`: llama `start()`, estado `Connected`.
- `disconnect()`: llama `stop()`.
- `onMessage(handler)`: registra handler y lo invoca al recibir evento.
- Fallo en `start()`: reintento o estado `Disconnected`.
- Reconexión automática: simular `onreconnected` callback.

Commit: `test(infra): cobertura SignalRAdapter - connect, disconnect, handlers y reconexión`.

**Paso B.5 — Tests de `services/signalr/waitingRoomSignalR.ts`**

Archivo con 67.1% líneas / 29.4% funciones. Ampliar `test/services/adapters.coverage.spec.ts` o crear `test/services/waitingRoomSignalR.spec.ts`:

- Callbacks de `onSnapshot`, `onUpdate`, `onError` sin cubrir.
- Estado de reconexión: verificar que actualiza estado interno.
- Unsubscribe limpio al desmontar.

Commit: `test(waiting-room): cobertura waitingRoomSignalR - callbacks y reconexión`.

**Paso B.6 — REFACTOR de waiting-room**

- Centralizar parsing de respuestas de API en un mapper (`waitingRoomMapper.ts`).
- Extraer `useConnectionState` hook reutilizable (mencionado en §3.7 del plan original) para compartir con `/dashboard`.
- Eliminar duplicidad con `RealtimeAppointments` si existe solapamiento.

Commit: `refactor(waiting-room): centralizar parsers y extraer useConnectionState`.

---

### 11.3 Bloque C — Brechas de ramas (branch coverage)

**Prioridad:** media. No bloquean el umbral global actual (70.56% > 70%), pero cualquier nueva rama sin cubrir puede bajar el porcentaje.

1. ~~**`components/NetworkStatus.tsx`** (30.0% ramas)~~ → **100%** ✅ `b4aa690`
2. ~~**`proxi.ts`** (57.1% ramas)~~ → **92.85%** ✅ `214f4e0`
3. ~~**`config/env.ts`** (77.8% ramas)~~ → **88.88%** ✅ `802291f`
4. ~~**`hooks/useConsultingRooms.ts`** (75.0% ramas)~~ → **100%** ✅ `0f19a87`
5. ~~**`components/WaitingRoom/QueueStateCard.tsx`** (75.0% ramas) y **`MonitorCard.tsx`** (77.8% ramas)~~ → **100%/100%** ✅ `016477b`

**Bloque C COMPLETADO** — 5 commits atómicos `b4aa690`→`214f4e0`.

---

### 11.4 Orden de ejecución actualizado

```
Bloque A:  registration GREEN  →  registration REFACTOR
Bloque B1: waiting-room GREEN (página)
Bloque B2: test useWaitingRoom
Bloque B3: test services/api/waitingRoom
Bloque B4: test SignalRAdapter
Bloque B5: test waitingRoomSignalR
Bloque B6: waiting-room REFACTOR
Bloque C:  branch coverage (NetworkStatus, proxi, env, hooks, cards) ✅
```

---

### 11.5 Checklist de cierre de cada bloque

Ejecutar antes de hacer commit REFACTOR y antes de merge:

```bash
npm run test:cov          # cobertura global
npx tsc --noEmit          # sin errores de tipos
npx eslint src/ --max-warnings 0  # sin warnings nuevos
git status                # sin archivos fuera de scope
```

---

## 1. Alcance y objetivos

- Cobertura: rutas `/`, `/reception`, `/cashier`, `/medical`, `/consulting-rooms`, `/display/[queueId]`, `/waiting-room/[queueId]`, `/dashboard`, `/registration`.
- Meta: elevar calidad y resiliencia con TDD, manteniendo Arquitectura Hexagonal (puertos/adaptadores) y evitando regresiones.
- Entregables: commits atómicos por fase R/G/R, tests nuevos o reforzados, documentación de trazabilidad actualizada.

## 2. Convenciones TDD y commits

- Secuencia obligatoria por tarea: `test(scope): red - ...` → `feat(scope): green - ...` → `refactor(scope): ...`.
- Un commit por fase y por pantalla/tema. No agrupar fases en un solo commit.
- Branch de trabajo: `feat/pre-tdd-msw` (confirmar upstream antes de empujar).
- Comandos de apoyo: `npm run test:watch` durante RED/GREEN, `npm run test:cov` antes de REFAC/merge.

## 3. Estrategia por pantalla (R/G/R)

### 3.1 Recepcion (`/reception`)
- Red: tests del hook `useCheckIn` y de la página para nombre con espacios, campos opcionales→null, doble submit, error de capacidad.
- Green: normalizar `patientName`, default de opcionales a `null`, bloqueo de doble submit, surfaced error UX.
- Refactor: extraer helpers de normalización y reutilizar en otros use cases; limpiar mocks repetidos.

### 3.2 Caja (`/cashier`)
- Red: tests para validar/pendiente/ausente/cancelar; asegurar transición de estados y mensajes de error.
- Green: delegar en `ICommandGateway` con payload correcto; manejo de errores localizados.
- Refactor: compartir adaptadores de acciones, eliminar duplicidad en componentes de botones.

### 3.3 Medico (`/medical`)
- Red: tests para claim/call/finish/absent respetando estados terminales.
- Green: asegurar comandos con `stationId` y `actor`; feedback en UI.
- Refactor: factor común de acciones médicas (hook o helper). 

### 3.4 Consultorios (`/consulting-rooms`)
- Red: tests para activar/desactivar con resiliencia a fallos de red.
- Green: implementar retry/errores en UI; verificar idempotencia de estados.
- Refactor: compartir componentes de toggle y manejo de loading/error.

### 3.5 Display (`/display/[queueId]`)
- Red: tests de orden y límite de slots, fallback sin datos.
- Green: asegurar orden por prioridad/tiempo y placeholders coherentes.
- Refactor: reutilizar componentes de tarjeta y formato de hora.

### 3.6 Waiting room (`/waiting-room/[queueId]`)
- Red: consistencia entre monitor/queue/next/history, rebuild projection.
- Green: orquestar fetch paralelo y refresco post-comando (`rlapp:command-success`).
- Refactor: centralizar parsing de vistas y estados de conexión.

### 3.7 Dashboard (`/dashboard`) y ruta base (`/`)
- Red: filtros de estados, audio on/off, reconexión SignalR, fallback a polling.
- Green: asegurar estado `connecting/degraded/offline`; disparo de audio controlado.
- Refactor: hook para estado de conexión reusable.

### 3.8 Registration (`/registration`)
- Red: validación Zod de formulario (nombre requerido, id numérico, prioridad, consulta), mapeo de errores de API.
- Green: surface de errores, circuit open/timeout desde `httpClient`.
- Refactor: reutilizar componentes de error y overlay de carga.

## 4. Casos borde prioritarios

| Capa | Caso | Pantalla |
|---|---|---|
| Dominio | Estados terminales no avanzan | Medical, Waiting room |
| Aplicación | Nombre con espacios → trim | Reception |
| Aplicación | Opcionales undefined → null | Reception |
| Infra | Circuit breaker abierto | Registration, Reception |
| Infra | Rate limit 429 | Reception, Registration |
| Hook/UI | Doble submit bloqueado | Reception, Registration |
| UI | Sin datos en listas | Display, Dashboard |
| Tiempo real | Reconexión y fallback | Dashboard, Waiting room |

## 5. Mocks y fixtures

- `DependencyContext.mock`: inyectar `mockRepository` y `mockRealTime` en hooks/componentes.
- MSW: usar handlers para API mock de comandos y queries; simular 200/429/500/timeout.
- SignalR: mock de callbacks para snapshot/update/errores.
- `AppointmentFactory`: generar citas para listas (waiting/called/completed).

## 6. Cobertura y comandos

- Objetivo: >80% líneas, >70% branches; sin tests frágiles.
- Comandos: `npm test`, `npm run test:cov`, `npx jest --testPathPatterns="reception|cashier|medical|display"`.

## 7. Riesgos y mitigaciones

- Rama sin remoto: crear upstream antes de trabajar (`git push -u origin feat/pre-tdd-msw`).
- Flakiness por tiempo real: desacoplar tests de SignalR real, usar mocks/handlers.
- Duplicidad de commits: respetar R/G/R y no mezclar fases.

## 8. Trazabilidad y entregables

- Registrar cada bloque de trabajo en `docs/AI_WORKFLOW.md` (fecha, actor, scope, archivos, resumen R/G/R).
- Actualizar `docs/DEBT_REPORT.md` solo si se detecta deuda o se cierra una existente.
- Sin commits todavía: este archivo es la planificación previa.

## 9. Secuencia de ejecución

> Actualizada al 2 de marzo de 2026. Los ítems tachados están completados.

1) ~~Reception~~ (R/G/R ✓ — commit `cc7bdc9`)
2) ~~Cashier~~ (R/G/R ✓ — commit `dd9aa1f`)
3) ~~Medical~~ (R/G/R ✓ — commit `2bef98d`)
4) ~~Consulting rooms~~ (R/G/R ✓ — commit `ac03fe2`)
5) ~~Display~~ (R/G/R ✓ — commit `bd67c85`)
6) ~~Dashboard~~ (R/G/R ✓ — commit `c97119b`)
7) ~~Ruta base~~ (R/G/R ✓ — incluido en reception)
8) ~~Registration~~ — GREEN `c90db2f` + REFACTOR `d460c38` ✓
9) ~~Waiting room~~ — GREEN `549bbb8` + tests de capas `92f4682`, `18feeab` ✓
10) ~~Branch coverage~~ — brechas secundarias cubiertas en sesión Bloques B2-B5 ✓

## 10. Checklist previa a merge

### Por pantalla

| Pantalla | RED | GREEN | REFACTOR |
|---|---|---|---|
| `/` | ✓ | ✓ | ✓ |
| `/reception` | ✓ | ✓ | ✓ |
| `/cashier` | ✓ | ✓ | ✓ |
| `/medical` | ✓ | ✓ | ✓ |
| `/consulting-rooms` | ✓ | ✓ | ✓ |
| `/display/[queueId]` | ✓ | ✓ | ✓ |
| `/dashboard` | ✓ | ✓ | ✓ |
| `/registration` | ✓ | ✓ | ✓ |
| `/waiting-room/[queueId]` | ✓ | ✓ | ✓ |

### Global

- [x] R/G/R completado en `/registration` con commits separados.
- [x] R/G/R completado en `/waiting-room` con commits separados.
- [x] Tests de capas (`useWaitingRoom`, `SignalRAdapter`, `waitingRoomSignalR`, `services/api/waitingRoom`) agregados.
- [x] Branch coverage de `NetworkStatus`, `proxi`, `env`, `useConsultingRooms` y WaitingRoom cards.
- [x] `npm run test:cov`: líneas >80% (**93.17%**), funciones >80% (**87.97%**), ramas >70% (**79.04%**).
- [x] `npx tsc --noEmit`: 18 errores preexistentes en `jest.setup`, `routeAccess`, `errorTranslations`, `application-layer`; 0 errores nuevos en esta sesión. ✅ `5574635`
- [x] `npx eslint src/ --max-warnings 0`: sin errores ni warnings. ✅
- [x] Sin `any` ni tipados laxos nuevos.
- [x] `AI_WORKFLOW.md` actualizado con cada bloque; `DEBT_REPORT.md` si aplica.
