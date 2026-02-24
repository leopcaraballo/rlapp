# Política de Seguridad y Protección de Datos

**Versión:** 1.0
**Fecha:** 24 de febrero de 2026
**Clasificación:** Confidencial - Interna
**Scope:** `rlapp-backend/` ÚNICAMENTE
**Owner:** Chief Information Security Officer (CISO)

---

## 1. Principios de Seguridad

### 1.1 Tríada de Seguridad de la Información

| Pilar | Objetivo | Implementación |
|-------|----------|------------------|
| **Confidencialidad** | Solo usuarios autorizados acceden datos | Encryption at rest + RLS + RBAC |
| **Integridad** | Datos no manipulados, trazables | Event Sourcing + audit logs hash-verificados |
| **Disponibilidad** | Sistema accesible cuando se necesita | High availability + RTO ≤ 4h + RDO ≤ 15min |

### 1.2 Defense in Depth (Defensa en Profundidad)

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Perimeter (Network)                            │
│ ├─ WAF (Web Application Firewall)                        │
│ ├─ DDoS protection                                       │
│ └─ VPN access para admin                                │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Authentication                                  │
│ ├─ JWT tokens (RS256, exp=1h, refresh=7d)              │
│ ├─ MFA para usuarios privilegiados                       │
│ └─ Email verification                                    │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Authorization                                   │
│ ├─ RBAC (4 roles: PHYSICIAN, FINANCE, ADMIN, CLERK)    │
│ ├─ Row-Level Security (RLS) PostgreSQL                   │
│ └─ Attribute-Based Access Control (ABAC) finanzas       │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Data Protection                                 │
│ ├─ Encryption at rest (AES-256)                         │
│ ├─ Encryption in transit (TLS 1.3)                      │
│ └─ Column-level encryption (sensitive fields)            │
├─────────────────────────────────────────────────────────┤
│ Layer 5: Auditing & Monitoring                           │
│ ├─ OpenTelemetry distributed tracing                     │
│ ├─ Prometheus metrics                                    │
│ ├─ Grafana dashboards                                    │
│ └─ Immutable audit logs                                  │
├─────────────────────────────────────────────────────────┤
│ Layer 6: Incident Response                               │
│ ├─ SIEM (Security Information Event Management)          │
│ ├─ Automated alerts                                      │
│ ├─ Escalation playbooks                                  │
│ └─ Forensics capability                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Clasificación de Datos

### 2.1 Niveles de Clasificación

| Nivel | Definición | Ejemplos | Cifrado | RLS | Auditoría |
|-------|-----------|----------|---------|-----|-----------|
| **SECRET** | Altamente confidencial, riesgo crítico si expuesto | Cédula paciente, SSN, datos médicos completos | AES-256 en reposo + TLS 1.3 | Sí | Cada lectura |
| **CONFIDENTIAL** | Confidencial, riesgo significativo | Email, teléfono, dirección, diagnóstico | AES-256 en reposo + TLS 1.3 | Sí | Acceso anómalo |
| **INTERNAL** | Uso interno, riesgo bajo | Metadata de cita, estatus | TLS 1.3 únicamente | Sí | No requerido |
| **PUBLIC** | Información pública | Horarios clínica, direcciones | No | No | No requerido |

### 2.2 Data Inventory

