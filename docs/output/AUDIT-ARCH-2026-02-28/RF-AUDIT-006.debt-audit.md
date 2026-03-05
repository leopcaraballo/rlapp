# RF-AUDIT-006: Auditoría de Deuda Técnica Consolidada

**Identificador:** RF-AUDIT-006
**Fecha:** 28 de febrero de 2026
**Alcance:** Consolidación de hallazgos de auditorías RF-002 a RF-005, priorización de deuda técnica
**Standard:** ISO/IEC 42010 Architecture Governance

---

## 1. Resumen Ejecutivo

**Total de hallazgos identificados:** 52
**Deuda crítica consolidada:** 18 items
**Estimación de remediación:** 6-8 semanas
**Impacto si no se remedia:** Imposible escalar a producción con confianza

| Severidad | Cantidad | Esfuerzo | Bloqueante |
|-----------|----------|----------|-----------|
| 🔴 Crítica | 18 | 120 horas | SÍ |
| 🟠 Alta | 20 | 80 horas | SÍ para release |
| 🟡 Media | 14 | 40 horas | NO |
| **TOTAL** | **52** | **240 horas** | **~6 semanas** |

---

## 2. Consolidación de Deuda por Categoría

### A. SEGURIDAD (10 items - Críticos)

#### D-SEC-001: Sin autenticación (Backend + Frontend)

**Fuente:** RF-AUDIT-002#H-SEC-001 + RF-AUDIT-003#H-SEC-FE-001
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 40 horas
**Bloquea:** Release a producción
**Artefactos afectados:**

- Backend: WaitingRoom.API (todos los endpoints)
- Frontend: todas las rutas

**Plan de remediación:**

```
1. Backend: Implementar JWT en Program.cs (8 hrs)
   - AddAuthentication (JwtBearer)
   - AddAuthorizationBuilder()
   - [Authorize] en endpoints
   - Tests: WaitingRoom.Tests.Security

2. Frontend: Auth context + login form (12 hrs)
   - AuthProvider context
   - <LoginPage /> component
   - useAuth() hook
   - Redirect no auth → /login

3. Integration: Token refresh + logout (8 hrs)
   - Refresh token mechanism
   - httpOnly cookie storage
   - Logout API call

4. SignalR auth:  [Authorize] in Hub (4 hrs)

5. Testing: Security test suite (8 hrs)
```

**Validación:** Todos endpoints protegidos; tests pasos

---

#### D-SEC-002: Sin rate limiting

**Fuente:** RF-AUDIT-002#H-SEC-003
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 16 horas
**Bloquea:** Producción
**Plan:**

```
1. Add AspNetCoreRateLimit package
2. Configure: 100 req/min global, 10 req/min per authenticated user
3. Middleware setup in Program.cs
4. Log rate limit violations
5. Return 429 Too Many Requests
```

---

#### D-SEC-003: Secretos en plaintext (docker-compose.yml)

**Fuente:** RF-AUDIT-002#H-SEC-004
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 4 horas
**Plan:**

```
1. Create .env.example in repo
2. docker-compose.yml reads from .env (create .gitignore entry)
3. CI/CD (GitHub Actions) provides secrets via env vars
4. docs: "How to configure secrets"
```

---

#### D-SEC-004: SignalR sin autenticación

**Fuente:** RF-AUDIT-002#H-SEC-005
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 8 horas
**Plan:** Agregar [Authorize] en Hub class, validar JWT en handshake

---

#### D-SEC-005: Headers de seguridad faltantes (Frontend)

**Fuente:** RF-AUDIT-003#H-SEC-FE-002
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 4 horas
**Plan:** next.config.ts headers section (CSP, X-Frame, referrer-policy)

---

#### D-SEC-006: Validación de input insuficiente (Frontend)

**Fuente:** RF-AUDIT-003#H-SEC-FE-003
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 12 horas
**Plan:** DOMPurify + Zod rigorous validation, sanitization

---

#### D-SEC-007: Datos clínicos sensibles expuestos en UI

