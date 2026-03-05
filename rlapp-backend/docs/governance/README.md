# Governance Dashboard - Official Status

**Versión:** 1.0
**Fecha Vigencia:** 24 de febrero de 2026
**Status:** 🔒 ENTERPRISE-BINDING (Contractually Enforceable)
**Scope:** `rlapp-backend/` ÚNICAMENTE

---

## 📋 Governance Framework v1.0

### OGB (Official Governance Baseline) - 8 Core Documents

| ID | Documento | Versión | Status | Aplicabilidad |
|----|-----------|---------|--------|---------------|
| OGB-001 | [GOVERNANCE_BASELINE.md](GOVERNANCE_BASELINE.md) | 1.0 | ✓ Active | Principios, workflow, autoridad regulatoria |
| OGB-002 | [regulatory-matrix.md](regulatory-matrix.md) | 1.0 | ✓ Active | Mapeo normas: Ley 1581, ISO 27001, NIST, OWASP |
| OGB-003 | [architecture-enforcement.md](architecture-enforcement.md) | 1.0 | ✓ Active | .NET 10, Clean Arch, DDD, CQRS, Event Sourcing |
| OGB-004 | [financial-domain-invariants.md](../compliance/financial-domain-invariants.md) | 1.0 | ✓ Active | Validación manual (CIF-01), Circular SFC 000031 |
| OGB-005 | [git-flow-governance.md](git-flow-governance.md) | 1.0 | ✓ Active | Ramas, signed commits, branch protection |
| OGB-006 | [quality-testing-standards.md](quality-testing-standards.md) | 1.0 | ✓ Active | TDD, coverage ≥90%, domain ≥95%, mutation tests |
| OGB-007 | [change-governance-protocol.md](change-governance-protocol.md) | 1.0 | ✓ Active | 2-person approval, IA audit trail, CCB |
| OGB-008 | [audit-retention-policy.md](../compliance/audit-retention-policy.md) | 1.0 | ✓ Active | Retención ≥5 años, immutable logs, GDPR |

### EGB (Enterprise Governance Bundle) - 8 Technical Artifacts

| ID | Artefacto | Ubicación | Tipo | Status |
|----|-----------|-----------|------|--------|
| EGB-001 | Compliance PR Template | `.github/pull_request_template.md` | Markdown | ✓ Activo |
| EGB-002 | Branch Protection Rules | `.github/branch-protection.yml` | YAML config | ✓ Activo |
| EGB-003 | CI/CD Pipeline (Build+Test) | `.github/workflows/ci-governance.yml` | GitHub Actions | ✓ Activo |
| EGB-004 | Security Gates (SAST+SCA) | `.github/workflows/security-gates.yml` | GitHub Actions | ✓ Activo |
| EGB-005 | Compliance Checklist | `.github/workflows/compliance-checklist.yml` | GitHub Actions | ✓ Activo |
| EGB-006 | Pre-commit Hook | `.githooks/pre-commit` | Shell script | ✓ Activo |
| EGB-007 | Commit Message Hook | `.githooks/commit-msg` | Shell script | ✓ Activo |
| EGB-008 | Governance Dashboard | `docs/governance/README.md` | Markdown | ✓ Este archivo |

---

## 🎯 Governance Principles (Non-Negotiable)

### P1: Manual Financial Validation

- ✓ Validación financiera 100% manual (NO automática)
- ✓ Prohibida auto-aprobación
- ✓ Aprobación dual para montos > UVR 600
- ✓ Audit trail append-only, 5 años mínimo

### P2: Tenant Isolation (Multi-tenant)

- ✓ Row-Level Security (RLS) en PostgreSQL OBLIGATORIO
- ✓ TenantId en CADA query
- ✓ Test suite para verificar aislamiento
- ✓ Ningún cross-tenant data leak permitido

### P3: Domain-Driven Design (Estricto)

- ✓ Aggregates con invariantes especificadas
- ✓ Domain events para cambios significativos
- ✓ Event sourcing para dominio financiero
- ✓ Repository pattern (dependency inversion)

### P4: Zero Self-Approval

- ✓ 2-collaborator review REQUERIDO
- ✓ Autor NO puede ser revisor ni executor
- ✓ Automático: CI/CD bloquea si se detecta self-approval
- ✓ Violación = escalada a Chief Architect

### P5: Signed Commits (GPG)

- ✓ Todos los commits DEBEN estar firmados con GPG
- ✓ Pre-commit hook RECHAZA commits sin firma
- ✓ Verificación: `git log --oneline --gpg-signature`
- ✓ Main branch SOLO acepta signed commits

### P6: Test Coverage Thresholds

