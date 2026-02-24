# Pull Request Compliance Template

> **IMPORTANTE:** Este template es OBLIGATORIO para todos los PRs. Si no se completa, el PR será rechazado automáticamente.

---

## Type of Change

- [ ] 🆕 Feature (non-breaking)
- [ ] 🐛 Bug fix
- [ ] ⚠️ Breaking change
- [ ] 📖 Documentation
- [ ] ♻️ Refactoring
- [ ] 🔒 Security fix

---

## Description

**Brief summary of what this PR accomplishes:**

[Describe your changes here]

---

## Related Issue / Change Request

Fixes #123 or CHANGE-2026-XXX

---

## Architecture & Domain Impact

**Aggregate(s) affected:** (e.g., FinancialValidation, Appointment)

**Domain logic added/modified:** YES / NO

If YES:

- List invariants affected: _______________
- Domain events emitted: _______________
- Event store implications: _______________

---

## ✅ Mandatory Compliance Checklist

### Code Quality

- [ ] ✓ Code follows SOLID principles (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)
- [ ] ✓ No anti-patterns detected (static methods, god objects, tight coupling)
- [ ] ✓ DRY principle applied (no copy-paste, reuse existing abstractions)
- [ ] ✓ Naming conventions: English ONLY (no Spanish in variable names)
- [ ] ✓ Max cyclomatic complexity: < 10 per method

### Testing Requirements

- [ ] ✓ Unit tests added/updated
- [ ] ✓ Test code coverage: >= 90% (overall), >= 95% (domain/financial only)
- [ ] ✓ TDD applied: Red → Green → Refactor (tests written first)
- [ ] ✓ Integration tests for critical paths
- [ ] ✓ Mock/stubs used appropriately (no real DB calls in unit tests)
- [ ] ✓ All tests passing locally: `dotnet test`

### Financial Domain (IF applicable)

- [ ] ✓ Financial invariants verified (no auto-approval, no self-approval)
- [ ] ✓ Domain events properly emitted
- [ ] ✓ Event Store entries append-only (no mutations)
- [ ] ✓ Audit trail for financial operations logged
- [ ] ✓ Domain coverage >= 95% achieved: ____%

### Security & Compliance

- [ ] ✓ No hardcoded secrets (API keys, passwords, tokens)
- [ ] ✓ SAST scan passed (SonarQube: 0 critical findings)
- [ ] ✓ Dependency scan passed (Snyk: no unpatched vulnerabilities)
- [ ] ✓ Container image scan passed (Trivy: no critical CVEs)
- [ ] ✓ RLS verification (Row-Level Security enforceable in SQL)
- [ ] ✓ Tenant isolation verified (TenantId in all queries)
- [ ] ✓ Encryption at rest/transit (AES-256 + TLS 1.3)

### Git & Commits

- [ ] ✓ All commits signed with GPG: `git commit -S`
- [ ] ✓ Commits follow conventional format:

  ```
  feat(domain): description
  fix(domain): description
  refactor(domain): description
  chore(domain): description
  ```

- [ ] ✓ No large files (> 10MB) committed
- [ ] ✓ No merge conflicts in develop/main
- [ ] ✓ Branch created from `develop` (never from main/qa)
- [ ] ✓ Branch name: `feature/brief-description-kebab-case`
- [ ] ✓ Force push: NOT USED (ever)

### Documentation

- [ ] ✓ Code comments for complex logic (esp. domain invariants)
- [ ] ✓ `// HUMAN CHECK` markers for trade-offs (if applicable)
- [ ] ✓ README.md updated (if new feature)
- [ ] ✓ API documentation updated (Swagger/OpenAPI)
- [ ] ✓ **AI-GENERATED CODE:** `docs/ai-generated/YYYY-MM-DD-change-summary.md` EXISTS (if applicable)

### Scope Enforcement

- [ ] ✓ ONLY modified files in `rlapp-backend/` (NEVER frontend/)
- [ ] ✓ No unrelated changes (single responsibility per PR)
- [ ] ✓ No test fixtures modified without approval
- [ ] ✓ No build/pipeline configs changed without CCB approval

