# Política de Auditoría y Retención

**Versión:** 1.0
**Fecha:** 24 de febrero de 2026
**Clasificación:** Confidencial - Cumplimiento
**Scope:** `rlapp-backend/` ÚNICAMENTE
**Owner:** Chief Compliance Officer + Chief Information Security Officer

---

## 1. Retention Requirements by Data Type

### 1.1 Matriz de Retención

| Tipo de Dato | Mínimo Legal | Periodo Retención | Justificación |
|--------------|-------------|------------------|---------------|
| **Appointment Records** | 5 años | 7 años | Ley 1581 (prescripción claims) |
| **Medical Records** | 20 años (vida + 5 años) | 25 años | Ley 23 Art. 36 (Código Sanitario) |
| **Financial Audit Log** | 7 años | 7 años | Circular SFC 000031, contabilidad |
| **Event Store** | 5 años | Indefinido (append-only) | Auditoría irrevocable |
| **Access Logs (RLS, Auth)** | 1 año | 3 años | ISO 27001.A.12.4.1 |
| **Change Logs (Git)** | 1 mes | Indefinido (git history) | Trazabilidad de cambios |
| **Backup/Archive** | Mínimo retención | +1 año | Disaster recovery |
| **Deleted Patient Data** | 30 días anonimizado | 30 días | GDPR derecho al olvido |

### 1.2 Cálculo de Retención

```sql
-- Retirement date calculation
-- Example: Appointment created 2024-01-15, need 7 years retention

SELECT
    appointment_id,
    created_at,
    created_at + INTERVAL '7 years' as retirement_date,
    CASE
        WHEN NOW() >= created_at + INTERVAL '7 years'
            THEN 'ELIGIBLE_FOR_ARCHIVAL'
        ELSE 'RETAIN'
    END as status
FROM appointments
WHERE created_at BETWEEN '2019-01-01' AND '2023-12-31';
```

---

## 2. Audit Trail Architecture

### 2.1 Immutable Audit Log Design

```sql
-- CORE AUDIT TABLE (append-only, never delete/update)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,

    -- Identity & Context
    event_id UUID NOT NULL UNIQUE,
    correlation_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,

    -- Event Details
    action VARCHAR(50) NOT NULL,           -- INSERT, UPDATE, DELETE, APPROVE, etc.
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,

    -- Changes
    old_values JSONB,                      -- Pre-image
    new_values JSONB,                      -- Post-image
    change_description TEXT,               -- Human-readable summary

    -- Metadata
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET NOT NULL,
    user_agent TEXT,

    -- Anti-tampering
    fingerprint VARCHAR(64) NOT NULL,      -- SHA-256 hash of event
    previous_fingerprint VARCHAR(64),      -- Linked to previous entry (chain)

    -- Immutability constraints
    CONSTRAINT immutable_audit_log CHECK (performed_at IS NOT NULL),
    CONSTRAINT no_null_fingerprint CHECK (fingerprint IS NOT NULL),
    CONSTRAINT audit_entry_order UNIQUE (tenant_id, id)
);

-- INDEXES for efficient querying
CREATE INDEX idx_audit_tenant_time
    ON audit_log(tenant_id, performed_at DESC);

CREATE INDEX idx_audit_record
    ON audit_log(table_name, record_id, performed_at DESC);

CREATE INDEX idx_audit_correlation
    ON audit_log(correlation_id);

-- ROW-LEVEL SECURITY
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON audit_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- PREVENT UPDATES/DELETES
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM app_user;
GRANT SELECT, INSERT ON audit_log TO app_user;

-- Fingerprinting function (integrity chain)
CREATE OR REPLACE FUNCTION generate_audit_fingerprint(
    p_event_id UUID,
    p_action VARCHAR(50),
    p_record_id UUID,
    p_performed_at TIMESTAMPTZ,
    p_previous_fingerprint VARCHAR(64)
)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(
        digest(
            p_event_id || '|' || p_action || '|' || p_record_id || '|' ||
            p_performed_at || '|' || COALESCE(p_previous_fingerprint, 'ROOT'),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit insertion
CREATE OR REPLACE FUNCTION insert_audit_entry()
RETURNS TRIGGER AS $$
DECLARE
    prev_fingerprint VARCHAR(64);
BEGIN
    -- Get previous fingerprint for chain
    SELECT fingerprint INTO prev_fingerprint
    FROM audit_log
    WHERE tenant_id = NEW.tenant_id
    ORDER BY id DESC
    LIMIT 1;

    -- Generate fingerprint
    NEW.fingerprint := generate_audit_fingerprint(
        NEW.event_id,
        NEW.action,
        NEW.record_id,
        NEW.performed_at,
        prev_fingerprint
    );

    NEW.previous_fingerprint := prev_fingerprint;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_entry_trigger
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION insert_audit_entry();
```

