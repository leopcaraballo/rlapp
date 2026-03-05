# Delegation Template: Docker and Infrastructure

> **Required Skills:** `docker-infra`, `backend-api`, `testing-qa`

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const dockerSkill = await read_file("skills/docker-infra/skill.md");
const backendSkill = await read_file("skills/backend-api/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Docker] Harden infrastructure for XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Docker & Infrastructure:
${dockerSkill}

## 2. Backend API (context for service deps):
${backendSkill}

## 3. Testing & QA:
${testingSkill}

# Task: [Infrastructure task description]

## Objective:
- Apply Docker/Compose infrastructural changes
- Validate healthchecks, secrets, ports, and volumes
- Ensure credentials use environment variables
- Verify depends_on with condition: service_healthy

## Constraints:
- NEVER hardcode credentials (use \${VAR:-default} with .env)
- Every service MUST have a healthcheck
- Management ports (15672, 27017) marked with // HUMAN CHECK
- Development configs (volumes, start:dev) documented for removal in production
- Use named networks (app-network) and named volumes

## Deliverables:
1. Updated docker-compose.yml
2. Updated .env.example (without real secrets)
3. Optimized Dockerfiles (if applicable)
4. // HUMAN CHECK comments on sensitive configs
    `,
});
```

## Real Use Case Example

**User requests:** "Add healthcheck to PostgreSQL and improve credential security"

**AO executes:**

```javascript
await runSubagent({
  description: "[Docker] Add PostgreSQL healthcheck and harden credentials",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: docker-infra, backend-api, testing-qa

# Task:
1. Add healthcheck to PostgreSQL service in docker-compose.yml
2. Move PostgreSQL credentials to environment variables
3. Update .env.example with the new variables
4. Add condition: service_healthy in depends_on for producer and consumer
5. Mark database management ports with // HUMAN CHECK: do not expose in production

# Deliverables:
1. docker-compose.yml with healthcheck and variables
2. Updated .env.example
3. // HUMAN CHECK on sensitive ports
    `,
});
```

## Post-Delegation Checklist

- [ ] No hardcoded credentials in docker-compose.yml
- [ ] Every service has a defined healthcheck
- [ ] \`depends_on\` uses \`condition: service_healthy\`
- [ ] \`.env.example\` updated (no secrets)
- [ ] Management ports marked with // HUMAN CHECK
- [ ] \`docker compose config\` validates without errors
- [ ] Commits with Conventional Commits
- [ ] Documented in AI_WORKFLOW.md
- [ ] DEBT_REPORT.md updated (if applicable)
