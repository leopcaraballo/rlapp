# Official Governance Baseline (OGB) v1.0 - ENTERPRISE-BINDING

**Sistema:** LCWPS (Luxury Clinic Waiting Panel System)
**Jurisdicción:** Colombia
**Categoría:** Infraestructura crítica de salud-financiero
**Fecha vigencia:** 24 de febrero de 2026
**Versión:** 1.0 - CONTRACTUALLY BINDING
**Scope:** `rlapp-backend/` (ÚNICAMENTE)

---

## 1. Autoridad Regulatoria Aplicable

### Marco Nacional (Colombia)

| Norma | Aplicabilidad | Componente Afectado |
|-------|--------------|-------------------|
| Ley 1581 de 2012 | Protección de datos personales | Almacenamiento de datos clínicos, pacientes |
| Decreto 1377 de 2013 | Reglamentación Ley 1581 | Consentimiento informado, acceso a datos |
| Ley 23 de 1981 | Código Sanitario Nacional | Confidencialidad de información médica |
| Resolución 2141 de 2015 (MinTIC) | Requisitos técnicos de seguridad | Encriptación, auditoría, backup |
| Circular Externa 000031 de 2023 (SFC) | Validación manual de transacciones financieras | Aprobación dual de pagos clínicos |
| Supersalud | Supervisión de instituciones de salud | Reportes trimestrales, cumplimiento normativo |
| Habeas Data | Derecho a datos personales | Acceso, rectificación, cancelación |

### Marco Internacional

| Estándar | Aplicabilidad | Componente Afectado |
|----------|--------------|-------------------|
| ISO 27001:2022 | Sistema de Gestión de Seguridad de Información | Controles de acceso, auditoría, encriptación |
| ISO 25010 | Calidad de software | Mantenibilidad, fiabilidad, seguridad |
| NIST Cybersecurity Framework (CSF) | Identificar, proteger, detectar, responder, recuperar | Threat modeling, incident response |
| OWASP Top 10 | Vulnerabilidades web críticas | Injection, broken auth, sensitive data exposure |
| GDPR Principles (aplicables a ciudadanos EU radicados en Colombia) | Consentimiento, minimización de datos | Anonimización, derecho al olvido |

---

## 2. Principios de Gobernanza No Negociables

### 2.1 Soberanía de Datos

- **Almacenamiento exclusivo en PostgreSQL en-jurisdicción (Colombia)**
- **Prohibido:** Replicación a nubes extrajurisdiccionales sin cifrado de extremo a extremo
- **Cifrado:** AES-256 para datos en reposo, TLS 1.3 para datos en tránsito
- **Auditoría:** Logging inmutable de todo acceso a datos

### 2.2 Tenant Isolation (Multi-tenant)

- **Cada clínica = tenant aislado**
- Validación de tenant en CADA operación de lectura/escritura
- Row-Level Security (RLS) en PostgreSQL OBLIGATORIO
- Prohibidas consultas sin filtro de tenant_id
- **INCUMPLIMIENTO = defecto crítico de seguridad**

### 2.3 Invariantes Financieros Inmutables

- **Principio:** Ninguna cita puede transicionar a estado "En Espera" sin aprobación financiera explícita
- **Domain Event:** `FinancialValidationCompleted` persistido en Event Store
- **Audit Trail:** Registro append-only de cada validación (5 años mínimo)
- **Dual Control:** Validación manual + segunda aprobación para montos >UVR 600
- **Prohibido:** Bypass de validación, aprobación automática, auto-aprobación

### 2.4 Trazabilidad y Retención

- **Cadena de custodia:** Commit → Pull Request → Aprobación → Pipeline → Tag → Deployment
- **Retención mínima:** 5 años (Ley 1581, normativa contable)
- **Backup:** Geo-redundante cada 15 minutos, RTO ≤ 4 horas
- **Auditoría:** Logs centralizados, imposible eliminar/modificar histórico

