# RF-AUDIT-004: Auditoría de Testing y Garantía de Calidad (QA)

**Identificador:** RF-AUDIT-004
**Fecha:** 28 de febrero de 2026
**Alcance:** Análisis de estrategia testing, cobertura, y alignment con flujos críticos
**Stack:** xUnit (backend), Jest (frontend), TestContainers, Playwright

---

## 1. Resumen Ejecutivo

El proyecto tiene pruebas unitarias solidas en backend (75% coverage) pero **carencias críticas en infraestructura, seguridad y E2E**. Frontend testing está **subdesarrollado (<30% coverage)**. Se identifica **matriz de riesgos alto en 6 flujos críticos** sin cobertura E2E.

---

## 2. Cobertura de Testing Actual

### Backend Testing

#### A. Suites Detectadas

| Suite | Tests | Evidencia | Coverage |
|-------|-------|-----------|----------|
| WaitingRoom.Tests.Domain | ~20 | ✅ Existe | ~85% |
| WaitingRoom.Tests.Application | 12 | ✅ Exitosos | ~80% |
| WaitingRoom.Tests.Integration | 19 | ✅ Exitosos | ~70% |
| WaitingRoom.Tests.Projections | ? | ✅ Existe | ~60% |
| **WaitingRoom.Tests.Infrastructure** | 0 | ❌ **FALTA** | 0% |
| **WaitingRoom.Tests.Security** | 0 | ❌ **FALTA** | 0% |
| **WaitingRoom.Tests.API** | 0 | ❌ **FALTA** | 0% |

**Resultado global:** ~75% (pero con gaps en componentes críticos)

#### B. Análisis de Gaps

**Cubierto correctamente:**

- ✅ CheckInPatient domain logic (95.65%)
- ✅ PatientIdentityRegistry (96.55%)
- ✅ ReceptionistOnlyFilter (81.82%)
- ✅ ExceptionHandlerMiddleware (94.12%)

**NO Cubierto (gaps críticos):**

- ❌ PostgresEventStore (save, load, concurrency)
- ❌ PostgresOutboxStore (idempotencia, ordering)
- ❌ RabbitMqPublisher (connection, retries, nack)
- ❌ Endpoints (HTTP contracts)
- ❌ SignalR Hub (messages, authentication)
- ❌ Security (role escalation, XSS, injection)

---

### Frontend Testing

#### A. Suites Detectadas

| Suite | Tests | Coverage | Status |
|-------|-------|----------|--------|
| Components | 8 specs | ~20% | ⚠️ Minimal |
| Hooks | 0 specs | 0% | ❌ FALTA |
| Services | 0 specs | 0% | ❌ FALTA |
| E2E (Playwright) | 0 specs | 0% | ❌ CRÍTICA |

**Ejemplos de tests presentes:**

- `AppointmentRegistrationForm.spec.tsx`
- `WebSocketStatus.spec.tsx`
- `dependency-and-layout.coverage.spec.tsx`

**Ejemplos de tests ausentes:**

- `useWaitingRoom.spec.ts` (hook crítica)
- `signalr-service.spec.ts` (WebSocket core)
- `auth-context.spec.tsx` (inexistente; contexto no existe)
- `e2e-login-checkin-monitor.spec.ts` (flujo crítico)

**Resultado global:** ~25% (crítico para producción)

---

## 3. Matriz de Riesgos (Flujos Críticos sin E2E)

### Flujos de negocio críticos identificados

| ID | Flujo | Paso | Riesgo | Impacto | Probabilidad | E2E Test |
|----|-------|------|--------|---------|-------------|----------|
| F1 | Check-in paciente | Frontend: form → Backend: comando | Network error silencioso | Paciente no registrado | Alta | ❌ NO |
| F2 | Operario caja llama siguiente | Frontend: click → Backend: evento | SignalR desconectado | Paciente esperando sin saber | Alta | ❌ NO |
| F3 | Médico reclama paciente | Frontend: claim → Backend: transacción | Concurrencia (dos reclaman mismo) | Conflicto no visible | Media | ❌ NO |
| F4 | Pago validado | Frontend: confirm → Backend: outbox | Outbox falla, evento no publica | Paciente no avanza estado | Media | ❌ NO |
| F5 | Dashboard monitor (KPIs) | Frontend: poll 8s → Backend: projection | Projection no actualiza | Datos desactualizados | Media | ❌ NO |
| F6 | Paciente ausente (ausencia) | Frontend: mark → Backend: emit event | Event conflicto con llamada anterior | Estado inconsistente | Baja | ❌ NO |