- ✓ Application/Infrastructure: ≥ 90%
- ✓ Domain (financial): ≥ 95% CRÍTICO
- ✓ Mutation score: ≥ 80% (anti-fragility)
- ✓ Red → Green → Refactor (TDD strictly)

### P7: No Secrets Hardcoding

- ✓ SAST scan DETECTA y RECHAZA hardcoded secrets
- ✓ Todos los secretos via Azure Key Vault / AWS Secrets Manager
- ✓ Environment variables SOLO para local dev
- ✓ `.env` archivos NEVER committed

### P8: Audit Trail Inmutability

- ✓ Event Store: APPEND-ONLY (no UPDATE/DELETE)
- ✓ Fingerprinting: SHA-256 hash chain
- ✓ Legal hold: GDPR compliance + Retención regulatoria
- ✓ Verificación mensual: Cryptographic integrity check

---

## 🔐 Enforcement Mechanisms

### Automated (CI/CD Gates)

```
Pull Request Created
    ↓
Lint checks (eslint config)
    ↓
Test coverage >= 90% check
    ↓
SAST scan (SonarQube) - 0 critical findings
    ↓
Dependency scan (Snyk) - no vulnerabilities
    ↓
Domain coverage >= 95% (financial only)
    ↓
Mutation testing >= 80% (financial only)
    ↓
Signed commits verification (GPG)
    ↓
Security headers validation
    ↓
IA audit trail check (if code is AI-generated)
    ↓
2-collaborator approval (humans validate)
    ↓
Conflicts resolution (git)
    ↓
✓ Merge button enabled ONLY if all gates pass
```

**Trigger Points:**

