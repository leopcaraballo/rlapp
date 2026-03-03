# Delegation Template: Conventional Commits

> **Required Skills:** `conventional-commits`, `skill-creator` (optional)

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const commitsSkill = await read_file("skills/conventional-commits/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Commits] Format and create commits for XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Conventional Commits:
${commitsSkill}

# Task: [Description of commits to create]

## Objective:
- Create atomic commits following Conventional Commits 1.0.0
- One type per commit (do not mix feat + fix + refactor)
- Correct scope based on the project's scope table
- Description in lowercase, imperative mood, max 72 chars, no trailing period

## Constraints:
- Format: <type>(<scope>): <description>
- Allowed types: feat, fix, refactor, docs, test, chore, build, ci, perf, style, revert
- Breaking changes with ! or BREAKING CHANGE: in footer
- Forbidden: WIP, update files, fix stuff, vague messages

## Deliverables:
1. Formatted and executed commits
2. Breaking changes documented (if applicable)
    `,
});
```

## Real Use Case Example

**User requests:** "Create the commits for the Appointment entity refactoring changes"

**AO executes:**

```javascript
await runSubagent({
  description: "[Commits] Create atomic commits for Appointment refactor",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: conventional-commits

# Task:
Create atomic commits for the following changes:
1. New domain entity Appointment (domain/entities/)
2. New port AppointmentRepository (domain/ports/)
3. Adapter MongooseAppointmentRepository (infrastructure/)
4. Unit tests for the entity
5. Updated documentation

# Expected commits:
- refactor(waitingroom-domain): extract appointment entity to domain layer
- refactor(waitingroom-domain): create appointment repository port
- refactor(waitingroom-infra): implement postgres appointment adapter
- test(waitingroom-domain): add unit tests for appointment entity
- docs(traceability): update AI_WORKFLOW.md with refactor entry
    `,
});
```

## Post-Delegation Checklist

- [ ] Each commit has a valid type and scope
- [ ] Description in lowercase, imperative, no trailing period
- [ ] Max 72 characters on the first line
- [ ] One type per commit (atomic)
- [ ] Breaking changes documented with ! or BREAKING CHANGE:
- [ ] \`git log --oneline\` shows correct format
- [ ] Documented in AI_WORKFLOW.md