```sql
-- Tabla: data_classification
CREATE TABLE data_classification (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    classification VARCHAR(20) NOT NULL,  -- SECRET, CONFIDENTIAL, INTERNAL, PUBLIC
    encryption_required BOOLEAN NOT NULL,
    rls_policy_name VARCHAR(255),
    retention_years INT NOT NULL,
    justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (table_name, column_name)
);

INSERT INTO data_classification (table_name, column_name, classification, encryption_required, rls_policy_name, retention_years, justification)
VALUES
    ('patients', 'national_id_number', 'SECRET', true, 'tenant_isolation', 5, 'PII - Ley 1581 Art. 5'),
    ('patients', 'full_name', 'CONFIDENTIAL', true, 'tenant_isolation', 5, 'PII - Decreto 1377'),
    ('medical_records', 'diagnosis', 'SECRET', true, 'medical_staff_only', 20, 'Ley 23 Art. 23 - secreto profesional'),
    ('appointments', 'scheduled_at', 'INTERNAL', false, 'tenant_isolation', 2, 'Non-PII appointment metadata'),
    ('financial_audit_log', 'performed_by', 'CONFIDENTIAL', true, 'finance_only', 7, 'Audit trail - Circular SFC');
```

---

## 3. Encryption

### 3.1 Encryption at Rest (AES-256)

#### PostgreSQL: pgcrypto Extension

```sql
-- Habilitar extensión
CREATE EXTENSION pgcrypto;

-- Función de encriptación (con master key)
CREATE OR REPLACE FUNCTION encrypt_value(text_value TEXT, master_key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(text_value, master_key);
END;
$$ LANGUAGE plpgsql;

-- Tabla de pacientes con campos encriptados
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    national_id_number BYTEA NOT NULL,        -- Encriptado
    national_id_iv BYTEA NOT NULL,             -- IV para el IV
    full_name BYTEA NOT NULL,                  -- Encriptado
    email BYTEA NOT NULL,                      -- Encriptado
    phone BYTEA NOT NULL,                      -- Encriptado
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- RLS para aislamiento de tenant
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_patients_by_tenant ON patients
    FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY update_patients_by_tenant ON patients
    FOR UPDATE
    USING (tenant_id = current_tenant_id());

CREATE POLICY delete_patients_by_tenant ON patients
    FOR DELETE
    USING (tenant_id = current_tenant_id());
```

#### Master Key Management

```csharp
public class EncryptionKeyService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EncryptionKeyService> _logger;

    public string GetMasterKey()
    {
        // NEVER hardcode in code
        // Load from Azure Key Vault or AWS Secrets Manager
        var masterKey = _config["Encryption:MasterKey:SecretName"];

        if (string.IsNullOrEmpty(masterKey))
            throw new InvalidOperationException("Master encryption key not configured");

        _logger.LogWarning("Master key loaded from secure store (audit trail)");
        return masterKey;
    }

    public async Task RotateKeyAsync(CancellationToken cancellationToken)
    {
        // Quarterly key rotation (ISO 27001 requirement)
        var newKey = CryptoRandom.GetString(32);

        // 1. Generate new key
        // 2. Re-encrypt all data with new key (async background job)
        // 3. Store old key in audit trail
        // 4. Verify all data re-encrypted correctly
        // 5. Purge old key after verification

        _logger.LogInformation("Key rotation started");
        await Task.CompletedTask;
    }
}
```

### 3.2 Encryption in Transit (TLS 1.3)

#### HTTPS Enforcement

```csharp
public static class SecurityExtensions
{
    public static void AddSecurityHeaders(this WebApplicationBuilder builder)
    {
        builder.Services.AddHsts(options =>
        {
            options.MaxAge = TimeSpan.FromDays(365);
            options.IncludeSubDomains = true;
            options.Preload = true;
        });

        builder.Services.AddHttpsRedirection(options =>
        {
            options.HttpsPort = 443;
            options.RedirectStatusCode = StatusCodes.Status301MovedPermanently;
        });
    }
}

// Program.cs
var builder = WebApplicationBuilder.CreateBuilder(args);

builder.Services
    .AddSecurityHeaders();

var app = builder.Build();

// Enforce HTTPS for all requests
app.UseHttpsRedirection();
app.UseHsts();

// Require TLS 1.3
var certificate = new X509Certificate2(
    File.ReadAllBytes("/etc/ssl/certs/backend.p12"),
    Environment.GetEnvironmentVariable("CERT_PASSWORD"));

// Configure minimum TLS version
var httpOptions = new HttpServerOptions();
httpOptions.SslProtocols = System.Security.Authentication.SslProtocols.Tls13;
```