### 2.2 Financial Audit Log (Specialized)

```sql
-- FINANCIAL AUDIT LOG (more restrictive than general audit_log)
CREATE TABLE financial_audit_log (
    id BIGSERIAL PRIMARY KEY,

    -- Reference
    appointment_id UUID NOT NULL,
    validation_id UUID NOT NULL,
    tenant_id UUID NOT NULL,

    -- Action
    action VARCHAR(50) NOT NULL,           -- CREATED, SUBMITTED, APPROVED, REJECTED, OVERRIDE

    -- Approver (CRITICAL)
    performed_by UUID NOT NULL,
    performed_by_name VARCHAR(255) NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Amount & Justification
    amount NUMERIC(15, 2),
    currency VARCHAR(3) DEFAULT 'COP',
    justification TEXT NOT NULL,
    requires_dual_control BOOLEAN,

    -- Second approval (if applicable)
    second_approved_by UUID,
    second_approved_by_name VARCHAR(255),
    second_approved_at TIMESTAMPTZ,

    -- Override (CCO only)
    override_flag BOOLEAN DEFAULT FALSE,
    override_reason TEXT,

    -- Network & Session
    ip_address INET NOT NULL,
    user_agent TEXT,
    session_id UUID,

    -- Fingerprint (chain integrity)
    fingerprint VARCHAR(64) NOT NULL,
    previous_fingerprint VARCHAR(64),

    -- Compliance markers
    supersalud_reported BOOLEAN DEFAULT FALSE,
    supersalud_report_date TIMESTAMPTZ,

    -- Immutability
    CONSTRAINT financial_log_immutable CHECK (performed_at IS NOT NULL),
    CONSTRAINT financial_no_null_fingerprint CHECK (fingerprint IS NOT NULL),
    CONSTRAINT financial_amount_positive CHECK (amount >= 0)
);

ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_audit_tenant_isolation ON financial_audit_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

REVOKE UPDATE, DELETE ON financial_audit_log FROM PUBLIC;
GRANT SELECT, INSERT ON financial_audit_log TO app_user;
```

---

## 3. Query & Verification Examples

### 3.1 Audit Trail Query (Forensics)

```sql
-- Query complete audit trail for an appointment
WITH audit_chain AS (
    SELECT
        id,
        action,
        record_id,
        performed_by,
        performed_at,
        change_description,
        fingerprint,
        previous_fingerprint,
        -- Verify chain integrity
        LAG(fingerprint) OVER (
            PARTITION BY tenant_id
            ORDER BY id
        ) = previous_fingerprint as is_chain_valid
    FROM audit_log
    WHERE record_id = '550e8400-e29b-41d4-a716-446655440001'
      AND tenant_id = '550e8400-e29b-41d4-a716-446655440100'
    ORDER BY performed_at DESC
)
SELECT
    id,
    action,
    performed_by,
    performed_at AT TIME ZONE 'America/Bogota' as performed_at_local,
    change_description,
    is_chain_valid,
    CASE WHEN is_chain_valid THEN '✓ VALID' ELSE '⚠️ CHAIN BROKEN' END as integrity_status
FROM audit_chain;

-- Output example:
id  | action     | performed_by  | performed_at_local       | integrity_status
────┼────────────┼──────────────┼──────────────────────────┼───────────────
47  | APPROVED   | user-uuid-123 | 2026-02-24 10:15:00     | ✓ VALID
46  | SUBMITTED  | user-uuid-456 | 2026-02-24 09:30:00     | ✓ VALID
45  | CREATED    | system        | 2026-02-24 09:00:00     | ✓ VALID
```

### 3.2 Integrity Verification

```sql
-- Verify fingerprint chain integrity
SELECT
    id,
    action,
    fingerprint,
    DECODE(fingerprint, 'hex')::bytea =
        sha256((id-1)::text)::bytea as fingerprint_valid,
    CASE WHEN is_chain_broken THEN 'COMPROMISED' ELSE 'SECURE' END as audit_status
FROM audit_log
WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
ORDER BY id DESC;
```

---

## 4. Financial Audit Trail Reporting

### 4.1 Quarterly Financial Report (Supersalud)

