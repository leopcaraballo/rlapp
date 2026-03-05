# Protocolo de Gobernanza de Cambios (IA-Nativa)

**Versión:** 1.0
**Fecha:** 24 de febrero de 2026
**Scope:** `rlapp-backend/` ÚNICAMENTE
**Binding:** Mission-Critical
**Owner:** Chief Architect + Change Control Board

---

## 1. Change Request Lifecycle

```
┌──────────────────────────────────────────────────────────┐
│ 1. INITIATE (Usuario / IA)                               │
│    └─ Solicitud de cambio (descripción, scope)           │
├──────────────────────────────────────────────────────────┤
│ 2. ANALYZE (Arquitecto)                                  │
│    ├─ Impacto assessment (qué se afecta)                 │
│    ├─ Riesgo assessment (qué puede fallar)               │
│    └─ Compliance check (regulaciones aplicables)         │
├──────────────────────────────────────────────────────────┤
│ 3. PLAN (Sub-Agent / Developer)                          │
│    ├─ Action plan (archivos, cambios propuestos)         │
│    └─ Riesgos mitigados                                  │
├──────────────────────────────────────────────────────────┤
│ 4. REVIEW (Peer + Domain Expert)                         │
│    ├─ Code review (SOLID, anti-patterns)                 │
│    ├─ Domain review (invariantes, eventos)               │
│    └─ Compliance review (RLS, audit, encryption)         │
├──────────────────────────────────────────────────────────┤
│ 5. APPROVE (2 Collaborators - NO Self-approval)          │
│    ├─ Approval 1: Code Quality                           │
│    └─ Approval 2: Domain + Compliance                    │
├──────────────────────────────────────────────────────────┤
│ 6. IMPLEMENT (Developer)                                 │
│    ├─ Code changes                                       │
│    ├─ Unit tests                                         │
│    └─ Integration tests                                  │
├──────────────────────────────────────────────────────────┤
│ 7. VALIDATE (Automated + Manual)                         │
│    ├─ CI/CD gates (tests, SAST, coverage)                │
│    ├─ Domain coverage ≥ 95%                              │
│    └─ Audit trail verified                               │
├──────────────────────────────────────────────────────────┤
│ 8. DOCUMENT (Architect)                                  │
│    ├─ AI audit trail (if IA-generated)                   │
│    ├─ Architecture Decision Record (ADR)                 │
│    └─ AI_WORKFLOW.md registration                        │
├──────────────────────────────────────────────────────────┤
│ 9. COMMIT (Developer)                                    │
│    ├─ Signed commit (GPG)                                │
│    ├─ Conventional format                                │
│    └─ Reference to change ID                             │
├──────────────────────────────────────────────────────────┤
│ 10. PROMOTE (Automated Pipeline)                         │
│     ├─ develop → qa (1 week if green)                    │
│     └─ qa → main (after QA sign-off)                     │
├──────────────────────────────────────────────────────────┤
│ 11. CLOSE (Change Control Board)                         │
│     ├─ Post-implementation review                        │
│     ├─ Metrics (uptime, errors, performance)             │
│     └─ Lessons learned                                   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. IA-Native Change Requirements

### 2.1 Audit Trail for IA-Generated Code (MANDATORY)

**REGLA:** Todo cambio generado por IA requiere archivo de registro en:

```
rlapp-backend/docs/ai-generated/
```

**Formato:** `YYYY-MM-DD-HH:MM:SS-change-summary.md`

**Ejemplo:** `2026-02-24-14-30-00-financial-validation-endpoint.md`

```markdown
# IA-Generated Code Audit Trail

**Generated:** 2026-02-24 14:30:00 UTC
**AI Model:** Claude Opus 4.5
**Change ID:** CHANGE-2026-001
**Feature:** feature/financial-validation-endpoint

---

## 1. Original Prompt

"Implementar endpoint POST para aprobación manual de validación financiera.
Agregar Domain-Driven Design, invariantes de dominio, event sourcing,
y logging inmutable para auditoría. Cobertura mínima 95% en tests de dominio."

---

## 2. AI Model & Reasoning

- **Model:** Claude Opus 4.5 (Tier 2)
- **Reasoning:** High-quality task for financial domain logic
- **Output Window:** 32K tokens (sufficient for code + tests + summary)
- **Recommended for this task:** ✓ Optimal choice

---

## 3. Generated Code Summary

### Files Modified

1. **Domain Aggregate**
   - Path: `src/Services/FinancialService/Domain/FinancialValidation.cs`
   - Lines: 245 (new)
   - Method: ApproveManually() with invariant enforcement