### 2.5 Enforcement Técnico (No Negociable)

- **Arquitectura:** .NET 10 LTS, Clean Architecture, DDD estricto
- **Eventos:** Event Sourcing + CQRS (no optional)
- **Base de datos:** PostgreSQL con RLS habilitado
- **Mensajería:** RabbitMQ con durabilidad confirmada
- **Observabilidad:** OpenTelemetry + Prometheus + Grafana
- **Anti-patrón:** Modificar o deshabilitar estas tecnologías = violación de governance

---

## 3. Governance Workflow (IA-Nativa)

### 3.1 Ciclo de Cambio Autorizado

```
Prompt (Usuario/IA)
    ↓
AI Output (Sub-agent genera código)
    ↓
Human Review (Revisor aprueba cambio)
    ↓
Signed Commit (Con firma GPG)
    ↓
Pull Request (Cross-approval requerida)
    ↓
CI/CD Gates (SAST, tests, coverage checks)
    ↓
Approval Board (2 colaboradores + 0 auto-approval)
    ↓
Merge a develop
    ↓
Pipeline a qa/main (Automático si gates pasan)
    ↓
Deployment (Con traceabilidad inmutable)
```

### 3.2 Documentación IA-Nativa (OBLIGATORIA)

Todo cambio IA-generado DEBE incluir:

```
rlapp-backend/docs/ai-generated/YYYY-MM-DD-change-summary.md
```

Contenido mínimo:


- **Prompt:** Solicitud original
- **AI Model:** Qué modelo generó el código (Claude Opus 4.5, GPT-5.x, etc.)
- **Changes:** Descripción de archivos modificados
- **Invariants Verified:** ¿Cuáles invariantes de dominio se validaron?
- **Tests Added:** Coverage %
- **Security Scan:** SAST gaps (si hay)
- **Human Reviewer:** Firma, fecha
- **Approval Status:** Approved / Rejected / Needs Revision

**SIN este archivo = PR rechazada automáticamente**

---

## 4. Financiero: Validación Manual (CIF-01)

### 4.1 Invariantes de Dominio

```csharp
// DO NOT RELAX THESE RULES
public class Appointment
{
    public AppointmentStatus Status { get; set; }
    public FinancialValidationStatus FinancialStatus { get; set; }

    // INVARIANT: Cannot transition to Waiting unless approved
    public void TransitionToWaiting()
    {
        if (FinancialStatus != FinancialValidationStatus.Approved)
            throw new InvalidOperationException(
                "Cita no puede pasar a 'En Espera' sin validación financiera aprobada");
    }

    // INVARIANT: Only titled medical staff can approve
    public void ApproveFinancially(ApprovedBy approver)
    {
        if (approver.Role != MedicalRole.Physician &&
            approver.Role != MedicalRole.FinanceDirector)
            throw new SecurityException("No autorizado para aprobar validación financiera");
    }

    // INVARIANT: Prevent double approval
    public void ApproveFinancially(ApprovedBy approver)
    {
        if (this.ApprovedAt.HasValue)
            throw new InvalidOperationException("Cita ya fue aprobada financieramente");
    }
}
```

### 4.2 Event Sourcing Requirement

- **Event:** `FinancialValidationCompleted` → persistido en Event Store
- **Payload:** `{ appointmentId, approvedBy, approvedAt, amount, justification, override }`
- **Immutable:** Hash criptográfico de cada evento (SHA-256)
- **Published:** A RabbitMQ con confirmación de entrega

### 4.3 Audit Trail (Append-Only)

```sql
-- Table: financial_audit_log (NEVER DELETE, NEVER UPDATE)
CREATE TABLE financial_audit_log (
    id BIGSERIAL PRIMARY KEY,
    appointment_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'SUBMITTED', 'APPROVED', 'REJECTED', 'OVERRIDE'
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(15,2) NOT NULL,
    justification TEXT,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security (RLS)
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Tenant isolation
CREATE POLICY tenant_isolation ON financial_audit_log
    USING (tenant_id = current_user_id());
```

