# Delegation Template: Backend (API/Logic)

> **Required Skills:** `backend-api`, `refactor-arch`, `testing-qa`

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const backendSkill = await read_file("skills/backend-api/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Backend] Implement Use Case XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Backend API Best Practices:
${backendSkill}

## 2. Architecture Patterns (Hexagonal/DDD):
${refactorSkill}

## 3. Testing & QA:
${testingSkill}

# Task: [Backend task description]

## Objective:
- Implement business logic following DDD (Entities, Value Objects, Aggregates)
- Apply Hexagonal Architecture (Ports & Adapters)
- Respect DIP (Domain does not depend on frameworks)
- Create unit and integration tests

## Constraints:
- Follow structure: domain → application → infrastructure
- Strict DIP: domain does not know MongoDB/NestJS/RabbitMQ
- Configuration via environment variables
- Test coverage >85%
- Follow Conventional Commits

## Deliverables:
1. Ports (interfaces) in domain/
2. Adapters in infrastructure/
3. Use Cases in application/
4. Tests (unit + integration)
5. // HUMAN CHECK comments where applicable
    `,
});
```

## Real Use Case Example

**User requests:** "Implement retry policy with exponential backoff in RabbitMQ"

**AO executes:**

```javascript
await runSubagent({
  description: "[Backend] Implement Retry Policy with Exponential Backoff",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: backend-api, refactor-arch, testing-qa

# Task:
Implement retry policy with exponential backoff for RabbitMQ:
1. Create \`RetryPolicyPort\` in domain/ports/outbound/
2. Implement \`ExponentialBackoffRetryAdapter\` in infrastructure/
3. Integrate into \`RabbitMQPublisher\` with configuration (max retries, base delay)
4. Add retry logging via LoggerPort
5. Unit tests for backoff strategy
6. Integration tests with RabbitMQ mock

# Deliverables:
1. RetryPolicyPort (interface)
2. ExponentialBackoffRetryAdapter (implementation)
3. Integration in Publisher
4. Tests >85% coverage
    `,
});
```

## Post-Delegation Checklist

- [ ] SA applied DDD (Entities, VOs, Aggregates correctly located)
- [ ] SA applied Hexagonal Architecture (Ports & Adapters)
- [ ] Domain does not depend on frameworks (DIP validated)
- [ ] Tests created (>85% coverage)
- [ ] Commits with Conventional Commits
- [ ] Documented in AI_WORKFLOW.md
- [ ] DEBT_REPORT.md updated (if applicable)