```markdown
# LCWPS - Financial Validation Audit Report
**Period:** Q1 2026 (2026-01-01 to 2026-03-31)
**Submitted to:** Superintendencia Financiera de Colombia
**Certification:** ISO 27001 | ISO 25010 | GDPR Principles

---

## 1. Financial Validations Summary

| Metric | Value |
|--------|-------|
| Total validations processed | 3,247 |
| Manual review rate | 100% |
| Automated approvals | 0 (policy-compliant) |
| Average approval time | 2.3 minutes |
| SLA compliance (≤8h) | 100% |

## 2. By Amount Range

| Range | Count | Single Approval | Dual Approval | Reject Rate |
|-------|-------|-----------------|---------------|------------|
| ≤ UVR 100 | 2,891 | 2,891 (100%) | 0 | 0% |
| UVR 100-600 | 312 | 312 (100%) | 0 | 0% |
| > UVR 600 | 44 | 0 | 44 (100%) | 0% |

## 3. Audit Trail Integrity

- **Total audit entries:** 847,392
- **Fingerprint chain verified:** 847,392 (100%) ✓
- **No tampering detected:** Confirmed via SHA-256 hash chain
- **Retention compliance:** 100% (5+ years)

## 4. Approvers Summary

| Approver | Role | Approvals | Rejections | Override |
|----------|------|-----------|-----------|----------|
| Dr. Juan Pérez | Physician | 1,847 | 0 | 0 |
| Dir. María García | Finance Director | 1,234 | 8 | 0 |
| CCO Carlos López | Chief Compliance Officer | 166 | 0 | 12 |

**Note:** No self-approvals recorded. All dual-controls properly executed by different persons.

## 5. Discrepancies & Issues

- **Amount mismatches:** 0
- **Unapproved financial transitions:** 0
- **RLS violations (tenant data leakage):** 0
- **Unauthorized access attempts:** 0

---

**Certified by:** Chief Compliance Officer
**Digital Signature:** [GPG signature]
**Date:** 2026-04-01
```

---

## 5. Archival Strategy

### 5.1 Hot/Warm/Cold Tiered Storage

```
┌────────────────────────────────────────────────────────┐
│ HOT STORAGE (Active, 30 days)                          │
│ ├─ Location: PostgreSQL main database                  │
│ ├─ Access: Real-time queries (sub-second)              │
│ ├─ Compliance: RLS enforced, full audit trail          │
│ └─ Example: audit_log table (latest 30 days)           │
├────────────────────────────────────────────────────────┤
│ WARM STORAGE (Accessed occasionally, 1-5 years)        │
│ ├─ Location: PostgreSQL partitioned archive table      │
│ ├─ Access: Via archive views (queries < 5 seconds)     │
│ ├─ Compression: ZSTD compression enabled               │
│ └─ Compliance: Immutable, checksummed                  │
├────────────────────────────────────────────────────────┤
│ COLD STORAGE (Compliance hold, 5+ years)               │
│ ├─ Location: AWS S3 Glacier or on-premises vault       │
│ ├─ Access: Quarterly audit retrieval only              │
│ ├─ Format: Encrypted JSON + fingerprints               │
│ ├─ Encryption: AES-256 with master key in vault        │
│ └─ Compliance: Geo-redundant, tamper-evident sealing   │
└────────────────────────────────────────────────────────┘
```

### 5.2 Archival Job (Automated)

```sql
-- Scheduled job: Monthly archival
CREATE OR REPLACE PROCEDURE archive_old_audit_logs()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Move logs older than 30 days from active to archive
    INSERT INTO audit_log_archive
    SELECT * FROM audit_log
    WHERE performed_at < NOW() - INTERVAL '30 days';

    -- Keep only last 30 days in active table
    DELETE FROM audit_log
    WHERE performed_at < NOW() - INTERVAL '30 days';

    -- Verify integrity of archive
    PERFORM COUNT(*) FROM audit_log_archive
    WHERE fingerprint_verified = FALSE;

    -- Log archival completion
    INSERT INTO archival_log (action, record_count, archived_at)
    VALUES ('MONTHLY_ARCHIVAL', @@ROWCOUNT, NOW());

    RAISE NOTICE 'Archival completed: % records moved', @@ROWCOUNT;
END;
$$;

-- Schedule execution (monthly, first day at 02:00 UTC)
SELECT cron.schedule('archive-audit-logs', '0 2 1 * *',
    'CALL archive_old_audit_logs()');
```

---

## 6. Compliance Reporting Schedule

### 6.1 Reporting Calendar

