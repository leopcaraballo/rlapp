# Delegation Template: Skill Creation

> **Required Skills:** `skill-creator`, `refactor-arch`, `testing-qa`

## Sub-Agent Delegation Structure

```javascript
// 1. Load contexts and skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const creatorSkill = await read_file("skills/skill-creator/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegate to Sub-Agent with full context
await runSubagent({
  description: "[Skill] Create new skill for XYZ",
  prompt: `
# Project Context:
${PROJECT_CONTEXT}

# Architectural Rules:
${RULES}

# Loaded Skills:

## 1. Skill Creator (meta-skill):
${creatorSkill}

## 2. Architecture Patterns (for structure):
${refactorSkill}

## 3. Testing & QA (for quality):
${testingSkill}

# Task: [Description of the new skill to create]

## Objective:
- Identify gap: what type of task is not covered
- Verify no overlapping skill exists (grep triggers in skills/)
- Create directory skills/<name>/
- Create skill.md with YAML frontmatter + Context/Rules/Tools/Workflow/Assets
- Create assets/templates/ with at least one example
- Create assets/docs/ with relevant documentation

## Constraints:
- Mandatory YAML frontmatter (name, description, trigger, scope, author, version, license, autoinvoke)
- Mandatory sections: Context, Rules, Tools Permitted, Workflow, Assets
- Do not create skills that overlap with the existing 8
- Include delegation-template.md in assets/
- Execute bash scripts/sync.sh after creation

## Deliverables:
1. skills/<name>/skill.md (complete)
2. skills/<name>/assets/templates/<example> (minimum 1)
3. skills/<name>/assets/docs/<doc> (minimum 1)
4. skills/<name>/assets/delegation-template.md
5. Updated SKILL_REGISTRY.md (via sync.sh)
    `,
});
```

## Real Use Case Example

**User requests:** "I need a skill to manage database migrations"

**AO executes:**

```javascript
await runSubagent({
  description: "[Skill] Create database-migrations skill",
  prompt: `
# Project Context: [PROJECT_CONTEXT loaded]
# Architectural Rules: [RULES loaded]
# Skills: skill-creator, refactor-arch, testing-qa

# Task:
Create new skill 'database-migrations' covering:
1. Trigger: migrations, schema changes, database versioning, data seeding
2. Scope: backend/*/src/infrastructure/persistence/, scripts/
3. Rules: schema versioning, migration rollback, separate seed data
4. Templates: reference migration, rollback script
5. Docs: migrations guide, validation checklist

# Pre-verification:
- grep -r "migration" skills/*/skill.md (confirm no overlap)

# Post-creation:
- bash scripts/sync.sh
    `,
});
```

## Post-Delegation Checklist

- [ ] Complete and valid YAML frontmatter
- [ ] All sections present (Context, Rules, Tools, Workflow, Assets)
- [ ] No overlap with existing skills (unique triggers)
- [ ] \`assets/templates/\` has at least 1 example
- [ ] \`assets/docs/\` has at least 1 document
- [ ] \`assets/delegation-template.md\` created
- [ ] \`bash scripts/sync.sh\` successfully executed
- [ ] SKILL_REGISTRY.md reflects the new skill
- [ ] Commits with Conventional Commits
- [ ] Documented in AI_WORKFLOW.md