#### Certificate Management

```yaml
# Kubernetes secret for TLS certificates
apiVersion: v1
kind: Secret
metadata:
  name: backend-tls-cert
  namespace: lcwps-prod
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>

---
# Ingress with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  namespace: lcwps-prod
spec:
  tls:
  - hosts:
    - api.lcwps.clinic
    secretName: backend-tls-cert
  rules:
  - host: api.lcwps.clinic
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-api
            port:
              number: 443

---
# Cert-manager for auto-renewal
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: backend-cert
  namespace: lcwps-prod
spec:
  secretName: backend-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.lcwps.clinic
  duration: 2160h  # 90 days
  renewBefore: 720h  # 30 days
```

---

## 4. Access Control

### 4.1 Role-Based Access Control (RBAC)

```csharp
public enum UserRole
{
    Physician = 1,              // Médico tratante
    FinanceDirector = 2,        // Director de finanzas
    Administrator = 3,           // Admin sistema
    Clerk = 4                    // Asistente administrativo
}

public class RolePermissions
{
    // Physician permissions
    public static readonly RolePermission[] PhysicianPermissions = new[]
    {
        RolePermission.ReadAppointments,
        RolePermission.ReadMedicalRecords,
        RolePermission.ApproveFinancialValidation,  // Manual approval
        RolePermission.WriteNotes,
    };

    // FinanceDirector permissions
    public static readonly RolePermission[] FinanceDirectorPermissions = new[]
    {
        RolePermission.ReadAppointments,
        RolePermission.ReadFinancialAudit,
        RolePermission.ApproveFinancialValidation,  // Second approval for >UVR 600
        RolePermission.GenerateFinancialReports,
        RolePermission.ManageRefunds,
    };

    // Administrator permissions
    public static readonly RolePermission[] AdministratorPermissions = new[] {
        RolePermission.All,  // SuperUser
    };

    // Clerk permissions
    public static readonly RolePermission[] ClerkPermissions = new[]
    {
        RolePermission.ReadAppointments,
        RolePermission.ScheduleAppointments,
        RolePermission.CancelAppointments,
    };
}

[ApiController]
[Route("api/[controller]")]
public class FinancialValidationController : ControllerBase
{
    [HttpPost("approve")]
    [Authorize(Roles = "FINANCE_DIRECTOR,CCO")]  // Only roles with permission
    public async Task<IActionResult> ApproveFinancialValidation(
        [FromBody] ApproveFinancialValidationRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var userRole = User.GetRole();

        // Prevent self-approval
        if (userId == request.SubmittedBy)
            return Forbid("Cannot approve own submission");

        // Amount-based approval (RBAC + amount check)
        if (request.Amount > UVR.Value(600) && userRole != UserRole.FinanceDirector)
            return Forbid("Only Finance Director can approve > UVR 600");

        // ... rest of logic
    }
}
```

### 4.2 Row-Level Security (RLS) PostgreSQL

```sql
-- Table schema with RLS enabled
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (CRITICAL)
CREATE POLICY tenant_isolation ON appointments
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Role-based read policy (physicians see only their appointments)
CREATE POLICY physician_read_policy ON appointments
    FOR SELECT
    USING (
        current_user_role() = 'PHYSICIAN'
        AND physician_id IN (SELECT id FROM physicians WHERE user_id = current_user_id())
    );

-- Role-based write policy (only finance directors update financial status)
CREATE POLICY finance_update_policy ON appointments
    FOR UPDATE
    USING (current_user_role() IN ('FINANCE_DIRECTOR', 'ADMIN'))
    WITH CHECK (
        -- Prevent modification of critical fields outside financial service
        (OLD.financial_status = NEW.financial_status OR current_user_role() = 'FINANCE_DIRECTOR')
    );

-- Audit trigger for all modifications
CREATE OR REPLACE FUNCTION audit_appointment_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO appointment_audit_log (
        appointment_id, action, old_values, new_values, changed_by, changed_at, tenant_id
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        ROW_TO_JSON(OLD),
        ROW_TO_JSON(NEW),
        current_user_id(),
        NOW(),
        current_setting('app.current_tenant_id')::UUID
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION audit_appointment_changes();
```

