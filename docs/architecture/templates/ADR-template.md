# Architecture Decision Record (ADR) Template

**Title**: [ADR-XXX: Brief Decision Title]

**Date**: [YYYY-MM-DD]  
**Status**: PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED  
**Author**: [Team/Person Name]  
**Supersedes**: [ADR-XXX if applicable]  
**Superseded by**: [ADR-XXX if applicable]

---

## 1. Context

Describe the issue or problem that prompted this decision. Include:

- **Background**: What's the current state?
- **Problem Statement**: What needs to be decided and why?
- **Constraints**: Budget, timeline, team skills, business requirements
- **Scope**: What does this decision affect?

### Example

```
The appointment system needs persistent storage for hundreds of thousands
of appointments with flexible metadata fields per institution.
```

---

## 2. Alternatives Considered

List each serious alternative. For each, include:

1. **Name/Approach**

   ```code
   // Brief code example
   ```

   **Pros**:
   - Benefit 1
   - Benefit 2

   **Cons**:
   - Drawback 1
   - Drawback 2

   **Decision**: Rejected/Selected - Brief reason

### When to Include Alternatives

- At least 2-3 alternatives for significant decisions
- Alternatives with trade-offs
- Why **not** chosen (important for future reviewers)

### When to Exclude

- Obvious non-starters
- Alternatives lacking research
- Trivial decisions (variable naming, etc.)

---

## 3. Decision

**Clearly state the decision.** Use imperative language:

- "We might consider MongoDB"
- "Implement MongoDB as the primary data store"

Include:

- **What** was decided
- **Why** (key reasons from alternatives)
- **How** it will be implemented (architecture, key components)
- **Scope** boundaries (what's included, what's not)

### Decision Structure

```
IMPLEMENT [Technology/Pattern] FOR [Purpose]

Because:
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

Architecture/Components:
- [Key component 1]
- [Key component 2]
```

---

## 4. Consequences

Describe both positive and negative outcomes.

### Positive consequences

1. **Benefit 1**
   - Details and examples
2. **Benefit 2**
   - How it improves the system

3. **Benefit 3** (Future Evolution)
   - Enables future capabilities

### Negative consequences

1. **Drawback 1**
   - Impact on team/system
   - **Mitigation**: How we'll handle it

2. **Drawback 2**
   - **Mitigation**: Strategy to reduce impact

3. **Drawback 3**
   - **Mitigation**: Preventive measures

### When to Include Consequences

- Include ALL foreseeable consequences
- Be honest about trade-offs
- Include both technical and team impacts

---

## 5. Implementation Status

Track progress of this decision's implementation.

### Completed

- [x] Component A implemented
- [x] Tests written
- [x] Integrated with system

### In progress

- [ ] Performance optimization
- [ ] Documentation

### Future enhancements

- [ ] Scaling to multiple services
- [ ] Advanced feature X

---

## 6. Related Decisions

List other ADRs or decisions this one relates to:

- **[ADR-001](./ADR-001.md)**: [Brief connection]
- **[ADR-002](./ADR-002.md)**: [How they complement each other]
- **[Architecture Diagram](./architecture.md)**: [Visual reference]

### Cross-Dependencies

Feel free to include a simple ASCII diagram:

```
ADR-001 (Architecture)
    ↓
ADR-002 (Events)  ←→  ADR-005 (Domain Events)
    ↓
ADR-004 (Database)
```

---

## 7. References

Provide sources for your decision:

### Books & Papers

- **Author, A.** (Year). _Book Title_. Publisher.
  - Chapter/Section: [Relevant parts]

- **Research Paper** (Journal, Year). http://link/to/paper

### Online Resources

- [Reference Name](https://url) - Brief description

### Code References

- **src/path/to/implementation/**: Key implementation files
- **test/path/**: Test files validating decision

### Metrics (if applicable)

| Metric      | Value     | Notes               |
| ----------- | --------- | ------------------- |
| Performance | X ms      | Average latency     |
| Throughput  | Y ops/sec | Capacity            |
| Cost        | $Z/month  | Infrastructure cost |

---

## 8. Approval & Evolution (Optional)

Track who approved this decision and when.

| Version | Date       | Status     | Approver | Notes                |
| ------- | ---------- | ---------- | -------- | -------------------- |
| 1.0     | YYYY-MM-DD | ACCEPTED   | [Name]   | Initial approval     |
| 1.1     | YYYY-MM-DD | UPDATED    | [Name]   | Clarifications added |
| 2.0     | YYYY-MM-DD | SUPERSEDED | [Name]   | Replaced by ADR-XXX  |

---

## Writing Guidelines

### Dos

1. **Be concise** - 1-2 pages typically
2. **Document the "why"** - Not just "what"
3. **Include examples** - Code samples, diagrams
4. **Be honest about trade-offs** - Acknowledge downsides
5. **Link to related decisions** - Show architectural story
6. **Use future tense for consequences** - "Will enable", "Won't require"
7. **Include metrics if available** - Performance, costs, etc.

### Donts

1. Don't over-explain obvious context
2. Don't be defensive about the decision
3. Don't forget dissenting opinions
4. Don't make ADRs implementation guides (keep them architectural)
5. Don't update ADRs excessively (create new ADR if major change)

### Tone

- **Professional but accessible** - Assume intelligent readers unfamiliar with this domain
- **Factual** - Back claims with evidence or citations
- **Balanced** - Acknowledge strengths and limitations
- **Future-proof** - Could a new team member understand this in 6 months?

---

## Example Structure (Quick Reference)

```markdown
# ADR-XXX: [Title]

**Date**: YYYY-MM-DD | **Status**: ACCEPTED

## Context

[Issue/problem]

## Alternatives

1. [Alt 1] → Rejected because...
2. [Alt 2] → **Selected** because...

## Decision

Implement [X] for [purpose]

## Consequences

Positive: [benefits]
Negative: [drawbacks + mitigation]

## Related

- [ADR-YYY]

## References

- Book/Resource
```

---

## Document Version History

- **Version 1.0** (2026-02-20) - Initial template
- **Version 1.1** (2026-02-20) - Added quick reference

**Last Updated**: 2026-02-20  
**Status**: Active
