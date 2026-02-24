# Pre-Merge Compliance Checklist

> **CRITICAL:** This checklist MUST be completed and verified before ANY merge to develop/qa/main.
> **Owner:** Tech Lead / Merge Authority
> **Status:** Self-enforcing (automated gates + manual verification)

---

## 📋 Phase 1: Automated Gates (CI/CD Pipeline)

### ✅ Tests Passed

- [ ] **Unit Tests:** 100% passing
  - Command: `dotnet test --filter "Category=Unit"`
  - Status: Build log shows ✓ ALL PASSED
  - Evidence: Link to CI/CD run

- [ ] **Integration Tests:** 100% passing
  - Command: `dotnet test --filter "Category=Integration"`
  - Status: Build log shows ✓ ALL PASSED
  - Evidence: Link to CI/CD run

- [ ] **Test Coverage >= 90%**
  - Line coverage: ___% (must be ≥ 90%)
  - Branch coverage: ___% (must be ≥ 90%)
  - Evidence: CodeCov report link

- [ ] **Domain Coverage >= 95% (Financial Domain)**
  - FinancialValidation aggregate: ___% (must be ≥ 95%)
  - All invariants covered: [ ] Yes
  - Evidence: SonarQube code coverage dashboard

- [ ] **Mutation Testing >= 80%** (Financial domain only)
  - Mutation score: ___%
  - Stryker report: [Link to report]
  - Status: [ ] PASS / [ ] FAIL (block merge if fail)

### 🔐 Security Gates Passed

- [ ] **SAST (SonarQube) - Zero Critical Findings**
  - Critical issues: 0
  - High issues: ___ (with justification if > 0)
  - Code smells: ___ (with documented trade-offs if any)
  - Status: Quality gate: [PASS / FAIL]
  - Evidence: SonarQube dashboard link

- [ ] **SCA (Snyk) - Zero Critical Dependencies**
  - Critical vulnerabilities: 0
  - High vulnerabilities: ___ (with remediation plan)
  - Command: `snyk test --severity-threshold=high`
  - Status: [PASS / FAIL]
  - Evidence: Snyk report link

- [ ] **Container Scan (Trivy) - Zero Critical CVEs**
  - Critical CVEs: 0
  - High CVEs: ___ (with patch status)
  - Image scanned: rlapp-backend:[$SHA]
  - Status: [PASS / FAIL]
  - Evidence: Trivy scan report

- [ ] **Secrets Detection - Clean**
  - Hardcoded secrets found: 0
  - Scanner: GitGuardian ✓ CLEAN
  - Pre-commit hook: ✓ PASSED
  - Evidence: GitGuardian report link

- [ ] **Linting & Formatting**
  - StyleCop violations: 0 (or documented exceptions)
  - Code formatting: ✓ COMPLIANT (`dotnet format`)
  - Naming conventions: ✓ English ONLY
  - Status: [PASS / FAIL]

---

## 📋 Phase 2: Manual Code Review

### 👨‍💻 Code Quality Review (Reviewer 1)

**Reviewer Name:** ___________________
**Review Date:** ___________________

#### SOLID Principles

- [ ] **Single Responsibility Principle**
  - [ ] Each class has one reason to change
  - [ ] Methods are focused and concise
  - Concerns: [List any concerns]

- [ ] **Open/Closed Principle**
  - [ ] Code is open for extension, closed for modification
  - [ ] Uses inheritance/interfaces appropriately
  - Concerns: [List any concerns]

- [ ] **Liskov Substitution Principle**
  - [ ] Subclasses are substitutable for base classes
  - [ ] No surprising behavior in overrides
  - Concerns: [List any concerns]

- [ ] **Interface Segregation Principle**
  - [ ] Interfaces are focused and lean
  - [ ] No "fat" interfaces for convenience
  - Concerns: [List any concerns]

- [ ] **Dependency Inversion Principle**
  - [ ] Dependencies on abstractions, not concrete types
  - [ ] Constructor injection used (not static methods)
  - [ ] No service locators
  - Concerns: [List any concerns]

#### DRY & Code Reuse

- [ ] **No Copy-Paste Code**
  - [ ] Duplicated logic refactored into shared method/class
  - [ ] Constants defined once
  - Concerns: [List any concerns]