2. **Application Command Handler**
   - Path: `src/Services/FinancialService/Application/ApproveFinancialValidationCommandHandler.cs`
   - Lines: 78 (new)
   - Method: Handle() orchestrating domain + infrastructure

3. **Domain Events**
   - Path: `src/Services/FinancialService/Domain/Events/FinancialValidationApprovedManually.cs`
   - Lines: 32 (new)
   - Event: Immutable domain event for audit trail

4. **Repository**
   - Path: `src/Services/FinancialService/Infrastructure/SqlFinancialRepository.cs`
   - Lines: 120 (modified)
   - Method: Save() persisting events to Event Store

5. **Tests (Domain)**
   - Path: `src/Services/FinancialService/Tests/FinancialValidationAggregateTests.cs`
   - Lines: 542 (new)
   - Coverage: 96% domain, 25 test cases

6. **Tests (Integration)**
   - Path: `src/Services/FinancialService/Tests/ApproveFinancialValidationEndToEndTests.cs`
   - Lines: 234 (new)
   - Coverage: Full workflow validation

---

## 4. Invariants Verified

- [x] Manual validation (no auto-approval)
- [x] No self-approval (creator cannot approve own)
- [x] Dual control for > UVR 600
- [x] No double approval
- [x] Event sourcing with immutable audit trail
- [x] RLS for tenant isolation
- [x] Domain coverage ≥ 95% achieved: 96%

---

## 5. Tests Generated & Results

```

FinancialValidationApproveTests
├─ TransitionToWaiting_WhenNotApproved_ThrowsException: PASS
├─ ApproveManually_WithEmptyUserId_ThrowsException: PASS
├─ ApproveManually_BySameUserWhoCreated_ThrowsException: PASS
├─ ApproveManually_HighAmountByPhysician_ThrowsException: PASS
├─ ApproveManually_HighAmountDualControl_Succeeds: PASS
├─ ApproveManually_WhenAlreadyApproved_ThrowsException: PASS
├─ ApproveManually_RaisesDomainEvent: PASS
├─ ApproveManually_PublishesEventToRabbitMQ: PASS
└─ ... [18 more tests]

SUMMARY: 25/25 PASS ✓
Code Coverage: 96%
Domain Coverage: 96%

```

---

## 6. Security & Compliance

- **SAST Scan:** ✓ CLEAN (0 critical findings)
- **Dependency Scan:** ✓ CLEAN (no new vulnerable packages)
- **Secrets Scan:** ✓ CLEAN (no API keys, passwords embedded)
- **RLS Verification:** ✓ PASSED (tenant isolation enforced in queries)
- **Audit Trail:** ✓ Event Store configured, append-only constraints in place

---

## 7. Human Review & Approval

### Reviewer 1 (Code Quality)
- **Name:** Senior Dev Lead
- **Date:** 2026-02-25
- **Status:** APPROVED
- **Comments:** "SOLID principles applied correctly. Repository pattern clean. No anti-patterns detected."
- **Signature:** [GPG signed]

### Reviewer 2 (Domain + Compliance)
- **Name:** Chief Architect
- **Date:** 2026-02-25
- **Status:** APPROVED
- **Comments:** "Domain invariants correctly enforced. Event sourcing implementation solid. RLS validation passed. Audit trail immutable. Compliant with Circular SFC 000031."
- **Signature:** [GPG signed]

---

## 8. Regulatory Compliance Map

| Norma | Requerimiento | Verificado |
|-------|--------------|-----------|
| Circular SFC 000031 | Manual approval required | ✓ |
| Circular SFC 000031 | Dual control > UVR 600 | ✓ |
| Ley 1581 | Audit trail immutable | ✓ |
| ISO 27001 | RLS enforcement | ✓ |
| OWASP | No injection vulnerabilities | ✓ |

---

## 9. Deployment Information

- **Branch:** feature/financial-validation-endpoint
- **Merge Commit:** `a3c5f7d9e1b2c6a8f0d3e5c7a9b1d3f5`
- **Tag:** v1.2.3-dev
- **Promoted to QA:** 2026-03-01 (after 7-day green period)
- **Promoted to Main:** 2026-03-08 (pending QA sign-off)

---

## 10. Artifacts Generated

- [x] Code files (6 total)
- [x] Test files (2 files, 542 + 234 lines)
- [x] Documentation (ADR-XXX.md)
- [x] AI audit trail (this file)
- [x] Change summary (registered in AI_WORKFLOW.md)

---

