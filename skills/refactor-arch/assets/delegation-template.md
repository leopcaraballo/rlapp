# Delegation Template: Architectural Refactoring

> **Required Skills:** `refactor-arch`, `testing-qa`

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Refactor] Apply Hexagonal Architecture to XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Architecture Refactoring (Hexagonal/DDD):
${refactorSkill}

## 2. Testing & QA:
${testingSkill}

# Task: [Refactoring task description]

## Objective:
- Separate layers: domain -> application -> infrastructure
- Create ports (interfaces) in domain/ports/
- Create adapters in infrastructure/
- Apply SOLID strictly (SRP, OCP, LSP, ISP, DIP)
- Document used patterns with // Pattern: <name> - <justification>
- Keep existing tests passing + create new ones

## Constraints:
- domain/ CANNOT import from infrastructure/, Microsoft.AspNetCore.*, Npgsql, Dapper, RabbitMQ.Client
- application/ can import from domain/ but NOT from infrastructure/
- All dependencies flow inwards: infra -> app -> domain
- Test coverage >80%
- Add // HUMAN CHECK on layer separation decisions

## Deliverables:
1. Ports (interfaces) in domain/ports/
2. Pure domain entities in domain/entities/
3. Adapters in infrastructure/
4. Updated and new tests
5. // HUMAN CHECK comments where applicable
    `,
});
```

## Real Use Case Example

**User requests:** "Extract office assignment logic into a pure domain entity"

**AO executes:**

```javascript
await runSubagent({
  description: "[Refactor] Extract Office Assignment to Domain Entity",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: refactor-arch, testing-qa

# Task:
Extract office assignment logic from the infrastructure service to a domain entity:
1. Create \`OfficeAssignment\` entity in domain/entities/
2. Create \`OfficeAssignmentPort\` in domain/ports/outbound/
3. Move assignment logic to the domain (without Mongoose imports)
4. Create adapter \`PostgresOfficeAssignmentAdapter\` in infrastructure/
5. Update wiring in service composition root
6. Unit tests for the domain entity
7. Integration tests for the adapter

# Deliverables:
1. OfficeAssignment entity (pure domain)
2. OfficeAssignmentPort (interface)
3. PostgresOfficeAssignmentAdapter (implementation)
4. Tests >80% coverage
    `,
});
```

## Post-Delegation Checklist

- [ ] domain/ does not import from infrastructure/ or frameworks
- [ ] application/ does not import from infrastructure/
- [ ] Dependency flow: infra -> app -> domain (DIP validated)
- [ ] Patterns documented with // Pattern: <name>
- [ ] Tests created and passing (>80% coverage)
- [ ] // HUMAN CHECK present in layer decisions
- [ ] Commits with Conventional Commits
- [ ] Documented in AI_WORKFLOW.md
- [ ] DEBT_REPORT.md updated (if applicable)