- [ ] **Reusability & Abstraction**
  - [ ] Common patterns extracted into utilities
  - [ ] Testable components (dependency separation)
  - Concerns: [List any concerns]

#### Anti-Patterns Detection

- [ ] **No Static Methods (where inappropriate)**
  - [ ] Utility classes justified and immutable
  - [ ] No static state
  - Concerns: [List any concerns]

- [ ] **No God Objects**
  - [ ] Classes < 300 lines (average)
  - [ ] No more than 10-15 public methods per class
  - Concerns: [List any concerns]

- [ ] **No Tight Coupling**
  - [ ] Dependencies injected
  - [ ] No hidden dependencies via static calls
  - Concerns: [List any concerns]

- [ ] **Naming Conventions**
  - [ ] Classes: PascalCase
  - [ ] Methods: PascalCase
  - [ ] Variables: camelCase
  - [ ] Constants: UPPER_CASE
  - [ ] English ONLY (no Spanish)
  - Concerns: [List any violations]

#### Complexity Assessment

- [ ] **Cyclomatic Complexity**
  - [ ] Average method complexity < 10
  - [ ] No single method > 20 complexity
  - Methods with high complexity: [List and justification]

- [ ] **Readability**
  - [ ] Comments explain "why", not "what"
  - [ ] Variable names are self-documenting
  - [ ] No overly nested code (max 3 levels)
  - Concerns: [List any concerns]

**Reviewer 1 Sign-off:**

- [ ] **APPROVED** - Code meets quality standards
- [ ] **APPROVED WITH COMMENTS** - Address concerns in next iteration
- [ ] **REJECTED** - Critical issues must be resolved before merge

**Signature:** ________________________
**Date:** ___________________

---

### 🏗️ Architecture & Domain Review (Reviewer 2)

**Reviewer Name:** ___________________
**Review Date:** ___________________

#### Domain-Driven Design

- [ ] **Aggregate Boundaries**
  - [ ] Aggregate responsibilities clear
  - [ ] No cross-aggregate violations
  - [ ] Aggregate root is the only external entry point
  - Concerns: [List any concerns]

- [ ] **Domain Invariants**
  - [ ] Invariants enforced within aggregate
  - [ ] Business rules protected in domain layer
  - [ ] No invariant bypassing via infrastructure
  - Affected invariants: [List]

- [ ] **Value Objects**
  - [ ] Money, Dates, IDs modeled as value objects
  - [ ] Immutable and comparable
  - Value objects in PR: [List]

- [ ] **Domain Events**
  - [ ] Events represent business facts
  - [ ] Named in past tense (Completed, Registered, etc.)
  - [ ] All significant state changes produce events
  - Events in PR: [List]

- [ ] **Repository Pattern**
  - [ ] Aggregates persisted via repositories
  - [ ] No leaking of persistence technology
  - [ ] Queries through repositories/queries (CQRS)
  - Repositories affected: [List]

#### Clean Architecture Layers

- [ ] **Domain Layer (innermost)**
  - [ ] Pure business logic, no framework dependencies
  - [ ] No references to outer layers
  - [ ] Highly testable
  - Concerns: [List any violations]

- [ ] **Application Layer**
  - [ ] Orchestrates domain logic
  - [ ] No business logic in application layer
  - [ ] DTOs for cross-boundary data
  - Concerns: [List any violations]

- [ ] **Infrastructure Layer (outermost)**
  - [ ] Persistence, messaging, external services
  - [ ] Abstract behind interfaces (dependency inversion)
  - [ ] Framework-specific code hidden
  - Concerns: [List any violations]

- [ ] **API Layer (Controller/Endpoints)**
  - [ ] Thin controllers, logic pushed to application/domain
  - [ ] Proper HTTP status codes
  - [ ] Input validation before domain
  - Concerns: [List any violations]

#### Event Sourcing & CQRS (if applicable)

- [ ] **Event Sourcing Rules**
  - [ ] Event Store is append-only (no updates/deletes)
  - [ ] No projection logic in domain
  - [ ] Event versioning strategy documented
  - Concerns: [List any violations]

- [ ] **CQRS Separation**
  - [ ] Commands modify state
  - [ ] Queries read from projections
  - [ ] No command handlers returning data (only IDs)
  - Concerns: [List any violations]

#### Test Coverage & Verification

