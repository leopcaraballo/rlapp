# Plan TDD para frontend

> Plan detallado para refactorizar con TDD pantalla por pantalla, usando commits atómicos Red → Green → Refactor y asegurando trazabilidad completa.

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
- Comandos: `npm test`, `npm run test:cov`, `npx jest --testPathPattern="reception|cashier|medical|display"`.

## 7. Riesgos y mitigaciones

- Rama sin remoto: crear upstream antes de trabajar (`git push -u origin feat/pre-tdd-msw`).
- Flakiness por tiempo real: desacoplar tests de SignalR real, usar mocks/handlers.
- Duplicidad de commits: respetar R/G/R y no mezclar fases.

## 8. Trazabilidad y entregables

- Registrar cada bloque de trabajo en `docs/AI_WORKFLOW.md` (fecha, actor, scope, archivos, resumen R/G/R).
- Actualizar `docs/DEBT_REPORT.md` solo si se detecta deuda o se cierra una existente.
- Sin commits todavía: este archivo es la planificación previa.

## 9. Secuencia de ejecución

1) Reception
2) Cashier
3) Medical
4) Consulting rooms
5) Display
6) Waiting room
7) Dashboard
8) Registration
9) Ruta base

## 10. Checklist previa a merge

- [ ] R/G/R completado por pantalla con commits separados.
- [ ] Tests verdes y `npm run test:cov` ejecutado.
- [ ] Cobertura objetivo alcanzada.
- [ ] Sin `any` ni tipados laxos nuevos.
- [ ] AI_WORKFLOW actualizado; DEBT_REPORT si aplica.
