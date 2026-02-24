# Architecture Decision Record (ADR) Template

**Status:** DRAFT | PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED
**Date:** YYYY-MM-DD
**Author(s):** [Name(s)]
**Reviewers:** [Chief Architect, Domain Expert, etc.]

---

## 1. Title

[Concise, descriptive title for the decision]

---

## 2. Problem Statement

### Context

Describe the situation that led to this decision. Include:

- Current state of the system
- Constraints and limitations
- Business drivers
- Technical challenges

### Issue

What specific problem or question needs to be decided?

---

## 3. Decision

[State the decision clearly and unambiguously]

### Selected Option

What is the chosen approach?

### Why This Option?

Explain the reasoning:

- Advantages vs alternatives
- Alignment with governance baseline
- Regulatory/compliance implications

---

## 4. Consequences

### Positive Impacts

- **Technical:** ...
- **Business:** ...
- **Compliance:** ...

### Negative Impacts / Trade-offs

- **Technical debt introduced:** ...
- **Performance implications:** ...
- **Security considerations:** ...

### Mitigation Strategies

How will negative impacts be managed?

---

## 5. Alternatives Considered

### Option A: [Title]

- **Pros:** ...
- **Cons:** ...
- **Estimation:** ...

### Option B: [Title]

- **Pros:** ...
- **Cons:** ...
- **Estimation:** ...

### Option C: [Title]

- **Pros:** ...
- **Cons:** ...
- **Estimation:** ...

**Rejected because:** [Why options A, B, C were not selected]

---

## 6. Implementation Plan

### Tasks

- [ ] Task 1 - Owner: TBD
- [ ] Task 2 - Owner: TBD
- [ ] Task 3 - Owner: TBD

### Timeline

**Start:** YYYY-MM-DD
**Target completion:** YYYY-MM-DD
**Review date:** YYYY-MM-DD

### Success Criteria

- Criterion 1
- Criterion 2
- Criterion 3

### Testing Strategy

Describe how this decision will be validated:

- Unit tests required
- Integration tests required
- Manual testing scenarios
- Performance benchmarks

---

## 7. Compliance Mapping

### Regulatory Alignment

| Regulation | Article | Requirement | Compliance Status |
|-----------|---------|-------------|-------------------|
| Ley 1581 | Art. X | [Requirement] | ✓ Compliant |
| ISO 27001 | Control X.X | [Requirement] | ✓ Compliant |
| NIST CSF | [Category] | [Requirement] | ✓ Compliant |

### Architecture Principles Alignment

- [ ] SOLID principles respected
- [ ] DDD domain boundaries maintained
- [ ] Clean Architecture layers preserved
- [ ] Event sourcing approach (if applicable)
- [ ] Security stance strengthened or maintained
- [ ] Test coverage maintained/improved (≥90%)

---

## 8. Security & Data Protection Implications

### Confidentiality

- Impact: [No change | Improved | Degraded]
- Mitigation: [If degraded]

### Integrity

- Impact: [No change | Improved | Degraded]
- Mitigation: [If degraded]

### Availability

- Impact: [No change | Improved | Degraded]
- Mitigation: [If degraded]

### Data Retention

- Impact on audit trail: [Describe]
- Impact on PII handling: [Describe]

---

## 9. Financial Domain Impact (if applicable)

### Invariant Changes

Does this decision affect any financial invariants?

- [ ] No impact on financial domain
- [ ] Invariant 1 (Manual validation): [Impact description]
- [ ] Invariant 2 (No self-approval): [Impact description]
- [ ] Invariant 3 (Dual control): [Impact description]
- [ ] Invariant 4 (Appointment transition): [Impact description]
- [ ] Invariant 5 (No double approval): [Impact description]

### Event Store Implications

Does this decision require changes to:

- Event schema? [ ] Yes / [ ] No
- Event sourcing strategy? [ ] Yes / [ ] No
- Financial audit trail? [ ] Yes / [ ] No

---

## 10. Documentation & Knowledge Transfer

### Documentation Updates Required

- [ ] ADR document itself
- [ ] Architecture documentation
- [ ] API documentation (Swagger)
- [ ] Domain model documentation
- [ ] Operations manual
- [ ] Runbook for deployment

### Training & Communication

- [ ] Tech talk presentation date: [Date]
- [ ] Team training required: [ ] Yes / [ ] No
- [ ] Slack channel notification: [ ] Required
- [ ] Wiki update: [ ] Required

---

## 11. Review & Approval

### Architecture Board Review

**Date:** [Date]
**Attendees:** [Names]
**Outcome:** [Approved | Approved with conditions | Rejected]
**Comments:** [Any board comments or conditions]

### Security Review

**Reviewer:** [CISO/Security Officer]
**Date:** [Date]
**Approval:** [ ] Approved / [ ] Rejected
**Security concerns:** [Any concerns raised]

### CFO/Financial Review (if applicable)

**Reviewer:** [CFO or Finance Director]
**Date:** [Date]
**Approval:** [ ] Approved / [ ] Rejected
**Financial impact:** [Describe impact and approval]

### Chief Architect Sign-off

**Signature:** ________________________
**Date:** [Date]

---

## 12. Supersedes

Does this ADR supersede any previous decisions?

- [ ] No previous ADR
- [ ] Supersedes ADR-NNN: [Title]
- [ ] Partially supersedes ADR-NNN: [Title]

**Reference:** [Link to superseded ADR]

---

## 13. References

- [Reference 1](link)
- [Reference 2](link)
- [Governance Baseline](GOVERNANCE_BASELINE.md)
- [Regulatory Matrix](regulatory-matrix.md)
- [Architecture Enforcement](architecture-enforcement.md)

---

## 14. Appendices

### A. Code Example

```csharp
// Example implementation
public class Example
{
    // Code snippet
}
```

### B. Diagrams

[Insert architecture diagrams, sequence diagrams, etc.]

### C. Performance Data

[Insert benchmarks, metrics, or performance test results]

---

**ADR Status Timeline:**

- **Created:** YYYY-MM-DD - DRAFT
- **Presented:** YYYY-MM-DD - PROPOSED
- **Approved:** YYYY-MM-DD - ACCEPTED
- **Implementation Started:** YYYY-MM-DD
- **Completed:** YYYY-MM-DD
- **Review Date:** YYYY-MM-DD (Annual review)

---

**Document Control:**

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | YYYY-MM-DD | [Author] | Initial version |
| 1.1 | YYYY-MM-DD | [Author] | [Changes made] |

---

**Next Review Date:** [YYYY-MM-DD + 1 year]

For questions or clarifications, contact: [Chief Architect email]
