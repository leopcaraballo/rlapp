# Delegation Template: Frontend (UI/UX)

> **Required Skills:** `frontend-ui`, `refactor-arch`, `testing-qa`

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const frontendSkill = await read_file("skills/frontend-ui/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Frontend] Refactor Component XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Frontend UI (Vercel React Best Practices):
${frontendSkill}

## 2. Architecture Refactoring:
${refactorSkill}

## 3. Testing & QA:
${testingSkill}

# Task: [Frontend task description]

## Objective:
- Refactor components applying React patterns (hooks, composition, memoization)
- Apply Clean Architecture (SRP, DIP) in presentation layer
- Create unit and integration tests

## Constraints:
- Do not use class components (use functional components)
- TypeScript strict mode
- Test coverage >80%
- Follow Conventional Commits

## Deliverables:
1. Refactored code
2. Tests (unit + integration)
3. // HUMAN CHECK comments where applicable
4. Change documentation
    `,
});
```

## Real Use Case Example

**User requests:** "Refactor the AppointmentCard component applying SRP"

**AO executes:**

```javascript
await runSubagent({
  description: "[Frontend] Refactor AppointmentCard (SRP)",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: frontend-ui, refactor-arch, testing-qa

# Task: 
Refactor \`AppointmentCard.tsx\` separating responsibilities:
- Extract sub-components (AppointmentStatus, AppointmentInfo, AppointmentActions)
- Create custom hooks (useAppointmentActions, useAppointmentData)
- Modularize styles into separate CSS Modules
- Add unit tests for each sub-component
- Integration tests for the complete flow

# Deliverables:
1. Refactored AppointmentCard (SRP applied)
2. 3+ sub-components
3. 2+ custom hooks
4. Tests >85% coverage
    `,
});
```

## Post-Delegation Checklist

- [ ] SA applied React principles (hooks, composition, memoization)
- [ ] SA applied Clean Architecture (SRP, DIP)
- [ ] Tests created (>80% coverage)
- [ ] Commits with Conventional Commits
- [ ] Documented in AI_WORKFLOW.md
- [ ] DEBT_REPORT.md updated (if applicable)