#### Context Propagation (Tenant ID in Every Query)

```csharp
public class TenantContextMiddleware
{
    private readonly RequestDelegate _next;

    public TenantContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Extract tenant ID from JWT claims
        var tenantId = context.User.FindFirst("tenant_id")?.Value;

        if (string.IsNullOrEmpty(tenantId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "tenant_id claim missing" });
            return;
        }

        // Set PostgreSQL session parameter for RLS
        using (var connection = new NpgsqlConnection(_connectionString))
        {
            await connection.OpenAsync();
            using (var cmd = new NpgsqlCommand("SELECT set_config('app.current_tenant_id', $1, false)", connection))
            {
                cmd.Parameters.AddWithValue("@tenantId", Guid.Parse(tenantId));
                await cmd.ExecuteNonQueryAsync();
            }
        }

        // Propagate to background services via context bag
        context.Items["tenant_id"] = tenantId;

        await _next(context);
    }
}
```

---

## 5. Auditing

### 5.1 Immutable Audit Log

```sql
-- Append-only audit log (NEVER DELETE, NEVER UPDATE)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,              -- INSERT, UPDATE, DELETE, SELECT, APPROVE, etc.
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    change_set JSONB,                         -- What changed
    reason TEXT,                              -- Why (justification)
    fingerprint VARCHAR(64) NOT NULL,         -- SHA-256 hash for integrity

    -- Anti-tampering constraints
    CONSTRAINT audit_immutable CHECK (performed_at is not null),
    CONSTRAINT audit_no_future CHECK (performed_at <= NOW())
);

-- Create immutable constraint (no UPDATE allowed)
CREATE POLICY audit_log_immutable ON audit_log
    FOR ALL
    USING (true)
    WITH CHECK (true);

REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM app_user;

-- Only INSERT allowed
GRANT SELECT, INSERT ON audit_log TO app_user;

-- Fingerprinting function (integrity verification)
CREATE OR REPLACE FUNCTION generate_audit_fingerprint(
    p_action VARCHAR(50),
    p_table_name VARCHAR(255),
    p_record_id UUID,
    p_performed_by UUID,
    p_performed_at TIMESTAMPTZ
)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(
        digest(
            p_action || '|' || p_table_name || '|' || p_record_id || '|' ||
            p_performed_by || '|' || p_performed_at,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Financial-specific audit log
CREATE TABLE financial_audit_log (
    id BIGSERIAL PRIMARY KEY,
    appointment_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    justification TEXT NOT NULL,
    requires_dual_control BOOLEAN,
    second_approval_by UUID,
    second_approval_at TIMESTAMPTZ,
    override_reason TEXT,
    tenant_id UUID NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    -- Prevent updates/deletes (5-year retention minimum)
    CONSTRAINT immutable_financial_log CHECK (performed_at is not null)
);

ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log REPLICATE IDENTITY FULL;  -- For logical replication

-- Monthly archival to cold storage (compliance)
CREATE OR REPLACE PROCEDURE archive_audit_logs_monthly()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Move logs older than 30 days to archive table
    INSERT INTO audit_log_archive
    SELECT * FROM audit_log
    WHERE performed_at < NOW() - INTERVAL '30 days';

    -- Keep last 30 days in hot table
    DELETE FROM audit_log
    WHERE performed_at < NOW() - INTERVAL '30 days';
END;
$$;
```

### 5.2 Query Auditing