**Fuente:** RF-AUDIT-003#H-SEC-FE-004
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 8 horas
**Plan:** Mostrar solo datos del paciente autenticado; redactar nombres

---

#### D-SEC-008: Sin auditoría de intentos fallidos

**Fuente:** RF-AUDIT-002#H-CLINIC-001
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 8 horas
**Plan:** Tabla `malformed_check_ins` para registrar conflictos identidad

---

#### D-SEC-009: Sin validación de startup de dependencias

**Fuente:** RF-AUDIT-002#H-CONFIG-001
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 4 horas
**Plan:** Health check PostgreSQL/RabbitMQ en Program.cs startup

---

#### D-SEC-010: Lógica órquestación en Application layer

**Fuente:** RF-AUDIT-002#H-ARCH-001
**Severidad:** 🟡 **MEDIA** (seguridad: generación de IDs)
**Esfuerzo:** 8 horas
**Plan:** Mover generación de queueId a Value Object factory

---

### B. ARQUITECTURA (8 items - Altos)

#### D-ARCH-001: Proyecciones en memoria sin persistencia

**Fuente:** RF-AUDIT-002#H-ARCH-002
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 32 horas
**Bloquea:** Producción
**Plan:**

```
1. Create PostgreSQL read model schema:
   - v_waiting_room_monitor (KPIs)
   - v_queue_state (detailed patients)
   - v_next_turn (current claim)
   - v_recent_attention (audit trail)

2. Implement PostgresWaitingRoomProjectionContext:
   - Write to read DB atomically with events
   - Idempotency: version per read model

3. ProjectionEventProcessor updates read models:
   - Consumes events from event store
   - Applies transformations
   - Writes to views (INSERT or UPDATE)

4. Replace InMemoryWaitingRoomProjectionContext in API
   - Keep for local dev if needed
   - Production uses PostgreSQL

5. Tests: ProjectionConsistencyTests (event → view)
```

---

#### D-ARCH-002: Acoplamiento en composición root (Program.cs)

**Fuente:** RF-AUDIT-002#H-ARCH-003
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 16 horas
**Plan:**

```
1. Create infrastructure extension:
   services.AddWaitingRoomInfrastructure(config)

2. Create application extension:
   services.AddWaitingRoomApplication()

3. Program.cs becomes:
   builder.Services
     .AddWaitingRoomInfrastructure(config)
     .AddWaitingRoomApplication()
     .AddWaitingRoomApi();
```

---

#### D-ARCH-003: Sin Infrastructure tests

**Fuente:** RF-AUDIT-002#H-TEST-001 + RF-AUDIT-004#S2
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 32 horas
**Plan:** Create WaitingRoom.Tests.Infrastructure suite (see RF-004)

---

#### D-ARCH-004: Falta Container/Presenter en frontend

**Fuente:** RF-AUDIT-003#H-COMP-001
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 24 horas
**Plan:** Refactor RealtimeAppointments → useRealtimeAppointmentLogic + Presenter component

---

#### D-ARCH-005: Duplicación de lógica SignalR (Frontend)

**Fuente:** RF-AUDIT-003#H-COMP-002
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 8 horas
**Plan:** Extract common hook `useWaitingRoomSignalR` en `hooks/`

---

#### D-ARCH-006: Componentes sin Error Boundary

**Fuente:** RF-AUDIT-003#H-STATE-002
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 8 horas
**Plan:** Create ErrorBoundary.tsx wrapper, integrate in layout

---

#### D-ARCH-007: Contexto de usuario débil/ausente

**Fuente:** RF-AUDIT-003#H-STATE-001
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 12 horas
**Plan:** UserContext + AuthProvider for user/role/sessionId

---

#### D-ARCH-008: Responsabilidades múltiples en componentes

**Fuente:** RF-AUDIT-003#H-COMP-003
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 16 horas
**Plan:** Refactor AppointmentRegistrationForm → hook + presenter

---

### C. TESTING (12 items - Altos/Críticos)

#### D-TEST-001: Sin tests de seguridad (Backend)