---

## Test Evidence

**Provide test execution logs:**

### Unit Tests

```bash
$ dotnet test --logger:"console;verbosity=detailed" /p:CollectCoverage=true
# Result: PASS ✓ (145/151 tests passed, 96% coverage)
```

### Integration Tests

```bash
$ dotnet test --filter "Category=Integration"
# Result: PASS ✓ (32/32 integration tests passed)
```

### Domain Coverage (Financial only)

```
FinancialValidation Domain Coverage: ____%
├─ Invariant 1 (Manual validation): COVERED ✓
├─ Invariant 2 (No self-approval): COVERED ✓
├─ Invariant 3 (Dual control): COVERED ✓
├─ Invariant 4 (Appointment transition): COVERED ✓
└─ Invariant 5 (No double approval): COVERED ✓
```

---

## Security & Audit

**SAST Scan Results:**

- [ ] ✓ SonarQube: 0 critical findings
- [ ] ✓ Code smells: 0 or documented
- [ ] ✓ Security hotspots: 0 critical

**Dependency Scan:**

- [ ] ✓ Snyk: All dependencies up-to-date
- [ ] ✓ No new vulnerabilities introduced

**Secrets Scan:**

- [ ] ✓ Pre-commit hook verified: No hardcoded secrets
- [ ] ✓ GitGuardian scan: CLEAN

**RLS/Tenant Isolation (if applicable):**

- [ ] ✓ Row-Level Security tested
- [ ] ✓ TenantId filtering verified in queries
- [ ] ✓ No cross-tenant data leak possible

---

## Reviewer Assignment

**Reviewer 1 (Code Quality & Architecture):**

- [ ] Assigned (must NOT be PR author)
- [ ] Name: _____________________

**Reviewer 2 (Domain Logic & Compliance):**

- [ ] Assigned (must NOT be PR author, different from Reviewer 1)
- [ ] Name: _____________________

**Optional: Domain Expert Review (Financial changes only):**

- [ ] Assigned: _____________________ (if > UVR 600 impact)

---

## Merge Instructions

**CRITICAL:** PR author CANNOT execute merge.

**Tech Lead / Merge Authority:**

1. Verify all gates passed: Tests ✓, SAST ✓, Approvals ✓
2. Execute merge:

   ```bash
   git checkout develop
   git pull origin develop
   git merge --no-ff feature/XXXX-description
   git tag -a vX.Y.Z-dev -m "dev release: feature description"
   git push origin develop --follow-tags
   ```

3. Verify PR auto-closed + branch auto-deleted
4. Monitor deployment to QA (automatic after 7 days green)

---

## Compliance Attestation

By submitting this PR, I confirm:

- ✓ I have read and understand the governance baseline (`docs/governance/GOVERNANCE_BASELINE.md`)
- ✓ All code changes follow SOLID principles and DDD patterns
- ✓ All tests are passing and coverage thresholds are met
- ✓ No self-approval attempted; assigned to qualified reviewers
- ✓ All commits are signed with my GPG key
- ✓ No secrets, hardcoded credentials, or sensitive data exposed
- ✓ Financial domain changes (if any) are correctly invariant-protected
- ✓ RLS and tenant isolation verified (if applicable)
- ✓ AI audit trail present (if code was AI-generated)

**Author Signature (digital):** [GPG signed action]

---

## Notes for Reviewers

[Optional: Any special considerations, trade-offs, known issues]

---

## Deployment Checklist (Post-Merge)

*To be completed by DevOps after merge to develop:*

- [ ] Deployed to dev environment
- [ ] Smoke tests passing
- [ ] Promoted to qa (automatic after 7 days)
- [ ] QA team sign-off received
- [ ] Promoted to main
- [ ] Production deployment executed
- [ ] Monitoring alerts active
- [ ] Post-implementation review scheduled (30 days post-deploy)

---

**Template Version:** 1.0
**Last Updated:** 2026-02-24
**Binding:** MANDATORY for all PRs
