---
name: conventional-commits (Senior Level)
description: Semantic history management, CI/CD alignment, and versioning automation.
trigger: When creating commits, pushing code, formatting commit messages, or when feedback mentions git history, commit hygiene, or semantic versioning.
scope: .git/, scripts/
author: "Orchestrator Team"
version: "2.0.0 (Senior Grade)"
license: "MIT"
autoinvoke: true
---

# Skill: Conventional Commits (Senior Grade)

## Context

All commits in this project MUST follow the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification. This guarantees a readable, traceable history compatible with semantic versioning.

## Rules

### Mandatory Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Allowed Types

| Type       | When to use                                         | Example                                                           |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `feat`     | New user-facing feature                             | `feat(consumer): implement randomized attention duration`         |
| `fix`      | Bug fix                                             | `fix(producer): resolve validation pipe not catching DTO errors`  |
| `refactor` | Code change without altering external behavior      | `refactor(orchestrator): consolidate to single GEMINI.md`         |
| `docs`     | Documentation changes only                          | `docs(traceability): rewrite AI_WORKFLOW.md with interaction log` |
| `test`     | Adding or correcting tests                          | `test(producer): add 36 unit tests for appointments service`      |
| `chore`    | Maintenance tasks (deps, configs, cleanup)          | `chore(cleanup): remove obsolete DEBT_REPORT.MD`                  |
| `build`    | Changes in build system or dependencies             | `build(docker): update Node.js image from alpine to slim`         |
| `ci`       | CI/CD pipeline changes                              | `ci(github): add lint workflow on pull requests`                  |
| `perf`     | Performance improvements                            | `perf(scheduler): precalculate office array in constructor`       |
| `style`    | Formatting changes (spaces, semicolons, etc.)       | `style(frontend): fix indentation in page.module.css`             |
| `revert`   | Reverts a previous commit                           | `revert: feat(consumer): implement randomized attention`          |

### Project Scopes

| Scope          | Applies to                                                              |
| -------------- | ----------------------------------------------------------------------- |
| `producer`     | `backend/producer/src/`                                                 |
| `consumer`     | `backend/consumer/src/`                                                 |
| `frontend`     | `frontend/src/`                                                         |
| `docker`       | `docker-compose.yml`, `Dockerfile`s                                     |
| `orchestrator` | `.github/copilot-instructions.md`, `GEMINI.md`, orchestration system    |
| `skills`       | `skills/*/`                                                             |
| `scripts`      | `scripts/`                                                              |
| `docs`         | `AI_WORKFLOW.md`, `DEBT_REPORT.md`, `README.md`, etc.                   |
| `arch`         | Hexagonal architecture changes, ports and adapters                      |
| `deps`         | package.json, dependencies                                              |

### Formatting Rules

1. **Lowercase description** — Do not start with a capital letter after the `:`.
   - Good: `feat(producer): add validation pipe`
   - Bad: `feat(producer): Add validation pipe`

2. **No trailing period** — Do not end the description with `.`
   - Good: `fix(consumer): resolve ack/nack race condition`
   - Bad: `fix(consumer): resolve ack/nack race condition.`

3. **Present imperative** — Use the imperative mood.
   - Good: `add`, `fix`, `remove`, `update`, `implement`, `refactor`
   - Bad: `added`, `fixed`, `removing`, `updates`

4. **Maximum 72 characters** on the first line.

5. **Breaking changes** — Use `!` after the scope or `BREAKING CHANGE:` in the footer.

   ```
   feat(producer)!: rename cedula to idCard across all DTOs

   BREAKING CHANGE: All API consumers must update field names
   from 'cedula' to 'idCard' and 'nombre' to 'fullName'.
   ```

6. **Multiple changes** — If a commit spans multiple files, use the body with `-` to list them:

   ```
   refactor(arch): extract domain entities from mongoose schemas

   - Create domain/entities/appointment.entity.ts (pure class)
   - Create domain/ports/outbound/appointment.repository.ts (interface)
   - Move validation logic from schema to entity factory
   - Add // HUMAN CHECK for layer separation decisions
   ```

7. **Actor attribution** — In the body, indicate the actor if relevant:

   ```
   fix(consumer): resolve race condition in office assignment

   Co-authored-by: IA Agent
   Reviewed-by: Human
   ```

### Forbidden Commits

- `update files` — No type or scope
- `WIP` — Temporary commits
- `fix stuff` — Vague description
- `feat: implement everything` — Too broad, split into atomic commits
- Commits mixing feat + fix + refactor — One type per commit

## Workflow

### Before Committing

1. Run `git diff --staged` to review changes
2. Classify the type of change (feat, fix, refactor, etc.)
3. Identify the correct scope
4. Write the message following the format
5. If there are breaking changes, document with `!` or `BREAKING CHANGE:`

### Pre-push Validation

```bash
# Verify that the last N commits follow the format
git log --oneline -5

# Expected pattern:
# <hash> <type>(<scope>): <lowercase description without period>
```

### Atomic Commits

Each commit must represent **one logical unit of change**:

- One commit per feature/fix/refactor
- NOT one giant commit with multiple types of mixed changes

If a change touches multiple files but is the SAME logical unit, it's a single commit.
If they are INDEPENDENT changes, separate them into individual commits.

## Tools Permitted

- **Read:** `git log`, `git diff`, `git status`
- **Write:** `git add`, `git commit`
- **Validate:** Review format before executing

## Assets

- This skill does not require additional assets — the rules are self-contained.