- Every commit to feature/* branches
- Every PR to develop
- Every merge to qa/main

**Failure Action:**

- Automatic: Fail pipeline, block merge, notify team
- Manual override: Only CCB via written approval ticket

### Manual (Human Review)

```
Code Quality Reviewer (Dev Lead)
├─ SOLID principles applied?
├─ No anti-patterns (static methods, god objects)?
├─ DRY principle (no copy-paste)?
└─ Signature: [GPG signed approval]

Domain Logic Reviewer (Architect)
├─ Invariants correctly enforced?
├─ Domain events raised appropriately?
├─ Repository layer isolation proper?
└─ Signature: [GPG signed approval]

Compliance Reviewer (for financial changes only)
├─ No direct approval bypass?
├─ Audit trail logic sound?
├─ RLS properly implemented?
└─ Signature: [GPG signed approval OR CCO only]
```

---

## 📊 Current Metrics (as of 2026-02-24)

### Code Quality

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test coverage (overall) | ≥ 90% | n/a (baseline) | — |
| Domain coverage (financial) | ≥ 95% | n/a (baseline) | — |
| Code duplication (SonarQube) | < 3% | n/a (baseline) | — |
| Cyclomatic complexity (avg) | < 10 | n/a (baseline) | — |
| Technical debt ratio | < 5% | n/a (baseline) | — |

### Security

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| SAST critical findings | 0 | 0 | ✓ |
| Dependency vulnerabilities (Snyk) | 0 critical | 0 | ✓ |
| Container image CVEs (Trivy) | 0 critical | 0 | ✓ |
| Secrets exposed (pre-commit) | 0 | 0 | ✓ |

### Compliance

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Signed commits rate | 100% | 0% (baseline) | — |
| PR review compliance | 100% | n/a (baseline) | — |
| Self-approval incidents | 0 | 0 | ✓ |
| Audit trail integrity | 100% | n/a (baseline) | — |

---

## 📅 Enforcement Calendar

| Actividad | Frecuencia | Dueño | Status |
|-----------|-----------|-------|--------|
| **Code Governance Review** | Semanal | Tech Lead | En progreso |
| **Security Scan (SAST/SCA)** | Cada commit | Automático (CI/CD) | Activo |
| **Compliance Audit** | Mensual | Chief Architect | Programado |
| **Audit Trail Integrity Check** | Mensual | Chief Compliance Officer | Programado |
| **Regulatory Report (Supersalud)** | Trimestral | CEO/CCO | Programado |
| **Financial Validation Audit** | Trimestral | CFO | Programado |
| **Penetration Test** | Anual | CISO | Programado Q3 2026 |
| **Policy Review** | Anual | Chief Architect | Programado Q4 2026 |

---

## 🚀 Setup Instructions for New Developers

### 1. Clone Repository with Governance Hooks

```bash
git clone https://github.com/lcwps/rlapp.git
cd rlapp/rlapp-backend

# Configure GPG signing (one-time)
gpg --full-generate-key  # Follow prompts

# Find your key ID
gpg --list-secret-keys --keyid-format=long
# Output: sec   rsa4096/XXXXXXXXXXXXXXXX ...

# Configure Git
git config --global user.signingkey XXXXXXXXXXXXXXXX
git config --global commit.gpgsign true

# Install pre-commit hooks
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
chmod +x .githooks/commit-msg
```

### 2. Verify Governance is Enabled

```bash
# Test: Create a test branch
git checkout -b feature/test-governance

# Add a dummy file
echo "test" > test.txt
git add test.txt

# Try committing WITHOUT -S (should fail)
git commit -m "test: without signature"
# Expected: ❌ ERROR: Commit not signed

# Commit WITH signature
git commit -S -m "test: with signature"
# Expected: ✓ SUCCESS

# Clean up
git reset --soft HEAD~1
rm test.txt
git checkout develop
git branch -D feature/test-governance
```

### 3. First PR Creation

```bash
# Start feature work
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Make changes, commit with signature
git commit -S -m "feat(domain): implement something"

# Push
git push origin feature/my-feature

# Go to GitHub → Create Pull Request
# Template auto-fills → complete checklist → submit

# Wait for CI/CD pipeline → gates must pass
# Request review from 2+ colleagues (never yourself)
# Once approved → Tech Lead merges
```

---

## ⚠️ Violations & Escalations

### Self-Approval Detected

```
Violation: Developer A creates PR, then approves own code
Detection: Automated (CI/CD checks PR author vs approvers)
Response: PR blocked, error message, auto-comment by bot
Escalation: Slack notification to Chief Architect
Recovery: Reopen PR, get review from different person
```

### Missing Test Coverage

```
Violation: PR merged with coverage < 90% (or < 95% domain)
Detection: Automated (codecov bot checks coverage)
Response: PR blocked, coverage report appended to PR
Action: Developer adds tests, pushes again
Escalation: If repeated, discussion with Tech Lead
```

### Unsigned Commit Detected

```
Violation: Commit to main without GPG signature
Detection: Pre-receive hook (server-side)
Response: Push rejected, error message with instructions
Fix: git rebase, re-sign commits, push again
```

### Hardcoded Secret Detected

```
Violation: API key or password in code
Detection: SAST scan (SonarQube) + pre-commit hook
Response: Commit blocked / PR failed, secret must be removed
Action: Rotate secret, configure Key Vault, retry
Escalation: Security incident report if secret was pushed
```

---

## 📖 Documentation & Training

### Prerequisite Reading

- [ ] `docs/governance/GOVERNANCE_BASELINE.md` (30 min)
- [ ] `docs/governance/git-flow-governance.md` (20 min)
- [ ] `docs/governance/quality-testing-standards.md` (25 min)
- [ ] `docs/compliance/financial-domain-invariants.md` (40 min - financial domain only)

### Training Checklist

- [ ] Attended Git Flow workshop (if team member)
- [ ] GPG key configured & tested
- [ ] SOLID principles refresher + DDD basics
- [ ] TDD (Red → Green → Refactor) practiced
- [ ] Case study: Existing feature review against governance
- [ ] Q&A session with Chief Architect

### Resources

- GitHub Wiki: `https://github.com/lcwps/rlapp/wiki` (internal)
- ADRs (Architecture Decision Records): `docs/architecture/ADR-*.md`
- API Documentation: Auto-generated from Swagger
- Slack Channel: `#governance-discussions` (internal)

---

## 🏆 Recognition & Incentives

### Best Practices Awards

- **Golden Commit:** Highest quality, well-tested, well-documented PR (monthly)
- **Domain Master:** Best financial domain logic implementation (quarterly)
- **Security Champion:** Zero security findings, proactive vulnerability fixes (quarterly)
- **Test Wizard:** Highest mutation score, comprehensive edge cases (quarterly)

---

## 🔄 Feedback & Improvements

### Change Request Process

1. **Identify issue** in governance → open GitHub Issue
2. **Propose change** → discuss in `#governance-discussions` Slack
3. **Draft proposal** → PR against `docs/governance/*.md`
4. **Review cycle** → Architecture Board sign-off required
5. **Approved?** → Apply to all future work
6. **Not approved?** → Document decision, re-evaluate Q1/Q2

---

## 📞 Support & Escalation

| Pregunta | Contacto | Time |
|----------|----------|------|
| Git commands | Tech Lead | Hours |
| Architecture decisions | Chief Architect | Days |
| Compliance questions | Chief Compliance Officer | Hours |
| Security concerns | CISO | Hours |
| Financial domain rules | CFO + Domain Expert | Days |
| Policy clarification | Change Control Board | Days |

---

**Governance Framework Status:** 🔒 ENTERPRISE-BINDING
**Last Updated:** 24 de febrero de 2026
**Next Review:** Q2 2026
**Approved by:** Chief Enterprise Architect
**Effective Date:** 24 de febrero de 2026 — Indefinido
