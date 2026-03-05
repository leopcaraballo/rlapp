# RF-AUDIT-005: Auditoría de Especificaciones y Documentación

**Identificador:** RF-AUDIT-005
**Fecha:** 28 de febrero de 2026
**Alcance:** Análisis de alineación código ↔ especificaciones, granularidad de HU, DoR/DoD
**Estándar:** IEEE 830, ISO/IEC/IEEE 29148

---

## 1. Resumen Ejecutivo

No se detecta repositorio formal de historias de usuario (Jira/Azure Boards). La documentación está fragmentada entre archivos .md sin estructura INVEST. Se identifica **desalineación código ↔ documentación** y **granularidad problemática**.

| Hallazgo | Evidencia | Severidad |
|----------|-----------|-----------|
| Sin artefactos de HU | Ningún HU.md, no existe backlog | 🔴 CRÍTICA |
| Documentación fragmentada | Arquitectura.md, DEBT.md, API.md sin índice | 🟠 ALTA |
| DoR/DoD no formales | Especificaciones ad-hoc en comentarios | 🟠 ALTA |
| Campo de aceptación débil | Tests son "criterios de aceptación" implícitamente | 🟡 MEDIA |

---

## 2. Análisis de Artefactos de Especificación

### A. Ubicación de especificaciones en repositorio

```
docs/
├── ARCHITECTURE.md       (sí)
├── OPERATING_MODEL.md    (sí)
├── TESTING.md            (sí)
├── DEBT.md               (sí)
├── API.md                (sí)
├── TDD_BDD_IMPACT_REPORT.md

rlapp-backend/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEBT.md
│   ├── TESTING.md

rlapp-frontend/
├── README.md

FALTA:
├── REQUIREMENTS.md (o similar)
├── USER_STORIES.md
├── ACCEPTANCE_CRITERIA.md
├── PRODUCT_BACKLOG.md
```

**Conclusión:** Arquitectura documentada; **especificaciones de usuario NO centralizadas**.

---

### B. Especificaciones detectadas en código (implícitas)

Analizando el dominio, se deducen las siguientes HU que **NO están explícitamente documentadas**:

#### HU-01: Registrar paciente en sala de espera

