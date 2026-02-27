# Delegation Template: Testing & QA

> **Required Skills:** `testing-qa`, `refactor-arch`, `solid-principles`

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const solidSkill = await read_file("skills/solid-principles/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Testing] QA for Feature XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Testing & QA (Jest/Playwright):
${testingSkill}

## 2. Architecture Refactoring:
${refactorSkill}

## 3. SOLID Principles:
${solidSkill}

# Task: [Description of testing/QA task]

## Objective:
- Create unit tests (>80% coverage)
- Create integration tests (critical flows)
- Apply AAA pattern (Arrange-Act-Assert)
- Apply Test-Driven Development (TDD) when applicable
- Validate edge cases and malicious cases

## Constraints:
- Tests must be independent (no dependencies between tests)
- Use mocks/stubs for external dependencies (PostgreSQL, RabbitMQ)
- Deterministic tests (no flaky tests)
- >80% coverage mandatory
- Follow Conventional Commits

## Deliverables:
1. Unit tests
2. Integration tests
3. Edge case tests
4. Coverage report (>80%)
5. Documentation of tested scenarios
    `,
});
```

## Real Use Case Example

**User requests:** "I need complete tests for the office scheduler"

**AO executes:**

```javascript
await runSubagent({
  description: "[Testing] Complete Test Suite for Office Scheduler",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: testing-qa, refactor-arch, solid-principles

# Task:
Create complete test suite for \`AssignAvailableOfficesUseCase\`:
1. Unit tests:
   - Happy path: 4 offices, 4 appointments → 1 appointment per office
   - Edge case: 4 offices, 10 appointments → equitable distribution
   - Edge case: 3 available offices, 12 appointments → use modulo
   - Error case: 0 available offices → throw error
2. Integration tests:
   - Mock of ConsultationPolicy (isAvailable)
   - Verify state update in repository
   - Validate transactions (rollback in case of error)
3. Limit case tests:
   - Appointments with conflicting schedules
   - ConsultationPolicy rejects all offices

# Deliverables:
1. 15+ unit tests (>90% coverage)
2. 5+ integration tests
3. Coverage report
    `,
});
```

## Post-Delegation Checklist

- [ ] SA created unit tests (>80% coverage)
- [ ] SA created integration tests (critical flows)
- [ ] SA applied AAA pattern (Arrange-Act-Assert)
- [ ] Tests are independent (no interdependencies)
- [ ] Tests are deterministic (no flaky tests)
- [ ] Edge cases covered
- [ ] Commits with Conventional Commits
- [ ] Documented in AI_WORKFLOW.md
- [ ] DEBT_REPORT.md updated (if debt was fixed)