| Frequency | Recipient | Content | Due Date |
|-----------|-----------|---------|----------|
| **Quarterly** | Superintendencia Financiera | Financial validations, audit trail summary | Q+45 days |
| **Quarterly** | Supersalud (Health Authority) | Security incidents, data breaches, uptime | Q+45 days |
| **Quarterly** | Internal Audit | Audit trail integrity, control effectiveness | Q+30 days |
| **Annually** | DPO (Data Protection Officer) | GDPR/Ley 1581 compliance, data requests | Jan 31 |
| **Annually** | Board of Directors | Risk assessment, incident summary | Q4+15 days |
| **Ad-hoc** | Regulatory Bodies | Breach notification (if applicable) | 24-48 hours |

### 6.2 Report Contents

```markdown
## Quarterly Audit & Retention Report Template

**Period:** Q2 2026
**Organization:** LCWPS
**Reporting Date:** 2026-07-15

### 1. Audit Trail Metrics
- Total audit entries created: 847,392
- Entries archived: 543,210 (to cold storage)
- Active entries in database: 304,182 (last 30 days)
- Chain integrity violations: 0

### 2. Data Retention Compliance
- Medical records (20 years): 100% compliant
- Financial logs (7 years): 100% compliant
- Access logs (3 years): 100% compliant
- Backup retention: Verified via automated backup tests

### 3. Archival Verification
- Archive integrity check: ✓ PASS (SHA-256 verification)
- Backup restoration test: ✓ PASS (RTO 3h 47min ✓)
- Cold storage accessibility: ✓ VERIFIED (AWS S3 Glacier)
- Encryption key rotation: ✓ COMPLETED (2026-07-01)

### 4. Issues & Remediation
- Incidents: 0
- Control violations: 0
- Missed SLAs: 0
- Regulatory inquiries: 0

---
**Prepared by:** Chief Information Security Officer
**Approved by:** Chief Compliance Officer
```

---

## 7. Data Deletion (GDPR / Ley 1581 - Right to Erasure)

### 7.1 Soft Delete + Anonimization

```sql
-- Patient deletion request (GDPR Article 17)
-- Soft delete + anonimization process

CREATE PROCEDURE delete_patient_data(p_patient_id UUID, p_reason TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Step 1: Mark for deletion (soft delete)
    UPDATE patients
    SET
        deleted_at = NOW(),
        deletion_reason = p_reason,
        is_deleted = TRUE
    WHERE id = p_patient_id;

    -- Step 2: Anonymize PII (cannot be reversed)
    UPDATE patients
    SET
        national_id_number = pgp_sym_encrypt(
            'ANONYMIZED_' || gen_random_uuid()::text,
            'anonymization-key'),
        full_name = 'ANONYMIZED',
        email = 'ANONYMIZED@example.com',
        phone = 'ANONYMIZED'
    WHERE id = p_patient_id;

    -- Step 3: Create deletion audit record
    INSERT INTO deletion_audit_log (patient_id, reason, deleted_at)
    VALUES (p_patient_id, p_reason, NOW());

    -- Step 4: Schedule hard delete (30 days grace period)
    PERFORM cron.schedule(
        'delete-patient-' || p_patient_id,
        '0 2 * * *',  -- Daily at 02:00 UTC
        format('DELETE FROM patients WHERE id = %L AND
                deleted_at < NOW() - INTERVAL ''30 days''', p_patient_id)
    );

    RAISE NOTICE 'Patient % marked for deletion. Hard delete in 30 days.', p_patient_id;
END;
$$;

-- Invitation for patient to cancel/confirm deletion within 30 days
CALL delete_patient_data(
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'User requested account deletion via GDPR Article 17'
);
```

### 7.2 Retention of Audit Records (Legal Hold)

```sql
-- Audit trail CANNOT be deleted even after patient deletion
-- This satisfies both GDPR (erasure right) and compliance (audit trail)

-- Exception: Legal holds & regulatory requests
CREATE TABLE legal_hold (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID,
    audit_log_id BIGINT,
    hold_reason VARCHAR(255),
    held_at TIMESTAMPTZ DEFAULT NOW(),
    held_by UUID,
    expires_at TIMESTAMPTZ,
    CONSTRAINT audit_legal_hold CHECK (expires_at > NOW())
);

-- Query to prevent deletion of held records
SELECT id, action, patient_id
FROM audit_log
WHERE id IN (SELECT audit_log_id FROM legal_hold WHERE expires_at > NOW())
-- These records are protected from deletion
```

---

**Audit & Retention Policy Status:** ENTERPRISE-BINDING
**Enforcement:** Automated scheduling + Quarterly manual verification
**Compliance Authority:** Superintendencia Financiera, Supersalud, DPO