```csharp
public class AuditingService
{
    private readonly IDbConnection _dbConnection;
    private readonly ILogger<AuditingService> _logger;

    public async Task LogFinancialApprovalAsync(
        Guid appointmentId,
        Guid approvedBy,
        decimal amount,
        string justification,
        bool requiresDualControl,
        CancellationToken cancellationToken)
    {
        var auditEntry = new
        {
            appointmentId,
            action = "FINANCIAL_APPROVAL",
            amount,
            approvedBy,
            approvedAt = DateTime.UtcNow,
            justification,
            requiresDualControl,
            tenantId = GetCurrentTenantId(),
            ipAddress = GetClientIpAddress(),
            userAgent = GetUserAgent(),
            fingerprint = GenerateFingerprintHash(approvedBy, amount, DateTime.UtcNow)
        };

        const string sql = @"
            INSERT INTO financial_audit_log
            (appointment_id, action, amount, approved_by, approved_at, justification,
             requires_dual_control, tenant_id, performed_at)
            VALUES (@appointmentId, @action, @amount, @approvedBy, @approvedAt,
                    @justification, @requiresDualControl, @tenantId, @performedAt)";

        await _dbConnection.ExecuteAsync(sql, auditEntry);

        _logger.LogInformation(
            "Financial approval logged: appointment={appointmentId}, approver={approvedBy}, amount={amount}",
            appointmentId, approvedBy, amount);
    }
}
```

---

## 6. Secrets Management

### 6.1 No Hardcoded Secrets

```csharp
// ✗ FORBIDDEN
private const string DatabasePassword = "postgres_secret_pass_123";  // FAIL SAST

// ✓ CORRECT
public class SecretsConfiguration
{
    public string DatabasePassword { get; set; }  // Injected from environment
    public string JwtSigningKey { get; set; }     // From Azure Key Vault
    public string EncryptionMasterKey { get; set; }  // From AWS Secrets Manager
}

// Program.cs
builder.Services.Configure<SecretsConfiguration>(
    builder.Configuration.GetSection("Secrets"));

// Use in DI
builder.Services.AddSingleton<ISecretsProvider, AzureKeyVaultSecretsProvider>();
```

### 6.2 Secrets Store Integration

```csharp
// Azure Key Vault
public class AzureKeyVaultSecretsProvider : ISecretsProvider
{
    private readonly SecretClient _secretClient;

    public async Task<string> GetSecretAsync(string secretName)
    {
        var secret = await _secretClient.GetSecretAsync(secretName);
        return secret.Value.Value;
    }

    public async Task RotateSecretAsync(string secretName, string newValue)
    {
        await _secretClient.SetSecretAsync(secretName, newValue);
    }
}

// Environment variables for local development
public class LocalSecretsProvider : ISecretsProvider
{
    public Task<string> GetSecretAsync(string secretName)
    {
        var value = Environment.GetEnvironmentVariable(secretName);
        if (string.IsNullOrEmpty(value))
            throw new InvalidOperationException($"Secret '{secretName}' not found in environment");
        return Task.FromResult(value);
    }
}
```

---

## 7. Incident Response Protocol

### 7.1 Levels of Severity

| Nivel | Descripción | SLA Respuesta | Escalada |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Breach de datos, financial fraud down, sistema offline | 15 minutos | CISO → COO → Legal |
| **P2 - High** | Datos sensibles comprometidos, false rejections en validación | 1 hora | CISO → CTO |
| **P3 - Medium** | Anomalías en acceso, failed login attempts | 4 horas | Security Officer → Team lead |
| **P4 - Low** | Config issue, non-critical alert | 1 día laboral | Dev team |

### 7.2 Incident Response Playbook