- [ ] **Domain Layer Tests**
  - [ ] Invariants tested (all paths covered)
  - [ ] Domain events verified
  - [ ] Edge cases covered
  - [ ] Coverage: __% (must be ≥ 95%)

- [ ] **Application Layer Tests**
  - [ ] Use case flows tested
  - [ ] Error handling verified
  - [ ] Integration with domain validated
  - [ ] Coverage: __% (must be ≥ 90%)

- [ ] **Infrastructure Layer Tests**
  - [ ] Persistence contracts tested
  - [ ] Message handling verified
  - [ ] External service mocks working
  - [ ] Coverage: __% (must be ≥ 90%)

#### Multi-Tenant Isolation (Critical)

- [ ] **Row-Level Security (RLS)**
  - [ ] RLS policies enforced in PostgreSQL
  - [ ] TenantId in all queries
  - [ ] No cross-tenant data possible
  - [ ] RLS tested: [ ] Yes / [ ] No
  - SQL test evidence: [Query results]

- [ ] **Tenant Context**
  - [ ] TenantId propagated through request
  - [ ] No tenant context bypassing
  - [ ] Isolated in memory structures
  - Concerns: [List any concerns]

**Reviewer 2 Sign-off:**

- [ ] **APPROVED** - Architecture is sound
- [ ] **APPROVED WITH CONDITIONS** - Conditions listed above
- [ ] **REJECTED** - Architecture violations must be resolved

**Signature:** ________________________
**Date:** ___________________

---

### 💰 Financial Domain Review (CCO/Financial Reviewer - IF APPLICABLE)

**Only required for changes affecting financial domain or > UVR 600**

**Reviewer Name:** ___________________
**Review Date:** ___________________

#### Financial Invariants (5 Critical Rules)

- [ ] **Invariant 1: Manual Validation (NO Automation)**
  - [ ] Financial changes NEVER auto-approved
  - [ ] Always requires human review and click
  - [ ] No scheduled approvals
  - Verified: [ ] Yes

- [ ] **Invariant 2: No Self-Approval**
  - [ ] Physician who validates cannot approve
  - [ ] Different person must approve
  - [ ] System prevents self-approval
  - Verified: [ ] Yes

- [ ] **Invariant 3: Dual Approval (> UVR 600)**
  - [ ] First approval by Physician
  - [ ] Second approval required for high amounts
  - [ ] Independent reviewers enforced
  - Verified: [ ] Yes

- [ ] **Invariant 4: No Double Approval**
  - [ ] Approval is idempotent (re-approval = same result)
  - [ ] Cannot approve twice for same amount
  - [ ] Duplicate prevention implemented
  - Verified: [ ] Yes

- [ ] **Invariant 5: Appointment Transition Requires Approval**
  - [ ] Appointment cannot transition without validation
  - [ ] All state changes logged
  - [ ] Audit trail complete
  - Verified: [ ] Yes

#### Event Sourcing (Financial)

- [ ] **Event Immutability**
  - [ ] All financial events append-only
  - [ ] Event Store has constraints preventing updates
  - [ ] Fingerprint chain integrity maintained
  - SQL verification: [ ] Yes

- [ ] **Audit Trail**
  - [ ] Every financial action logged
  - [ ] Who, what, when, why recorded
  - [ ] No deletion of audit records
  - Verified: [ ] Yes

#### Domain Tests (Financial)

- [ ] **Test Suite Coverage >= 95%**
  - [ ] All 5 invariants tested
  - [ ] Happy path scenarios
  - [ ] Exception/error paths
  - [ ] Edge cases (boundary amounts)
  - Coverage: __% (must be ≥ 95%)

#### Risk Assessment

**Amount impact:** [ ] < UVR 100 | [ ] UVR 100-600 | [ ] > UVR 600

**Risk level:** [ ] LOW | [ ] MEDIUM | [ ] HIGH

**Risk mitigation:** [Describe]

**CFO/CCO Sign-off:**

- [ ] **APPROVED** - Financial logic is sound
- [ ] **APPROVED WITH CONDITIONS** - Conditions listed above
- [ ] **REJECTED** - Must resolve before merge

**Signature:** ________________________
**Date:** ___________________

---

## 📋 Phase 3: Git & Commit Verification

### ✅ Commit Quality