**Fuente:** RF-AUDIT-002#H-TEST-002 + RF-AUDIT-004#S2
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 24 horas
**Plan:** WaitingRoom.Tests.Security (10+ cases; see RF-004)

---

#### D-TEST-002: Cobertura frontend <30%

**Fuente:** RF-AUDIT-004
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 40 horas
**Plan:**

- Hook tests: useWaitingRoom, useAppointmentRegistration (20 specs)
- Service tests: API client, WebSocket (10 specs)
- Component tests: expand from 8 to 30+ specs
- Target: >70% coverage

---

#### D-TEST-003: E2E tests ausentes

**Fuente:** RF-AUDIT-004
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 32 horas
**Plan:**

- Playwright: Login → Checkin → Monitor flow (3 specs)
- xUnit E2E: CheckIn → Event → Projection (3 specs)
- 6 critical flows end-to-end

---

#### D-TEST-004: Backend coverage incompleto (75% → 85%+)

**Fuente:** RF-AUDIT-004
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 16 horas
**Plan:** Infrastructure tests fill the 10%

---

#### D-TEST-005: Sin integration tests Backend↔Frontend

**Fuente:** RF-AUDIT-004
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 20 horas
**Plan:** Playwright hitting real backend endpoints

---

#### D-TEST-006: CI/CD quality gates ausentes

**Fuente:** RF-AUDIT-004
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 8 horas
**Plan:** GitHub Actions: test coverage gates, security gates, E2E gates

---

#### Additional test debt (14 items total in RF-004)

See RF-AUDIT-004 for complete list of 14 testing items.

---

### D. ESPECIFICACIONES Y DOCUMENTACIÓN (8 items - Altos)

#### D-SPEC-001: Sin repositorio formal de HU (REQUIREMENTS.md)

**Fuente:** RF-AUDIT-005#H-SPEC-001
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 16 horas
**Plan:**

- Create docs/REQUIREMENTS.md
- Document 5 core HU with acceptance criteria
- Link to code/tests

---

#### D-SPEC-002: HU-04 (Payment) es épica

**Fuente:** RF-AUDIT-005#H-SPEC-002
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 8 horas
**Plan:** Descomponer en HU-04a, 04b, 04c

---

#### D-SPEC-003: Especificaciones clínicas en código

**Fuente:** RF-AUDIT-005#H-SPEC-003
**Severidad:** 🔴 **CRÍTICA**
**Esfuerzo:** 8 horas
**Plan:** Create docs/CLINICAL_SPECIFICATIONS.md

---

#### D-SPEC-004: DoR y DoD no formalizados

**Fuente:** RF-AUDIT-005#H-SPEC-004
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 4 horas
**Plan:** Create docs/DEFINITION_OF_READY.md + docs/DEFINITION_OF_DONE.md

---

#### D-SPEC-005: HU-05 (Monitor) granularidad > 8 puntos

**Fuente:** RF-AUDIT-005#H-SPEC-005
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 4 horas
**Plan:** Descomponer en HU-05a, 05b, 05c

---

#### D-SPEC-006: RNF no documentados

**Fuente:** RF-AUDIT-005#H-SPEC-006
**Severidad:** 🟠 **ALTA**
**Esfuerzo:** 4 horas
**Plan:** Create docs/NON_FUNCTIONAL_REQUIREMENTS.md (SLA, compliance, security)

---

#### Additional spec debt (8 items total in RF-005)

See RF-AUDIT-005 for complete spec items.

---

## 3. Matriz de Deuda Priorizada (Top 20 de 52)