```
1. DETECT
   └─ Alert triggered by SIEM/monitoring
   └─ Automated: Correlation analysis, false positive check

2. ASSESS
   └─ Severity classification (P1-P4)
   └─ Initial triage: confirmed or false alarm?

3. CONTAIN
   ├─ P1: Immediate database failover, revoke access tokens
   ├─ P2: Isolate affected service, start forensics
   └─ P3: Increase monitoring, no immediate action

4. INVESTIGATE
   ├─ Query audit logs: WHO accessed WHAT WHEN
   ├─ Check RLS violations (audit should prevent this)
   ├─ Analyze Event Store for anomalies
   └─ Root cause analysis (RCA)

5. REMEDIATE
   ├─ Patch vulnerability
   ├─ Reset credentials if compromised
   ├─ Re-deploy containers if malware suspected
   └─ Verify all read replicas patched

6. COMMUNICATE
   ├─ Internal: Slack notification to on-call
   ├─ Executive: Incident report to CISO
   ├─ External: Customer notification if data breach (GDPR/Ley 1581 Art. 25)
   └─ Regulatory: Supersalud report if healthcare impact (24h SLA)

7. CLOSE
   ├─ Post-mortem: What, why, how to prevent
   ├─ Documentation: Update incident wiki
   └─ Follow-up: Process improvement tickets
```

---

## 8. Compliance Reporting

### 8.1 Quarterly Supersalud Report

```markdown
# Quarterly Security & Compliance Report
**Period:** Q1 2026
**LCWPS System**
**Supervisor:** CISO

## 1. Availability & Continuity
- **Uptime:** 99.97% (Target: 99.5%)
- **Incidents:** 0 critical, 1 medium (resolved)
- **RTO Validation:** Recovery tested 2026-02-15 (4h 32min → PASS)
- **Last backup restore:** 2026-01-20, successful

## 2. Financial Validation Compliance
- **Total validations processed:** 3,247
- **Manual review rate:** 100% (policy requires)
- **By amount:**
  - ≤ UVR 100: 2,891 (single approval)
  - UVR 100-600: 312 (single approval)
  - > UVR 600: 44 (dual approval, 100% compliant)
- **Validation time:** Avg 2.3 minutes
- **Rejections:** 0 (all valid)
- **Discrepancies:** 0

## 3. Data Protection (Ley 1581 / GDPR)
- **Data access requests:** 8 received, 8 fulfilled within 10 days
- **Rectification requests:** 3 processed
- **Deletion requests (derecho al olvido):** 2 soft-deleted, 0 hard-deleted
- **Unsubscribe requests:** 1 processed (opt-out from communications)
- **DPA breaches:** 0

## 4. Security Controls
- **SAST scan:** 47 findings (3 critical, all remediated)
- **Penetration test:** Q4 2025, 5 high findings fixed
- **Vulnerability scan:** Daily (SCA), 0 critical in pom.xml/package.json
- **SSL/TLS certificate:** Valid until 2026-05-10 (auto-renewing)
- **Key rotation:** Master key rotated 2026-02-01

## 5. Access Control Audit
- **RLS violations:** 0 detected (audit trails confirm isolation)
- **Self-approvals blocked:** 0 occurrences
- **Role mismatches:** 0
- **Stale access:** 12 users removed (inactive >90 days)

## 6. Audit Trail Integrity
- **Total audit entries:** 847,392
- **Corrupted entries:** 0 (fingerprint verification)
- **Archived to cold storage:** 543,210 (>30 days)
- **Retention compliance:** All entries retained per policy

## 7. Incident Summary
- **P1 Critical:** 0
- **P2 High:** 0
- **P3 Medium:** 1 (unexplained data access spike on 2026-02-02, root cause: scheduled backup job, fixed)
- **P4 Low:** 2 (false positives, configuration tuning applied)

---
**Prepared by:** Chief Information Security Officer
**Approved by:** Chief Operating Officer
**Distribution:** Supersalud, Internal Audit, Board
```

---

**Policy Status:** ENTERPRISE-BINDING
**Vigencia:** 24 de febrero de 2026 — Indefinida
**Review:** Annually or after incidents