**Status:** APPROVED & MERGED
**Timestamp:** 2026-02-25 16:45:00 UTC
**Change Control ID:** CHANGE-2026-001
```

### 2.2 Checklist: PR MUST Include AI Audit Trail

```
If ANY code was generated by AI (ChatGPT, Claude, etc.):
  - [ ] docs/ai-generated/YYYY-MM-DD-HH:MM:SS-change-summary.md EXISTS
  - [ ] File includes: Original prompt, AI model used, code summary
  - [ ] File includes: Invariants verified, tests results
  - [ ] File includes: Human reviewer approvals (2 signatures)

If NO AI was used:
  - [ ] Comment in PR: "This PR was written entirely by humans"
  - [ ] Skip AI audit trail file

CONSEQUENCE OF MISSING AI AUDIT TRAIL:
  - PR rejected automatically by CI/CD
  - Message: "AI audit trail missing. See docs/governance/change-governance-protocol.md"
  - Cannot merge without this file
```

---

## 3. Change Control Board (CCB)

### 3.1 Composition

| Rol | Responsabilidad | Veto Power |
|-----|-----------------|-----------|
| **Chief Architect** | Arquitectura, risk assessment | Sí |
| **Chief Financial Officer** | Validación financiera, compliance | Sí |
| **Chief Information Security Officer** | Seguridad, encriptación, auditoría | Sí |
| **Tech Lead** | Implementación, testing | No |
| **Domain Expert (Financial)** | Invariantes, business rules | Sí |

### 3.2 Change Classification & Approval Matrix

| Cambio | Low Risk | Medium Risk | High Risk | Veto Power |
|--------|----------|-------------|-----------|-----------|
| Feature normal | Tech Lead + 1 dev | CCB (2) | CCB (all) | CCO |
| Financial invariant | N/A | N/A | CCB (all mandatory) | CFO |
| Security/encryption | N/A | CCB (2) | CCB (all) | CISO |
| Data schema | Tech Lead (1) | CCB (2) | CCB (all) | CISO |
| API breaking change | CCB (2) | CCB (all) | + legal review | CTO |
| RLS modification | N/A | CCB (all) | + Supersalud audit | CISO |

---

## 4. Risk Assessment Template

**Change Request:** CHANGE-2026-XXX

### Impact Analysis

```
AFFECTED COMPONENTS:
├─ FinancialValidation Aggregate        [impact: HIGH]
├─ AppointmentService                   [impact: MEDIUM]
├─ RabbitMQ event publishing            [impact: LOW]
└─ PostgreSQL event store               [impact: MEDIUM]

AFFECTED TENANTS:
├─ Clínica Salud Integral               [impact: HIGH]
├─ Hospital San Jose                    [impact: HIGH]
└─ All future tenants                   [impact: MEDIUM]

ROLLBACK DIFFICULTY:
├─ Code: Easy (reverting commit)
├─ Data: HARD (immutable event store cannot be deleted)
├─ Approval status: IRREVERSIBLE (already approved financially)
    → Risk: If approved amount wrong, ONLY manual correction via CCO override

BLAST RADIUS: HIGH (Financial approval affects patient care continuity)
```

### Risk Register

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| Financial invariant broken | Low | CRITICAL | 95% domain test coverage |
| Self-approval allowed | Very Low | CRITICAL | Test + code review |
| RLS violated (tenant leak) | Very Low | CRITICAL | RLS test suite + audit |
| Data loss in event store | Very Low | CRITICAL | Daily geo-redundant backups |
| Performance degradation | Low | Medium | Load testing baseline |

---

## 5. Approval Sign-off Template

```
CHANGE APPROVAL FORM
═══════════════════════════════════════════

Change ID: CHANGE-2026-XXX
Description: Implement manual financial validation endpoint
Risk Level: HIGH

┌─────────────────────────────────────────┐
│ REVIEW DECISION                         │
└─────────────────────────────────────────┘

Reviewer 1: Code Quality & Architecture
  Name: Juan Tecnólogo
  Date: 2026-02-25
  Result: ✓ APPROVED
  Comments: "Code is clean, SOLID principles applied, no tech debt introduced"
  Signature: 0x12AB...FE34 (GPG signed)

Reviewer 2: Domain Logic & Compliance
  Name: María Arquitecta
  Date: 2026-02-25
  Result: ✓ APPROVED
  Comments: "Financial invariants correctly enforced. 96% domain coverage. Audit trail immutable.
             SFC 000031 compliant. Ready for prod."
  Signature: 0x56CD...AB78 (GPG signed)

Optional: CCO Override (if high financial risk)
  Name: Carlos Chief Compliance Officer
  Date: (if needed)
  Result: ✓ APPROVED / ⊘ CONDITIONAL / ✗ REJECTED
  Signature: (GPG signed, if executed)