**Ubicación en código:** WaitingQueue.CheckInPatient()
**Línea:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain/Aggregates/WaitingQueue.cs:120-145](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain/Aggregates/WaitingQueue.cs#L120)
**Evento dominio:** `PatientCheckedIn`
**Backend handler:** `CheckInPatientCommandHandler`

**Problemas:**

- ❌ HU no existe en backlog formal
- ❌ Criterios de aceptación no documentados
- ❌ No especifica: "¿Qué pasa si paciente sin identidad?"
- ✅ El código sí implementa: validación identidad, validación capacidad, orden por prioridad

**Especificación deducida:**

```gherkin
Feature: Patient Check-in
  Scenario: Receptionist registers patient
    Given nurse is at reception desk
    When she enters: patientId, name, priority, type
    Then patient is added to waiting queue
    And dashboard shows updated count
    And patient sees "waiting" status

  Scenario: Duplicate patient rejection
    Given patient "P001 Juan García" already checked in
    When receptionist tries again with "P001 Juan García"
    Then system accepts (idempotent, same name)

  Scenario: Identity conflict detection
    Given patient "P001" was "Juan García"
    When receptionist enters "P001 Carlos García"
    Then ERROR: 409 Patient Identity Conflict
    And message: "Patient already registered with different name"
```

**Verificación de cumplimiento:**

- ✅ Validación identidad: [rlapp-backend/docs/ARCHITECTURE.md#L25-L30](rlapp-backend/docs/ARCHITECTURE.md#L25)
- ✅ Idempotencia: PatientIdentityRegistry compara
- ✅ Error 409: ExceptionHandlerMiddleware convierte

---

#### HU-02: Operario caja llama siguiente paciente

**Ubicación:** WaitingQueue.CallNextAtCashier()
**Línea:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain/Aggregates/WaitingQueue.cs:220-260](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain/Aggregates/WaitingQueue.cs#L220)
**Evento:** `PatientCalledAtCashier`

**Deducción:**

```gherkin
Feature: Call Next Patient at Cashier
  Scenario: Cashier calls next high-priority patient
    Given waiting queue has patients: P001(High), P002(Normal), P003(Normal)
    When cashier clicks "Siguiente"
    Then P001 is marked as "En caja"
    And P001 sees status change in real-time
    And signal sent to cashier station

  Scenario: No patients available
    Given queue is empty
    When cashier clicks "Siguiente"
    Then error: "No waiting patients"
```

**Problemas:**

- ❌ No documenta: prioridades exactas (High/Normal/Low o números?)
- ❌ No especifica: tiempos SLA si paciente no se presenta (timeout?)
- ✅ Código implementa: priority-based ordering, concurrent validation

---

#### HU-03: Médico reclama paciente para consulta

**Ubicación:** WaitingQueue.ClaimNextPatient()
**Línea:** [rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain/Aggregates/WaitingQueue.cs:150-175](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain/Aggregates/WaitingQueue.cs#L150)
**Evento:** `PatientClaimedForAttention`

**Deducción implícita:**

```gherkin
Feature: Claim Patient for Consultation
  Scenario: Consulting room claims next waiting patient
    Given patients at cashier ready for consultation
    When doctor room CR1 clicks "Reclamar"
    Then next patient moves to CR1
    And other CR's cannot see this patient
    And timer starts for max consult time?

  Scenario: Prevent double-claim
    Given patient P001 shown in dashboard
    When CR1 and CR2 click simultaneously
    Then only CR1 succeeds (optimistic lock on Version)
    And CR2 gets: 409 Conflict
```

**Problemas:**

- ❌ No especifica: ¿hay timeout de consulta? (no existe en código)
- ❌ No especifica: máximo pacientes por médico
- ✅ Código protege concurrencia: event version conflict

---

#### HU-04: Validar pago

**Ubicación:** WaitingQueue.ValidatePayment()
**Evento:** `PaymentValidated`

**Deducción:**

```gherkin
Feature: Payment Validation
  Scenario: Validate payment successfully
    Given patient at cashier with payment pending
    When payment validated (in external system?)
    Then patient can proceed to consultation
    And status moves to "WaitingConsultation"
```

**Problemas GRAVES:**

- ❌ NO ESPECIFICA: ¿Quién valida el pago? ¿Backend? ¿External gateway?
- ❌ NO ESPECIFICA: ¿Qué información se requiere? (credit card, cash, insurance?)
- ❌ NO ESPECIFICA: ¿Qué pasa si validation falla?
- ❌ NO ESPECIFICA: ¿Timeout?
- ❌ CÓDIGO NO IMPLEMENTA: En WaitingQueue no hay lógica de pago real (es solo evento)

**Conclusión:** Esta HU está **sin implementación real en backend**. Solo es un estado en el agregado.

---

#### HU-05: Monitor de sala (dashboard en tiempo real)

**Frontend:** RealtimeAppointments, WaitingRoomDemo
**Backend:** Query endpoints (monitor, queue-state, next-turn)

**Deducción:**

```gherkin
Feature: Real-time Waiting Room Monitor
  Scenario: Receptionist sees patient counts by state
    Given dashboard open on monitor wall
    When patient checks in
    Then within 1 second, counts update
    And graphs refresh
    And no page reload needed

  Scenario: Metrics shown
    Then total waiting count
    And average wait time
    And time per check-in
    And consulting rooms occupied
```

**Problemas:**

- ❌ NO ESPECIFICA: SLA de actualización (código asume 8s polling + WebSocket signalR)
- ❌ NO ESPECIFICA: Qué métricas computar exactamente
- ✅ Código: implementa projections para denormalization

---

### C. Evaluación de Granularidad (INVEST)

**Criterio INVEST:** Independent, Negotiable, Valuable, Estimable, Small, Testable

| HU | Independent | Negotiable | Valuable | Estimable | Small | Testable | Calificación |
|----|-------------|-----------|----------|-----------|-------|----------|--------------|
| HU-01 (Check-in) | ✅ | ✅ | ✅ | ✅ | ⚠️ (identidad) | ✅ | BIEN |
| HU-02 (Call next) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | BIEN |
| HU-03 (Claim) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | BIEN |
| HU-04 (Payment) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **ÉPICA DISFRAZADA** |
| HU-05 (Monitor) | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | ⚠️ | **TOO LARGE** |

**Hallazgos:**

- HU-04 (Payment): **Épica.** Requiere:
  - Integración con gateway de pagos (externe?)
  - Validação clínica (¿paciente pagó o tiene cobertura?)
  - Manejo fallidas retries
  - Auditoría de pago
  → Debería descomponerse en: "Procesar pago", "Validar cobertura", "Manejo fallida"

- HU-05 (Monitor): **Demasiado grande.** Requiere:
  - Cálculo de métricas (estadísticas)
  - Selección de gráficos
  - Responsividad (mobile? desktop?)
  → Debería ser: "Mostrar contador pacientes", "Mostrar tiempos promedio", "Mostrar utilización salas"

---

## 3. Definition of Ready (DoR) — Análisis

**DoR esperado** para que HU sea "aceptable" en sprint:

```checklist
[ ] Historia tiene aceptación <= 8 puntos de historia
[ ] Criterios de aceptación >= 3, <= 8 casos
[ ] Tiene definidas dependencias externas (API, BD, auth?)
[ ] Riesgos técnicos identificados
[ ] Estimación de effort hecha
[ ] Task breakdown: qué hacer en FE, QA, BE
[ ] Claridad sobre scope (qué SÍ, qué NO entra)
```

**Aplicado a HU detectadas:**

| HU | DoR Met? | Gap |
|----|----------|-----|
| HU-01 | ❌ 60% | Identidad conflic no especificado claramente |
| HU-02 | ❌ 70% | Prioridades no cuantificadas |
| HU-03 | ❌ 60% | Timeout, concurrencia no aclarados |
| HU-04 | ❌ 30% | Payment gateway no especificado; es ÉPICA |
| HU-05 | ❌ 40% | Métricas no definidas; demasiado grande |

**Conclusión:** Ninguna HU tiene DoR formalizados.

---

## 4. Definition of Done (DoD) — Análisis

**DoD esperado:**

```checklist
[ ] Código escrito (FE + BE)
[ ] Code review aprobado
[ ] Unit tests: >80% coverage
[ ] HU criteria tests: all passing
[ ] Integration tests: passed
[ ] No bugs abiertos
[ ] Documentación actualizada
[ ] Performance OK (< target SLA)
[ ] Security: OWASP checklist OK
[ ] Linter: 0 errors
[ ] Git commit: convencional format
```

**Análisis en codebase:**

- ✅ Código escrito (evidencia en Domain, Application, API)
- ✅ Tests existen y pasan
- ❌ **Pero NO hay DoD *formal***, solo asunción implícita en tests

**Nota:** El hecho de que tests existan sugiere DoD existe implícitamente, pero no está documentado.

---

## 5. Alineación Código ↔ Especificación

**Análisis de drift:**

| Área | Especificado | Implementado | Problema |
|------|--------------|--------------|----------|
| Waiting queue lifecycle | Sí (BDD style) | Sí | Alineación OK |
| Patient identity validation | Partial (en DEBT.md) | Sí | Especificación débil |
| Priority ordering | Código lo hace | No documentado | Documentación lag |
| Concurrent access (pessimistic lock) | No | Sí (version check) | Over-implementation |
| Payment integration | No | Skeleton (stub) | Incomplete spec |
| Real-time updates | Sí (polling + signalr) | Sí | Especificación vaga (SLA?) |
| Accesibilidad clínica (HIPAA) | No | NO | **Gap crítico** |

**Hallazgo:** Arquitectura está **bien alineada**, pero especificaciones de usuario son **incompletas**.

---

## 6. Hallazgos de Especificación

### H-SPEC-001: Sin repositorio formal de HU

**Criticidad:** 🔴 **CRÍTICA**
**Evidencia:** No existe REQUIREMENTS.md, USER_STORIES.md, o integración Jira
**Riesgo:** Cambios scope sin rastreo; burndown inaccurado; no hay "single source of truth"
**Recomendación:** Crear `docs/REQUIREMENTS.md` con:

- 5 HU definidas: Check-in, CallNext, Claim, Monitor, Payment
- Criterios de aceptación per HU
- Links a tests

---

### H-SPEC-002: HU-04 (Payment) es épica sin descomposición

**Criticidad:** 🔴 **CRÍTICA**
**Evidencia:** Feature completa de pago no especificada; código solo tiene skeleton
**Riesgo:** Sprint planning impreciso; uncertainty en estimación
**Recomendación:** Descomponer en:

- HU-04a: Procesar pago con gateway (XYZ API)
- HU-04b: Validar cobertura
- HU-04c: Manejar fallo pago + retry

---

### H-SPEC-003: Especificaciones clínicas están en código, no en docs

**Criticidad:** 🔴 **CRÍTICA**
**Evidencia:**

- PatientIdenti conflictValidation lógica en [PostgresPatientIdentityRegistry](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Infrastructure/Persistence/PatientIdentityRegistry.cs)
- Priorizaciones en [WaitingQueue.ClaimNextPatient](rlapp-backend/src/Services/WaitingRoom/WaitingRoom.Domain/Aggregates/WaitingQueue.cs#L150)
**Problema:** Médicos/operarios no leen código; modifican regla sin consultar
**Recomendación:** Crear `docs/CLINICAL_SPECIFICATIONS.md`:

```markdown
## Identidad Clínica
- Paciente identificado por: patientId (UUID) + nombre completo
- Si mismo patientId con nombre distinto → conflicto (requiere verificación manual)
- Resolución: operario consultó ID real, actualiza nombre, intenta de nuevo

## Prioridades
- Alta: procedimientos urgentes
- Normal: rutina
- Baja: check-up preventivo
- Ordenamiento: High → Normal → Low, luego por hora arrival
```

---

### H-SPEC-004: DoR y DoD no formalizados

**Criticidad:** 🟠 **ALTA**
**Evidencia:** No existe `Definition of Ready.md` o `Definition of Done.md`
**Riesgo:** Inconsistencia en q checklist; overhead en code reviews
**Recomendación:** Crear:

- `docs/DEFINITION_OF_READY.md`
- `docs/DEFINITION_OF_DONE.md`

---

### H-SPEC-005: HU-05 (Monitor) granularidad problemática

**Criticidad:** 🟠 **ALTA**
**Evidencia:** Combina "mostrar datos" + "calcular métricas" + "sync tiempo real"
**Recomendación:** Descomponer:

- HU-05a: Mostrar contador de pacientes por estado
- HU-05b: Calcular promedio tiempo espera
- HU-05c: Refresh automático via WebSocket (SLA: <1s)

---

### H-SPEC-006: Requisitos no funcionales (RNF) no documentados

**Criticidad:** 🟠 **ALTA**
**Ejemplos de RNF faltantes:**

- "Monitor debe actualizar en <1 segundo" (asumido, no especificado)
- "Check-in API debe responder en <500ms" (no hay SLA documentado)
- "Queue max 200 pacientes" (asumido, no validado)
- "Disponibilidad 99.5%" (no especificado)
- "Auditoría clínica: log todas intentos" (no implementado)

**Recomendación:** Crear `docs/NON_FUNCTIONAL_REQUIREMENTS.md`:

```markdown
## Performance
- API response: <500ms p95
- Monitor update: <1s
- Dashboard load: <3s

## Reliability
- Uptime: 99.5%
- RTO: 5 min
- RPO: <1 min

## Security
- Encryption: TLS 1.3
- Auth: JWT HS256
- Audit: all mutations logged

## Compliance
- HIPAA privacy rules
- Data retention: 7 años
```

---

## 7. Tabla Consolidada

| ID | Componente | Hallazgo | Severidad | Recomendación |
|----|-----------|----------|-----------|---------------|
| H-SPEC-001 | Reqs | Sin repo formal | 🔴 CRÍTICA | REQUIREMENTS.md |
| H-SPEC-002 | HU-04 | Épica disfrazada | 🔴 CRÍTICA | Descomponer en 3 HU |
| H-SPEC-003 | Clínica | Specs en código | 🔴 CRÍTICA | CLINICAL_SPECIFICATIONS.md |
| H-SPEC-004 | DoR/DoD | No formalizados | 🟠 ALTA | DoR.md + DoD.md |
| H-SPEC-005 | HU-05 | Granularidad > 8 pts | 🟠 ALTA | Descomponer en 3 HU |
| H-SPEC-006 | RNF | No documentados | 🟠 ALTA | NON_FUNCTIONAL_REQUIREMENTS.md |

---

## 8. Plan de Remediación

### Crear estructura de specificaciones

```
docs/
├── REQUIREMENTS.md (5 HU core)
├── CLINICAL_SPECIFICATIONS.md (identidad, prioridades)
├── NON_FUNCTIONAL_REQUIREMENTS.md (SLA, compliance)
├── DEFINITION_OF_READY.md (checklist pre-sprint)
├── DEFINITION_OF_DONE.md (checklist post-implementation)
└── BACKLOG.md (product backlog priorizado)
```

---

**Auditoría completada:** 28 de febrero de 2026
**Próximo paso:** RF-AUDIT-006 (Deuda Técnica Consolidada)