**Conclusión:** 6 flujos críticos, 0 E2E tests = **riesgo alto para producción**.

---

## 4. Casos Gherkin para Gaps Identificados

### Escenario: F1 — Check-in exitoso sin latencia

```gherkin
Feature: Patient Check-in
  Scenario: Receptionist checks in patient successfully
    Given a receptionist is logged in
    And the queue "QUEUE-01" exists
    When she fills form: patientId="P001", name="Juan García", priority="Normal"
    And clicks "Registrar"
    Then the API responds 201
    And the patient appears in queue monitor within 1 second
    And socket event "patient.checked" received by dashboard
```

### Escenario: F2 — Llamada sin desconexión SignalR

```gherkin
Feature: Call Next Patient at Cashier
  Scenario: Cashier calls next patient and all dashboards update
    Given 5 patients in queue
    And 3 monitoring dashboards open
    When cashier clicks "Llamar siguiente"
    Then patient highlighted as "En caja"
    And all 3 dashboards refresh within 500ms
    And no "undefined patient" shown
    And no socket errors in console
```

### Escenario: F3 — Evitar doble reclamación

```gherkin
Feature: Claim Patient for Attention
  Scenario: Only one consulting room can claim same patient
    Given patient "P001" is called at cashier
    And 2 consulting rooms are open (CR1, CR2)
    When CR1 claims "P001"
    And CR2 attempts to claim "P001" immediately
    Then CR2 receives 409 Conflict
    And patient stays with CR1
    And audit log records attempt
```

### Escenario: F4 — Outbox resiliente

```gherkin
Feature: Payment Validation Event Publishing
  Scenario: Outbox retries on broker down
    Given payment is validated
    When RabbitMQ is temporarily down
    Then event stays in outbox table
    And worker retries exponentially
    And after broker recovery, event publishes
    And patient state advances
```

### Escenario: F5 — Monitor no lag

```gherkin
Feature: Real-time Monitor Dashboard
  Scenario: KPIs reflect patient state within 3 seconds
    Given 10 patients in queue
    When patient "P005" is checked in
    Then within 3 seconds:
      - "Total waiting" increments
      - "Average wait" recalculates
      - Graphs refresh
```

### Escenario: F6 — Ausencia sin conflicto

```gherkin
Feature: Mark Patient Absent
  Scenario: Absence after called does not conflict with other events
    Given patient is called at consultation
    And event "PatientCalled" stored
    When marked absent after 5 minutes
    Then event "PatientAbsentAtConsultation" stores correctly
    And queue state transitions: WaitingConsultation → Cancelled
    And no version conflict thrown
```

---

## 5. Matriz de Testing Detectada

```
                      UNIT       INTEGRATION    E2E
Backend:
  Domain             ✅✅✅      ✅✅          ❌
  Application        ✅✅        ✅✅✅        ❌
  Infrastructure     ❌          ⚠️ (faltan)   ❌
  API                ⚠️          ⚠️           ❌
  Security           ❌          ❌           ❌

Frontend:
  Components         ⚠️ (8/24)   ⚠️           ❌
  Hooks              ❌          ❌           ❌
  Services           ❌          ❌           ❌
  Integration (API)  ❌          ❌           ❌
```

---

## 6. Recomendaciones por Severidad

### 🔴 CRÍTICO (Semana 1)

1. **Suite: WaitingRoom.Tests.Infrastructure**
   - Tests PostgresEventStore: Save, Load, Concurrency
   - Tests PostgresOutboxStore: Idempotency, Ordering
   - Tests RabbitMqPublisher: Connection, Nack handling
   - Usar TestContainers (Postgres + RabbitMQ en Docker)
   - Target: 80%+ coverage