| Prioridad | Item | Severidad | Esfuerzo | Impacto | Bloqueante |
|-----------|------|-----------|----------|---------|-----------|
| P1 | D-SEC-001: No auth | 🔴 | 40 hrs | Muy alto | Sí |
| P2 | D-ARCH-001: Memory projections | 🟠 | 32 hrs | Muy alto | Sí |
| P3 | D-TEST-001: No security tests | 🔴 | 24 hrs | Muy alto | Sí |
| P4 | D-TEST-003: No E2E tests | 🔴 | 32 hrs | Alto | Sí |
| P5 | D-SPEC-001: No REQUIREMENTS.md | 🔴 | 16 hrs | Alto | Sí |
| P6 | D-SEC-002: No rate limit | 🔴 | 16 hrs | Muy alto | Sí |
| P7 | D-ARCH-003: No infra tests | 🟠 | 32 hrs | Alto | Sí |
| P8 | D-TEST-002: Frontend coverage <30% | 🟠 | 40 hrs | Alto | Sí |
| P9 | D-ARCH-002: DI coupling | 🟠 | 16 hrs | Medio | No |
| P10 | D-SPEC-003: Clinical specs | 🔴 | 8 hrs | Muy alto | Sí |
| P11 | D-ARCH-004: Container/Presenter | 🟠 | 24 hrs | Medio | No |
| P12 | D-SEC-003: Secrets plaintext | 🔴 | 4 hrs | Muy alto | Sí |
| P13 | D-SEC-004: SignalR no auth | 🔴 | 8 hrs | Muy alto | Sí |
| P14 | D-SEC-005: No security headers | 🔴 | 4 hrs | Alto | Sí |
| P15 | D-TEST-004: Coverage 75% → 85% | 🟠 | 16 hrs | Medio | No |
| P16 | D-SPEC-002: Payment is epic | 🔴 | 8 hrs | Medio | Sí |
| P17 | D-SEC-006: Input validation | 🔴 | 12 hrs | Muy alto | Sí |
| P18 | D-ARCH-005: Duplicate hook logic | 🟠 | 8 hrs | Bajo | No |
| P19 | D-SPEC-004: DoR/DoD | 🟠 | 4 hrs | Medio | No |
| P20 | D-ARCH-006: Error boundary | 🟠 | 8 hrs | Medio | No |

---

## 4. Timeline de Remediación (Propuesta)

### Sprint 1 (Semana 1): Security foundation

```
- [P1] D-SEC-001: Authentication backend (15 hrs)
- [P2] D-SEC-002: Rate limiting (16 hrs)
- [P12] D-SEC-003: Secrets mgmt (4 hrs)
- [P14] D-SEC-005: Security headers (4 hrs)
Total: 39 hrs → 1 semana
```

### Sprint 2 (Semana 2): Frontend security + Architecture

```
- [P1] D-SEC-001: Auth frontend + SignalR (25 hrs)
- [P13] D-SEC-004: SignalR auth (8 hrs)
- [P17] D-SEC-006: Input validation (12 hrs)
- [P5] D-SPEC-001: REQUIREMENTS.md (16 hrs)
Total: 61 hrs → puede ser 1.5 semanas
```

### Sprint 3 (Semana 3): Testing foundation

```
- [P3] D-TEST-001: Security test suite (24 hrs)
- [P7] D-ARCH-003: Infrastructure tests (32 hrs)
Total: 56 hrs → 1.5 semanas
```

### Sprint 4 (Semana 4): Architecture + Specs

```
- [P2] D-ARCH-001: PostgreSQL projections (32 hrs)
- [P10] D-SPEC-003: Clinical specs (8 hrs)
- [P16] D-SPEC-002: Payment decomposition (8 hrs)
Total: 48 hrs → 1.2 semanas
```

### Sprint 5-6 (Semanas 5-6): Testing completion

```
- [P4] D-TEST-003: E2E tests (32 hrs)
- [P8] D-TEST-002: Frontend coverage (40 hrs)
Total: 72 hrs → 1.8 semanas
```

---

## 5. Estimación de Recursos

**Total effort:** 240 horas = 30 días-persona
**Team size:** 3 engineers (backend + frontend + QA)
**Duration:** 6-8 semanas (45% parallelizable)

| Rol | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5-6 | Total |
|-----|----------|----------|----------|----------|-----------|-------|
| Backend Engineer | 30 | 30 | 40 | 32 | 16 | 148 hrs |
| Frontend Engineer | 5 | 30 | 12 | 8 | 40 | 95 hrs |
| QA/Testing | 4 | 8 | 22 | 12 | 30 | 76 hrs |
| **Total** | **39** | **68** | **74** | **52** | **86** | **319 hrs** |