- [ ] **All Commits Signed with GPG**
  - Verification: `git log --oneline --show-signature HEAD~N..HEAD`
  - Signed commits: _**/**_
  - Status: [100% SIGNED ✓ / FAILED ✗]
  - Unsigned commits: [List if any]

- [ ] **Conventional Commit Format**
  - [ ] `feat(scope)`: ...
  - [ ] `fix(scope)`: ...
  - [ ] `refactor(scope)`: ...
  - [ ] `chore(scope)`: ...
  - Invalid commits: [List if any]

- [ ] **Commit Messages Meaningful**
  - [ ] First line ≤ 72 characters
  - [ ] Explains "what" and "why"
  - [ ] References issue/ticket
  - Concerns: [List any concerns]

- [ ] **No Large Files**
  - [ ] All files < 10MB
  - [ ] Binary files in Git LFS (if any)
  - Largest file: ___ MB

### ✅ Branch Hygiene

- [ ] **Branch Name Valid**
  - Format: `feature/brief-description-kebab-case`
  - Status: VALID ✓ / INVALID ✗

- [ ] **No Force Pushes**
  - History is clean (no `--force` used)
  - Verified: [ ] Yes

- [ ] **Merged from `develop` Only**
  - Base branch: `develop` ✓
  - Status: Correct ✓ / INCORRECT ✗

### ✅ PR Template Completed

- [ ] **All Sections Filled**
  - [ ] Type of Change selected
  - [ ] Description provided
  - [ ] Related issues linked
  - [ ] Architecture impact documented
  - [ ] Test evidence provided
  - [ ] Security verified
  - [ ] Reviewer assignments filled

---

## 📋 Phase 4: IA-Generated Code Verification (IF APPLICABLE)

**Only if code was generated or assisted by AI/LLM**

- [ ] **IA Audit Trail Exists**
  - File: `docs/ai-generated/YYYY-MM-DD-change-summary.md`
  - Status: [ ] EXISTS ✓ / [ ] MISSING ✗

- [ ] **Audit Trail Contents**
  - [ ] Prompt documented
  - [ ] Model used identified
  - [ ] Changes listed
  - [ ] Tests verified
  - [ ] Invariants checked
  - [ ] 2-person approval documented

- [ ] **Human Validation**
  - [ ] Code reviewed by human
  - [ ] No blindly accepting IA output
  - [ ] Tests modified/verified manually
  - Status: VERIFIED ✓

---

## 📋 Phase 5: Final Approval

### ✅ All Gates Passed?

| Gate | Status | Notes |
|------|--------|-------|
| Automated Tests | [PASS ✓ / FAIL ✗] | |
| Security Scans | [PASS ✓ / FAIL ✗] | |
| Code Coverage | [PASS ✓ / FAIL ✗] | ≥90% overall, ≥95% domain |
| Code Review 1 | [APPROVED ✓ / REJECTED ✗] | |
| Code Review 2 | [APPROVED ✓ / REJECTED ✗] | |
| Financial Review | [APPROVED ✓ / N/A ○] | If applicable |
| Git Compliance | [PASS ✓ / FAIL ✗] | Signed commits, conventions |

### ✅ Decision

- [ ] **✓ MERGE APPROVED** - All gates passed, all reviewers approved
- [ ] **⚠️ CONDITIONAL APPROVAL** - Must address conditions before merge
- [ ] **✗ BLOCKED** - Critical issues prevent merge

### ✅ Merge Authority Sign-off

**Tech Lead / Merge Authority:** ___________________
**Date:** ___________________
**Signature:** ________________________

---

## 📋 Phase 6: Post-Merge Verification

To be completed AFTER merge to develop:

- [ ] PR auto-closed
- [ ] Feature branch auto-deleted
- [ ] Triggers deployment to dev environment
- [ ] Monitoring alerts active
- [ ] Team notified in Slack
- [ ] PIR scheduled for 30 days post-deploy

---

## References

- [Governance Baseline](GOVERNANCE_BASELINE.md)
- [Git Flow Governance](git-flow-governance.md)
- [Quality Testing Standards](quality-testing-standards.md)
- [Financial Domain Invariants](../compliance/financial-domain-invariants.md)
- [Change Governance Protocol](change-governance-protocol.md)

---

**Checklist Version:** 1.0
**Last Updated:** 2026-02-24
**Status:** ENTERPRISE-BINDING