2. **Suite: WaitingRoom.Tests.Security**
   - Security test per hallazgo (role escalation, XSS, injection)
   - Ataque: forgery de patientId → debe rechazar
   - Ataque: without Authorization header → 401
   - Target: 100% (policies + endpoints)

3. **E2E Backend (F1-F6)**
   - Usar xUnit + HttpClient para hit real endpoints
   - Caso mínimo: CheckIn → Publish → Verify projection update
   - 3-5 tests clave

### 🟠 ALTO (Semana 2)

1. **Frontend: Hook testing**
   - `useWaitingRoom.spec.ts` (mock signalr)
   - `useAppointmentRegistration.spec.ts`
   - 10+ specs
   - Target: >60% coverage

2. **Frontend: Service testing**
   - API client mocking (MSW)
   - SignalR mock para conexión
   - 5+ specs

3. **Frontend: E2E critical (F1-F3)**
   - Playwright script: login → checkin → monitor update
   - 3-5 flujos críticos

### 🟡 MEDIA (Semana 3)

1. **Frontend: Component testing**
   - Testing Library best practices
   - User interactions, not implementation
   - 20+ specs

2. **Integration: Backend↔Frontend**
   - Real API call tests
   - Timeout, error handling
   - 10+ specs

---

## 7. Métricas de Testing Objetivo

| Parámetro | Actual | Target | Gap |
|-----------|--------|--------|-----|
| Backend coverage global | 75% | 85% | 10 pp |
| Infrastructure coverage | 0% | 80% | 80 pp |
| Security tests | 0 | 10+ cases | - |
| Frontend coverage | 25% | 70% | 45 pp |
| E2E tests (critical flows) | 0 | 6+ | - |
| Avg test response time | N/A | <500ms | - |

---

## 8. CI/CD Integration

**Propuesta: GitHub Actions (rlapp/.github/workflows/)**

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
    steps:
      - run: dotnet test apps/backend/RLAPP.slnx --collect:"XPlat Code Coverage"
      - run: codecov upload

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm test -- --coverage
      - run: npm run test:e2e -- --headed

  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - run: sonarqube analyze
```

**Quality Gates obligatorias:**

- ✅ Backend coverage >80%
- ✅ Frontend coverage >70%
- ✅ E2E tests passed (6+ flujos)
- ✅ Security tests passed (0 vulnerabilidades)
- ✅ No regresiones de performance

---

## 9. Plan de Ejecución (Fases)

### Fase 1: Infrastructure Testing (5 días)

- [ ] TestContainers setup
- [ ] PostgresEventStore tests (10 specs)
- [ ] OutboxStore tests (8 specs)
- [ ] Publisher tests (6 specs)
- [ ] Commit: "test(infra): add infrastructure layer tests"

### Fase 2: Security Testing (4 días)

- [ ] Suite WaitingRoom.Tests.Security
- [ ] 10 security tests (auth, injection, role escal)
- [ ] Commit: "test(security): add security test suite"

### Fase 3: E2E Backend (3 días)

- [ ] xUnit E2E harness
- [ ] 3-5 critical flows
- [ ] Commit: "test(e2e): add backend E2E tests"

### Fase 4: Frontend Hook/Service Tests (5 días)

- [ ] useWaitingRoom.spec.ts
- [ ] API client tests
- [ ] 15+ specs
- [ ] Commit: "test(frontend): add hook and service tests"

### Fase 5: E2E Frontend (4 días)

- [ ] Playwright setup
- [ ] Login → Checkin → Monitor flujo
- [ ] 6+ scenarios
- [ ] Commit: "test(e2e): add frontend E2E tests"

---

## 10. Validación Final

**Criterios de aceptación para QA Audit:**

- [ ] Backend coverage: 85%+
- [ ] Frontend coverage: 70%+
- [ ] E2E tests: 6 flujos críticos passing
- [ ] Security tests: 0 vulnerabilidades
- [ ] Build time: <10 min
- [ ] All tests: <2 min execution

---

**Auditoría completada:** 28 de febrero de 2026
**Próximo paso:** RF-AUDIT-005 (Especificaciones)