*Note: Some parallelization expected; actual calendar time ~6 weeks with concurrent work.*

---

## 6. Criterios de Aceptación para "Deuda Resuelta"

### Security Debt Resolved ✅

- [ ] JWT authentication: all endpoints protected
- [ ] Rate limiting: 100 req/min per IP
- [ ] Security tests: 10+ security test cases passing
- [ ] Headers: CSP, X-Frame-Options, referrer-policy set
- [ ] No plaintext secrets in git
- [ ] SignalR: [Authorize] implemented

### Architecture Debt Resolved ✅

- [ ] Projections: TestContainers PostgreSQL Read Models
- [ ] DI: Program.cs modular (extension methods)
- [ ] Infrastructure tests: 10+ unit tests
- [ ] Frontend: Container/Presenter separation
- [ ] Error handling: ErrorBoundary global

### Testing Debt Resolved ✅

- [ ] Backend coverage: ≥85%
- [ ] Frontend coverage: ≥70%
- [ ] E2E tests: 6+ critical flows
- [ ] Security tests: passing without vulnerabilities
- [ ] Build time: <10 min

### Specification Debt Resolved ✅

- [ ] REQUIREMENTS.md: 5+ HU with criteria
- [ ] CLINICAL_SPECIFICATIONS.md: identidad, prioridades
- [ ] NON_FUNCTIONAL_REQUIREMENTS.md: SLA, compliance
- [ ] DEFINITION_OF_READY.md: HU checklist
- [ ] DEFINITION_OF_DONE.md: acceptance checklist

---

## 7. Risk Mitigation

### Risk: Long refactor breaks features

**Mitigation:**

- Feature branches for each sprint
- Daily integration testing
- Rollback plan per sprint

### Risk: Auth implementation blocks frontend

**Mitigation:**

- Frontend can mock JWT during FE-only sprint
- Backend JWT ready by end Sprint 1

### Risk: Database schema change (projections)

**Mitigation:**

- Migration scripts with rollback
- Dual-write during transition (in-memory + PostgreSQL)
- Smoke tests post-migration

---

## 8. Validación Post-Remediación

**Auditoría follow-up dalam 8 semanas:**

- [ ] Re-run static analysis (linter, coverage)
- [ ] Security scan (OWASP, injection)
- [ ] Performance testing (latency, throughput)
- [ ] E2E test execution
- [ ] Documentation review
- [ ] Compliance checklist (HIPAA, GDPR)

---

## 9. Debt Management Going Forward

**Para prevenir accumución de deuda:**

1. **Definition of Done enforcement:**
   - Tests required before merge
   - Coverage gates in CI/CD
   - Security checks pre-deploy

2. **Architecture reviews:**
   - Quarterly: check for debt accumulation
   - Tool: SonarQube for automated detection

3. **Documentation sync:**
   - Every HU linked to tests
   - Comments updated with code changes
   - Specs reviewed with domain experts

4. **Monitoring:**
   - Track coverage trends
   - Alert on new technical risks

---

## 10. Conversión a Backlog

Este documento (RF-AUDIT-006) converts to Product Backlog items:

```
EPIC: Address Critical Technical Debt (6-8 weeks)

STORY: Security Foundation (40 hrs)
  Task: Implement JWT authentication
  Task: Add rate limiting
  Task: Manage secrets securely
  Task: Add security headers

STORY: Architecture Refactor (80 hrs)
  Task: Persist projections to PostgreSQL
  Task: Modularize DI
  Task: Create infrastructure tests

STORY: Testing Expansion (100+ hrs)
  Task: Security test suite
  Task: Frontend unit tests
  Task: E2E tests

STORY: Specification Documentation (30 hrs)
  Task: Create REQUIREMENTS.md
  Task: Document clinical specs
  Task: Define DoR/DoD
```

---

**Auditoría completada:** 28 de febrero de 2026
**Clasificación final:** Enterprise-Ready = NOT ACHIEVED until all critical items resolved
**Próximo paso:** Aprobación ejecutiva + Sprint planning según prioridades P1-P10