### 4.4 Dual Control Requirements

- **Monto ≤ UVR 100:** Aprobación individual (Médico)
- **UVR 100 < Monto ≤ UVR 600:** Segunda aprobación (Finance Director)
- **Monto > UVR 600:** CCO override + auditoría a Supersalud
- **Prohibido:** Aprobación automática, bypass, self-approval

---

## 5. Git Flow Governance (STRICT)

### 5.1 Ramas Autorizadas (ÚNICAMENTE)

```
main          ← Production (Protected, signed commits only)
qa            ← Quality assurance (Protected)
develop       ← Integration (Protected)
feature/*     ← Feature development (Unprotected, auto-delete post-merge)
```

### 5.2 Prohibiciones Absoluta

- ❌ release/ (NO USAR)
- ❌ hotfix/*(NO USAR—use feature/hotfix-*)
- ❌ experiment/*
- ❌ directos a main
- ❌ directos a develop
- ❌ directos a qa
- ❌ rebasing en main
- ❌ force push
- ❌ history rewriting

### 5.3 Workflow Obligatorio

```bash
# 1. SIEMPRE comenzar desde develop (más reciente)
git checkout develop
git pull origin develop

# 2. Crear feature branch
git checkout -b feature/financial-validation-endpoint

# 3. En stacking de features:
#    Nueva feature=branch desde feature más recientemente updated & green

# 4. Commit con firma GPG
git commit -S -m "feat(financial): add manual validation endpoint

BREAKING CHANGE: Citas requieren aprobación financiera explícita

Ref: CIF-01, Ley 1581, Circular SFC 000031"

# 5. Push a origin
git push origin feature/financial-validation-endpoint

# 6. Crear PR (OBLIGATORIO) con template compliance
# → Cross-approval requerida (mínimo 2 colaboradores)
# → No auto-approval
# → Tests ≥ 90% coverage
# → Domain coverage ≥ 95%
# → SAST gaps = 0
# → Dependency scan aprobado
```

### 5.4 Merge Requirements to Develop

| Criterio | Requerimiento | Owner |
|----------|--------------|-------|
| Tests | Coverage ≥ 90% | Desarrollador |
| Domain Logic | Cobertura de invariantes ≥ 95% | Arquitecto |
| Code Review | Cross-approval (2 personas, 0 self) | Tech Lead |
| Security | SAST approved, 0 critical gaps | SecOps |
| Dependencies | Scan clean, no vulnerabilities | DevOps |
| Commits | Signed (GPG), conventional format | Git admin |
| Documentation | Change summary, // HUMAN CHECK | Developer |
| Compliance | PR template completo, AI audit trail | Governance |

**MERGE BLOCKER:** Cualquier criterio no cumplido = PR rechazada automáticamente

---

## 6. Quality & Domain Validation

### 6.1 TDD Obligatorio (Red → Green → Refactor)

```csharp
// RED: Test falla (función no existe)
[Fact]
public void TransitionToWaiting_WhenNotApproved_ThrowsException()
{
    var appointment = new Appointment { FinancialStatus = FinancialValidationStatus.Pending };

    Assert.Throws<InvalidOperationException>(() => appointment.TransitionToWaiting());
}

// GREEN: Implementación mínima que pasa test
public void TransitionToWaiting()
{
    if (FinancialStatus != FinancialValidationStatus.Approved)
        throw new InvalidOperationException("...");
    Status = AppointmentStatus.Waiting;
}

// REFACTOR: Mejora sin cambiar behavior, tests siguen pasando
// — Extracto método, mejoro nombres, añado logging, etc.
```

### 6.2 Domain Coverage ≥ 95% (Financial Invariants)

Zona crítica: `Appointment`, `FinancialValidation`, `PaymentProcess`

```bash
# Test structure
src/
├── BuildingBlocks/Domain/             # Entidades core
├── Services/AppointmentService/       # Domain logic
└── Tests/Domain/                      # Tests 100% obligatorio
    ├── AppointmentAggregateTests.cs
    ├── FinancialValidationTests.cs
    └── PaymentInvariantTests.cs

# Covertura mínimas por tipo
Unit tests (AppointmentAggregate):    ≥ 95%
Integration tests (Financial flows):   ≥ 90%
Contract tests (RabbitMQ events):     ≥ 85%
```

### 6.3 Mutation Testing (Anti-fragility)

Validar que tests realmente verifican lógica:

```bash
# Stryker for .NET
dotnet tool install -g dotnet-stryker
dotnet stryker --lang-version 12.0
```

**PASS Criteria:** ≥ 80% mutation score en domain/financial

---

## 7. Security & Data Protection

### 7.1 Data Classification

| Clasificación | Ejemplos | Cifrado | RLS | Auditoría |
|----------------|----------|---------|-----|-----------|
| SECRET | Cédula paciente, SSN, datos clínicos | AES-256 en reposo + TLS 1.3 en tránsito | + | Cada lectura |
| CONFIDENTIAL | Email, teléfono, dirección | AES-256 | + | Periódica |
| INTERNAL | Appointment metadata | Standard TLS | + | Acceso anómalo |
| PUBLIC | Horarios clínica | No requerido | - | No requerido |

### 7.2 Encryption At Rest & In Transit

```csharp
// Database encryption (PostgreSQL)
CREATE DATABASE lcwps_prod
    WITH sslmode = 'require'
    AND ssl_ca_file = '/etc/ssl/certs/ca-bundle.crt'
    AND ssl_key_file = '/etc/ssl/private/backend.key'
    AND ssl_cert_file = '/etc/ssl/certs/backend.crt';

// Column-level encryption (sensitive fields)
CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    patient_ssn BYTEA NOT NULL, -- Encrypted with pgcrypto
    patient_ssn_iv BYTEA NOT NULL,
    CONSTRAINT patient_ssn_unique UNIQUE (pgp_sym_decrypt(patient_ssn, 'master-key'))
);
```

### 7.3 Row-Level Security (RLS) MANDATORY

```sql
-- Every table must have RLS enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON appointments
    FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM current_auth_context()));

CREATE POLICY role_based_read ON appointments
    FOR SELECT
    USING (
        (current_user_role() = 'PHYSICIAN' AND physician_id = current_user_id())
        OR (current_user_role() = 'ADMIN')
    );
```

### 7.4 OpenTelemetry Tracing (Security + Performance)

```csharp
// Logs de seguridad (nivel WARNING+)
builder.Services.AddOpenTelemetry()
    .WithTracing(tracingBuilder => tracingBuilder
        .AddSource("FinancialValidation.Service")
        .AddConsoleExporter());

// En domain logic
Activity.Current?.SetTag("security.action", "financial_approval");
Activity.Current?.SetTag("tenant_id", context.TenantId);
logger.LogWarning("FinancialValidation approved by {user} for {amount}",
    context.ApprovedBy, context.Amount);
```

---

## 8. Audit & Compliance Reporting

### 8.1 Quarterly Supersalud Report

Estructura mínima (enviado cada trimestre):

```
LCWPS - Quarterly Security Report
Q1 2026

1. Availability & Continuity
   - Uptime: 99.95%
   - RTO: 4 horas
   - Incident count: 0 critical

2. Data Breaches
   - Incidents: 0
   - Root causes: N/A
   - Remediation: N/A

3. Financial Validation Compliance
   - Total approvals: 1,247
   - Manual review rate: 100%
   - Dual-control rate (>UVR 100): 98%
   - Discrepancies: 0

4. GDPR/LEY 1581 Compliance
   - Data access requests: 12
   - Time to fulfillment: ≤ 15 días (legal requirement)
   - Denial rate: 0%
   - Unsubscribe/deletion requests: 8 (all processed)

5. Security Controls
   - Last penetration test: 2025-11-20
   - Vulnerabilities fixed: 3 (all critical)
   - Phishing simulations: 1 (92% success, retraining applied)
```

### 8.2 Audit Trail Query (Investigación Interna)

```sql
SELECT
    appointment_id,
    action,
    performed_by,
    performed_at,
    amount,
    justification
FROM financial_audit_log
WHERE appointment_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY performed_at DESC;
-- Result: Immutable, cryptographically hashed per event
```

---

## 9. Escalation & Incident Response

### 9.1 Governance Escalation Matrix

| Escenario | Escalada a | SLA |
|-----------|-----------|-----|
| Violación de tenant isolation | CISO + CTO | 15 minutos |
| Double-spend en validación financiera | Finance Director + Legal | 30 minutos |
| Breach de datos clínicos | DPO + Supersalud | 1 hora |
| Self-approval en financiero | Governance Board + Auditoría | 4 horas |
| Production deployment sin approval | Security Officer + COO | Rollback inmediato |

### 9.2 Incident Response Protocol

```bash
INCIDENT DETECTED (SIEM alert)
    ↓
Verify (¿Falso positivo?)
    ↓
Classify (Severity: Critical/High/Medium/Low)
    ↓
Contain (Disable access, quarantine if needed)
    ↓
Investigate (Audit trail query, forensics)
    ↓
Remediate (Patch, change credentials, etc.)
    ↓
Document (Incident report, root cause analysis)
    ↓
Report (Supersalud si breach comprobado)
    ↓
Close (Post-mortem, process improvement)
```

---

## 10. Change Governance (Human + AI-Native)

### 10.1 Aprobación 2-Colaboradores (NO Self-Approval)

```
Desarrollador A (Autor)
    ↓ (crea PR)
Desarrollador B (Revisor 1) → Aprueba
    ↓ (verifica tests, seguridad)
Desarrollador C (Revisor 2) → Aprueba
    ↓ (verifica dominio, compliance)
Tech Lead (Merge executor, ≠ Autor)
    ↓ (ejecuta merge, genera tag)
Deployment automático a develop
```

**Prohibición:** Developer A NO PUEDE ser Revisor 1 o 2 o executor.

### 10.2 IA-Workflow Traceability

Cada cambio generado por IA:

1. **Prompt** → `rlapp-backend/docs/ai-generated/YYYY-MM-DD-prompt.txt`
2. **AI Model** → Documentado en change summary
3. **Output** → Código generado + tests
4. **Human Review** → Revisor markup: `// APPROVED` o `// NEEDS FIX`
5. **Commit** → Signed, con referencia a AI audit trail
6. **PR** → Bloqueado si falta `docs/ai-generated/YYYY-MM-DD-change-summary.md`

---

## 11. Governance Enforcement Checklist

- [ ] Todos cambios en `feature/*` ÚNICAMENTE
- [ ] PR template completado (compliance checklist)
- [ ] Tests ≥ 90%, domain ≥ 95%
- [ ] Commits con firma GPG
- [ ] 2-collaborator approval (no self-approval)
- [ ] SAST gaps = 0
- [ ] Dependency scan limpio
- [ ] IA audit trail (si aplica)
- [ ] RLS validado en tablas de datos sensibles
- [ ] Tenant isolation verificado
- [ ] Event sourcing para financiero
- [ ] No direct commits a develop/qa/main

**Incumplimiento = PR rechazada automáticamente por CI/CD**

---

**Documento:** GOVERNANCE_BASELINE.md v1.0
**Status:** ENTERPRISE-BINDING
**Vigencia:** 24 de febrero de 2026 — Indefinida
**Next Review:** Q3 2026
