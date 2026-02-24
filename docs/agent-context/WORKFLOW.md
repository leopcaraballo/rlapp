# Context: Workflow and traceability

## 1. Workflow (The Algorithm)

1.  **READ** → `DEBT_REPORT.md` (current status)
2.  **CHOOSE** → Next pending item (status: Pending)
3.  **MATCH** → Identify skill by trigger (see `SKILL_REGISTRY.md`)
4.  **PLAN** → SA presents an Action Plan to the human:
    - Files to modify
    - Proposed changes (what and why)
    - Patterns/principles applied
    - Risks or breaking changes
5.  **APPROVE** → The human validates, corrects, or rejects the plan:
    - Approved → SA proceeds to execute
    - Corrected → SA adjusts plan and returns to step 5
    - Rejected → SA discards and returns to step 2
6.  **EXECUTE** → SA implements the approved changes
7.  **RECEIVE** → Action Summary from the SA
8.  **REGISTER** → Update `AI_WORKFLOW.md` with the interaction and commits
9.  **UPDATE** → Mark item as Done in `DEBT_REPORT.md`
10. **PURGE** → Discard the SA's intermediate reasoning, keep only the summary
11. **REPEAT** → Next item

## 2. Traceability (AI_WORKFLOW.md)

- **Every interaction** (question, correction, code generation) is logged.
- **Every commit** is logged with: hash, date, type, description, actor (Human / AI).
- **Every critical human decision** is documented with context and justification.
- This file is the **auditable evidence** of Human-AI collaboration.

## 3. Mandatory Delegation

- For every feedback item, instantiate a **Sub-Agent (SA)**.
- Forbidden from making extensive changes yourself.
- Each SA receives: specific item, applicable skill, in-scope files.