═══════════════════════════════════════════
FINAL STATUS: APPROVED FOR MERGING
═══════════════════════════════════════════
```

---

## 6. Post-Implementation Review (PIR)

**Ejecutado 30 días después de ir a producción**

### Checklist

```
□ System uptime: >= 99.5% (target)
□ Financial validations processed: Count OK
□ False rejections: 0
□ SLA compliance: 100% (manual approvals within time)
□ Security incidents: 0
□ Audit trail integrity: 100% (fingerprints verified)
□ RLS violations: 0 detected
□ Performance impact: < 5% latency increase
□ User adoption: Positive feedback
□ Regulatory feedback: None
□ Lessons learned: Documented
```

### PIR Report

```markdown
POST-IMPLEMENTATION REVIEW (PIR)

Change: CHANGE-2026-001 (Financial Validation Endpoint)
Deployment: 2026-03-08 to Production
Review Date: 2026-04-08

METRICS:
✓ Uptime: 99.98% (exceeded 99.5% target)
✓ Validations: 1,247 processed (100% manually approved)
✓ False rejections: 0
✓ SLA compliance: 100% (avg 2.3 min approval time)
✓ P95 response time: 187ms (< 200ms target)
✓ Security incidents: 0
✓ Audit trail: 100% integrity verified

ISSUES ENCOUNTERED: None

LESSONS LEARNED:
1. Domain-driven design proved valuable for complex financial logic
2. Mutation testing caught weak test cases (improved from 89% to 92%)
3. Event sourcing immutability prevented data tampering

RECOMMENDATIONS:
1. Apply same DDD patterns to other domain models
2. Mandatory mutation testing for all financial code
3. Consider expanding dual-control to other high-risk operations

APPROVAL: ✓ SUCCESS - Meets all criteria
```

---

## 7. Automated Enforcement (CI/CD Gates)

```yaml
# .github/workflows/change-governance.yml
name: Change Governance Gate

on: [pull_request]

jobs:
  change-governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Gate 1: AI Audit Trail Check
      - name: Validate AI Audit Trail
        run: |
          # Check if code contains AI markers (e.g., "# Generated by...")
          if grep -r "Generated by AI" src/; then
            if [ ! -f "docs/ai-generated/*-change-summary.md" ]; then
              echo "❌ AI-generated code detected but no audit trail found"
              echo "   See: docs/governance/change-governance-protocol.md section 2.1"
              exit 1
            fi
          fi

      # Gate 2: Self-Approval Prevention
      - name: Prevent Self-Approval
        run: |
          author=$(git log -1 --format='%an' ${{ github.base_ref }})
          pr_author="${{ github.event.pull_request.user.login }}"

          if [ "$author" == "$pr_author" ]; then
            echo "❌ Self-approval detected"
            exit 1
          fi

      # Gate 3: Financial Domain Coverage Check
      - name: Verify Domain Coverage >= 95%
        run: |
          if git diff origin/develop..HEAD | grep -q "FinancialValidation"; then
            # Financial domain changed - enforce 95% coverage
            coverage=$(grep 'FinancialValidation.*line-rate' coverage.xml | sed 's/.*"\([^"]*\)".*/\1/')
            if (( $(echo "$coverage < 0.95" | bc -l) )); then
              echo "❌ Financial domain coverage ${coverage} < 95% (CRITICAL)"
              exit 1
            fi
          fi

      # Gate 4: Signed Commits Check
      - name: Verify Commits Signed
        run: |
          commits=$(git rev-list --no-merges origin/develop..HEAD)
          for commit in $commits; do
            if ! git verify-commit --raw "$commit" 2>&1 | grep -q "Good signature"; then
              echo "❌ Unsigned commit: $commit"
              echo "   Use: git commit -S"
              exit 1
            fi
          done

      # Gate 5: Regulatory Compliance
      - name: Compliance Check
        run: |
          # If financial code detected, ensure compliance checklist present
          if grep -q "FinancialValidation\|ApproveFinancially\|financial.approval" \
                  src/**/*.cs; then
            # Check PR body for compliance statement
            if ! grep -q "Compliance Checklist" "${{ github.event.pull_request.body }}"; then
              echo "⚠️  Warning: Suggest adding compliance checklist to PR"
            fi
          fi

      - name: Report Gate Results
        if: always()
        run: |
          echo "✓ Change governance gates executed successfully"
          echo "✓ Ready for peer review (2 collaborators)"
```

---

**Change Governance Status:** ENTERPRISE-BINDING
**Enforcement:** Automated CI/CD + Manual CCB review
**Escalation:** To Chief Architect on high-risk changes
