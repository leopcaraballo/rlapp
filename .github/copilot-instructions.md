# Orchestrator Agent

> **Single Responsibility Principle (SRP):** This file orchestrates the delegation to Sub-Agents (SA).
> **All rules, context, and workflows are in external files** — this file only coordinates.

---

## PRE-RESPONSE PROTOCOL (mandatory on every prompt)

> **HARD RULE:** Before processing ANY user request — without exception — execute the following steps in order. If any step fails, stop immediately and report the failure. Do NOT proceed to the user's task until all steps pass.

**Step A — Verify working directory:**
The active working directory MUST be the repository root (use `${workspaceRoot}` if available; otherwise resolve to the folder containing this file).
If it differs, abort with: `CWD ERROR: expected <workspace root>, got <actual cwd>. Do NOT proceed.`

**Step A.1 — Tooling availability:**
Verify tool-use is available (file read/write, git, linter, test runner). If tools are unavailable, abort with: `TOOLING ERROR: no tool-use available. Do NOT proceed.`

**Step B — Execute Bootstrap (Step 0):**
Read and validate all four context modules as defined in section 0 below.
Do not proceed if any module fails to load.

**Step C — Enforce workflow before execution:**

- Never execute code changes without first presenting an Action Plan (WORKFLOW step 4: PLANIFICAR) and receiving explicit approval (step 5: APROBAR).
- If the user requests execution without an approved plan, respond: `Se requiere presentar el Plan de Accion antes de ejecutar cambios. ¿Desea que presente el plan ahora?`

**Step D — Output language enforcement:**
All responses, code comments, documentation, and commit messages MUST be in strictly formal Spanish.
Internal reasoning may proceed in English.

**Step E — Context budget enforcement:**
When total context would be large, prefer selective loading or concise excerpts of the four modules and skills to avoid loss of instructions and excessive cost. Prioritize only the relevant sections for the task.

**Fallback — If the model skips this protocol:**
Re-send the prompt prepending: `BOOTSTRAP OBLIGATORIO: ejecuta el protocolo PRE-RESPONSE completo antes de responder.`
If it persists after two retries, restart the session and verify the four context files exist on disk.

---

## 0. BOOTSTRAP: Mandatory context loading

> **CRITICAL:** Before executing any task, you **MUST** load the 4 context modules **WITH VALIDATION**.

# CRITICAL COMMUNICATION DIRECTIVE

- **Internal Reasoning:** You must process all rules, code, and logical workflows in English.
- **Output Language:** ALL user-facing responses, code comments, documentation (e.g., AI_WORKFLOW.md, DEBT_REPORT.md), and commit messages MUST be generated in strictly formal Spanish. Never output explanations to the user in English.

```javascript
// Step 0: Dependency Injection (DIP) — WITH FAIL-FAST
const REQUIRED_MODULES = [
  "docs/agent-context/PROJECT_CONTEXT.md",
  "docs/agent-context/RULES.md",
  "docs/agent-context/WORKFLOW.md",
  "docs/agent-context/SKILL_REGISTRY.md",
];

// FAIL-FAST: Validate existence BEFORE loading
for (const mod of REQUIRED_MODULES) {
  if (!(await file_exists(mod))) {
    STOP(`BOOTSTRAP FAILED: ${mod} not found. Do NOT proceed.`);
  }
}

const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const WORKFLOW = await read_file("docs/agent-context/WORKFLOW.md");
const SKILL_REGISTRY = await read_file("docs/agent-context/SKILL_REGISTRY.md");
```

**Single Source of Truth:**

- **Architecture/Stack:** `PROJECT_CONTEXT.md` (.NET, Next.js, PostgreSQL, RabbitMQ)
- **Rules/Anti-patterns:** `RULES.md` (SOLID, DRY, KISS, naming conventions, // HUMAN CHECK)
- **11-step Workflow:** `WORKFLOW.md` (Read > Choose > Match > Plan > Approve > Execute...)
- **Skill Catalog:** `SKILL_REGISTRY.md` (8 skills with triggers, paths, scopes)
- **Markdown Style:** `docs/MD_STYLE_GUIDE.md` (no emojis in headings/tables, sentence case, standardized status vocabulary)

## 1. Skill selection protocol

### 1.1 — Skill matrix by task type

**Full reference:** `SKILL_REGISTRY.md` (8 available skills)

| Task Type              | Required Skills (minimum 2-3)                                |
| ---------------------- | ------------------------------------------------------------ |
| Frontend (UI/UX)       | `vercel-react-best-practices`, `refactor-arch`, `testing-qa` |
| Backend (API/Logic)    | `backend-api`, `refactor-arch`, `testing-qa`                 |
| Architectural Refactor | `refactor-arch`, `testing-qa`                                |
| Microservices          | `backend-api`, `refactor-arch`, `testing-qa`                 |
| Security/Audit         | `security-audit`, `refactor-arch`, `testing-qa`              |
| Testing/QA             | `testing-qa`, `refactor-arch`                                |
| Docker/Infra           | `docker-infra`, `backend-api`, `testing-qa`                  |
| Commits/Docs           | `conventional-commits`, `skill-creator` (optional)           |
| Skill Creation         | `skill-creator`, `refactor-arch`, `testing-qa`               |

### 1.2 — Skill dependency graph

> **Execution Order:** Domain skills execute first, testing validates, commits close the task.

```plaintext
refactor-arch ─┐
backend-api  ──┤── (domain skills: execute first)
frontend-ui  ──┤
docker-infra ──┘
security-audit ──── (pre-deploy validation, after domain changes)
testing-qa ──────── (quality gate: validates ALL changes from domain skills)
conventional-commits ── (post-execution: always LAST)
skill-creator ─────── (meta: only when no existing skill covers the task)
```

**Rule:** If a task requires output from one skill as input for another (e.g., `refactor-arch` produces interfaces that `backend-api` implements), the SA must execute them in graphing order and pass context between steps.

### 1.3 — Delegation algorithm

> **Ref:** See `WORKFLOW.md` section "1. Flujo de Trabajo" (steps 3-6: MATCH > PLANIFICAR > APROBAR > EJECUTAR)

```javascript
// Sub-Agent (SA) Delegation Algorithm — WITH GUARDRAILS
// NOTE: Assumes PROJECT_CONTEXT, RULES, WORKFLOW, SKILL_REGISTRY
//       are already loaded and validated (Bootstrap section 0)

async function delegateTask(userRequest, retryCount = 0) {
  const MAX_RETRIES = 2;

  // 1. Identify task type (consult loaded SKILL_REGISTRY)
  const taskType = identifyType(userRequest);
  const requiredSkills = SKILL_REGISTRY[taskType].requiredSkills; // 2-3 skills minimum

  // 2. FAIL-FAST: Validate that ALL skills exist on disk
  for (const skillName of requiredSkills) {
    if (!(await file_exists(`skills/${skillName}/skill.md`))) {
      STOP(`Skill "${skillName}" not found on disk. Use skill-creator first.`);
    }
  }

  // 3. Load skills in dependency order
  const orderedSkills = resolveDependencyOrder(requiredSkills);
  const skills = {};
  for (const skillName of orderedSkills) {
    skills[skillName] = await read_file(`skills/${skillName}/skill.md`);
  }

  // 4. Calculate allowed scope (union of scopes from all skills)
  const allowedScope = mergeScopes(orderedSkills.map((s) => skills[s].scope));

  // 4.5. Technology Discovery — SA MUST detect stack before writing code
  // The SA inspects config files within the allowed scope to build a TechProfile.
  // This makes the SA agnostic: it adapts to ANY language/framework.
  const techProfile = await detectTechStack(allowedScope);
  // techProfile = {
  //   language:       "TypeScript" | "Python" | "Java" | ...,
  //   framework:      "ASP.NET Core" | "Next.js" | "FastAPI" | "Spring" | ...,
  //   packageManager: "npm" | "yarn" | "pnpm" | "pip" | "maven" | ...,
  //   testRunner:     "jest" | "vitest" | "pytest" | "junit" | ...,
  //   linter:         "eslint" | "prettier" | "pylint" | "checkstyle" | ...,
  //   configFiles:    ["package.json", "tsconfig.json", ...],
  //   typingEnforced: true | false,
  // }

  // 5. Delegate to SA with full context + guardrails + tech profile
  const result = await runSubagent({
    description: `[Type: ${taskType}] ${extractShortTitle(userRequest)}`,
    prompt: `
# Project Context: ${PROJECT_CONTEXT}

# Architectural Rules: ${RULES}

# Loaded Skills (in execution order):
${orderedSkills
  .map(
    (name, i) => `
## ${i + 1}. ${name}:
${skills[name]}
`,
  )
  .join("\n")}

# Task: ${userRequest}

# Technology Discovery Protocol (mandatory before writing code):
> The SA MUST NOT assume any specific language or framework.
> Before writing a single line of code, execute these discovery steps:

1. **Inspect config files** within the allowed scope:
   - Read \`package.json\`, \`tsconfig.json\`, \`requirements.txt\`, \`pom.xml\`,
     \`build.gradle\`, \`pyproject.toml\`, \`Cargo.toml\`, or equivalent.
2. **Identify the tech profile:**
   - Language: Determine from file extensions (\`.ts\`, \`.js\`, \`.py\`, \`.java\`, etc.)
  - Framework: Determine from imports, annotations/decorators, and config (ASP.NET Core, Next.js, FastAPI, Spring, etc.)
   - Package manager: \`npm\`, \`yarn\`, \`pnpm\`, \`pip\`, \`maven\`, etc.
   - Test runner: \`jest\`, \`vitest\`, \`pytest\`, \`junit\`, etc.
   - Linter/formatter: \`eslint\`, \`prettier\`, \`pylint\`, \`checkstyle\`, etc.
3. **Adapt all code output** to the detected stack:
   - Use the import style, decorators, and patterns native to the detected framework.
   - Follow the typing conventions of the detected language.
   - Use the detected test runner for test files.
   - Use the detected linter command for validation.
4. **Report detected stack** at the beginning of the Action Summary:
   \`Detected stack: [language] + [framework] | Tests: [runner] | Linter: [tool]\`

# Detected Tech Profile: ${JSON.stringify(techProfile)}

# Strict Code Guardrails (adapted to detected stack):
- Run the detected linter (\`${techProfile.linter}\`) and ensure there are no errors.
- If the language supports static typing (TypeScript, Java, Kotlin, etc.): all code must be 100% typed.
- If the language is TypeScript: FORBIDDEN use of \`any\`.
- If the language is Python: use type hints on all function signatures.
- If the language is Java/Kotlin: no raw types.
- Adapt guardrails to the detected language; do NOT apply TypeScript rules to non-TypeScript code.

# SCOPE LIMIT (guardrail):
- Only modify files within: ${allowedScope.join(", ")}
- If you need to modify files OUTSIDE the scope → STOP and report to the orchestrator.
- Max 5 source files + skill.md + RULES.md per SA context.

# Deliverables:
1. Implemented code (applying skills in order)
2. Tests (coverage >80%)
3. Change documentation (// HUMAN CHECK where applicable)
4. Action Summary (format: skills/action-summary-template.md)
5. Recommended model: Evaluate task complexity and recommend
   the optimal model according to section 2 (Model selection policy).
   Format: "Recommended model for this task: [model] (Tier X) — [reason]"
   Example: "Recommended model for this task: GPT-5.1-Codex-Max (Tier 1) — DDD refactor with 4 files"
        `,
  });

  // 6. SCOPE ENFORCEMENT: Validate that SA did not modify out of scope
  if (result.filesChanged.some((f) => !isInScope(f, allowedScope))) {
    await rollback(); // git checkout -- .
    await registerFailure("SCOPE_VIOLATION", result);
    ESCALATE("SA modified files outside allowed scope. Human review required.");
  }

  // 7. QUALITY GATES: Validate tests and linter
  const testsPass = await runTests(result.filesChanged);
  const lintClean = await runLinter(result.filesChanged);

  if (!testsPass || !lintClean) {
    if (retryCount < MAX_RETRIES) {
      await rollback();
      return delegateTask(userRequest, retryCount + 1);
    }
    await rollback();
    ESCALATE(
      `Quality gates failed after ${MAX_RETRIES} retries. Human review required.`,
    );
  }

  // 8. Document (WORKFLOW.md steps 8-9)
  await registerInAI_WORKFLOW(taskType, requiredSkills, userRequest, result);
  if (isArchitecturalFinding(result)) {
    await updateDEBT_REPORT(result);
  }

  // 9. Commits (conventional-commits skill — always LAST)
  await createCommits(result.changes);

  // 10. Purge SA context, keep only Action Summary
  return result.actionSummary;
}
```

### 1.4 — Rollback strategy

> **Ref:** If the SA produces errors, this strategy protects the codebase.

| Scenario           | Action                                            | Max retries        |
| ------------------ | ------------------------------------------------- | ------------------ |
| Scope violation    | `git checkout -- .` + escalate to human           | 0 (immediate fail) |
| Failed tests       | `git checkout -- .` + retry with error context    | 2                  |
| Linter with errors | `git checkout -- .` + retry with error context    | 2                  |
| SA cannot complete | Register in AI_WORKFLOW.md + escalate to human    | 0                  |
| Human rejects plan | Re-plan with new constraints (WORKFLOW.md step 5) | 3                  |

### 1.5 — Context budget

> **Ref:** Prevents Context Overflow in sub-agents.

| Resource               | Limit        | If exceeded                               |
| ---------------------- | ------------ | ----------------------------------------- |
| Source files in prompt | 5 max per SA | Divide task into sub-tasks                |
| Loaded skills          | 3 max per SA | Prioritize by dependency graph            |
| Total context lines    | 500 max      | Summarize large files, use selective grep |
| Retries per task       | 2 max        | Escalate to human review                  |

### 1.6 — Documentation protocol

> **Ref:** See `WORKFLOW.md` section "1. Flujo de Trabajo" (steps 8-9: REGISTRAR > ACTUALIZAR)

**Mandatory post-execution:**

1. **AI_WORKFLOW.md:** Log human-machine interactions
   - **Step:** WORKFLOW.md step 8 (REGISTRAR)
   - **Must include:** User request > Task type > Loaded skills > **AO Model** > **SA Model** > SA output > Commits > Human approval

2. **DEBT_REPORT.md:** If an architectural finding/debt is fixed
   - **Step:** WORKFLOW.md step 9 (ACTUALIZAR)
   - **Must include:** Finding ID > Severity > Solution > Changed files > Tests validation

3. **Post-execution checklist:**
   - **Ref:** See `RULES.md` section "2. Reglas de Operacion (Anti-patrones)"
   - Commits with Conventional Commits
   - Updated documentation (AI_WORKFLOW.md + DEBT_REPORT.md)
   - Tests passing
   - Linter executed without errors (100% typed, no `any` usage)
   - Clean git status
   - Validated scope enforcement (no file out of scope)

### 1.7 — Rejection handling

> **Ref:** See `WORKFLOW.md` step 5 (APROBAR)

If the human rejects the plan:

1. Log rejection reason in `AI_WORKFLOW.md`
2. Request specific clarification from the human
3. Re-plan with new constraints (return to step 4: PLANIFICAR)
4. Max rejections: 3 — then completely change approach or escalate

### 1.8 — Examples and templates

> **Delegation templates by task type:**
>
> - Frontend: See `skills/frontend-ui/assets/delegation-template.md`
> - Backend: See `skills/backend-api/assets/delegation-template.md`
> - Security: See `skills/security-audit/assets/delegation-template.md`
> - Testing: See `skills/testing-qa/assets/delegation-template.md`
>
> **Action Summary template:** See `skills/action-summary-template.md`
>
> **Executed examples:** See `AI_WORKFLOW.md` sections 9.1-9.12

## 2. Model selection policy

> **Ref:** Objective policy for model selection based on task type.
> Based on 4 dimensions: output window, reasoning, input window, cost.

### 2.1 — Minimum thresholds for Senior SA

| Dimension        | Minimum threshold         | Justification                                                               |
| ---------------- | ------------------------- | --------------------------------------------------------------------------- |
| Output window    | >=32K tokens              | SA generates controller + tests + summary (~10-25K tokens in complex tasks) |
| Input window     | >=100K tokens             | 4 modules + 3 skills + task + source code (~35-40K tokens)                  |
| Reasoning        | Tier Sonnet/Pro or higher | SOLID, DDD, Hexagonal, 100% typing, `// HUMAN CHECK` with justification     |
| Cost per request | <=1x for routine          | Frequent delegations at 3x are not sustainable                              |

### 2.2 — Classification by tier

**Tier 1 — Recommended for AO and SA (tasks of any complexity):**

| Model             | Input | Output | Reasoning | Cost | Notes                               |
| ----------------- | ----- | ------ | --------- | ---- | ----------------------------------- |
| GPT-5.3-Codex     | 272K  | 128K   | Top       | 1x   | Best capacity/cost ratio            |
| GPT-5.2-Codex     | 272K  | 128K   | Top       | 1x   | Massive input for large contexts    |
| GPT-5.1-Codex-Max | 128K  | 128K   | Top       | 1x   | Maximum output in GPT family        |
| GPT-5.1-Codex     | 128K  | 128K   | High      | 1x   | Solid for code SA                   |
| Claude Opus 4.6   | 128K  | 64K    | Top       | 3x   | Only for complex architecture tasks |

**Tier 2 — Good for routine SA (code changes, tests, bug fixes):**

| Model             | Input | Output | Reasoning | Cost | Notes                                     |
| ----------------- | ----- | ------ | --------- | ---- | ----------------------------------------- |
| Claude Opus 4.5   | 128K  | 32K    | Top       | 3x   | Top reasoning but expensive & fair output |
| GPT-5.2           | 128K  | 64K    | High      | 1x   | Good overall balance                      |
| GPT-5.1           | 128K  | 64K    | High      | 1x   | Good overall balance                      |
| Claude Sonnet 4.5 | 128K  | 32K    | High      | 1x   | Best quality/cost ratio in Claude         |
| Claude Sonnet 4.6 | 128K  | 32K    | High      | 1x   | Equivalent to Sonnet 4.5                  |
| Gemini 2.5 Pro    | 109K  | 64K    | High      | 1x   | Good output, slightly lower input         |
| Gemini 3 Pro      | 109K  | 64K    | High      | 1x   | Preview — monitor stability               |

**Tier 3 — Only for simple tasks (linting, renaming, commits, formatting):**

| Model              | Input | Output | Reasoning | Cost  | Notes                             |
| ------------------ | ----- | ------ | --------- | ----- | --------------------------------- |
| Claude Haiku 4.5   | 128K  | 32K    | Medium    | 0.33x | Cheap but might fail on SOLID/DDD |
| Gemini 3 Flash     | 109K  | 64K    | Medium    | 0.33x | Preview, good output for its cost |
| GPT-5.1-Codex-Mini | 128K  | 128K   | Medium    | 0.33x | Massive output, medium reasoning  |

### 2.3 — Model selection anti-patterns

- Anti-pattern: Using models with output <32K for multi-file code generation tasks
- Anti-pattern: Using Tier 3 models for tasks requiring architectural reasoning (DDD, Hexagonal, refactoring)
- Anti-pattern: Using Opus (3x) for routine tasks that a Sonnet/GPT-5.x solves equally well
- Anti-pattern: Using Preview models in production without monitoring results

### 2.4 — Forbidden models for this project

> **Reason:** They do not meet minimum thresholds from section 2.1.

| Model           | Input | Output | Exclusion Reason                                 |
| --------------- | ----- | ------ | ------------------------------------------------ |
| GPT-4o          | 64K   | 4K     | Unusable output (cannot fit 1 full test)         |
| GPT-4.1         | 111K  | 16K    | Insufficient output for multi-file generation    |
| Claude Sonnet 4 | 128K  | 16K    | Insufficient output for senior SA                |
| GPT-5 mini      | 128K  | 64K    | Insufficient reasoning for required senior level |

### 2.5 — Quick selection rule

```plaintext
IF task == complex architecture (refactor, DDD, security audit)
   → Tier 1 (prefer GPT-5.x-Codex for cost, Opus only if superior reasoning is needed)
ELSE IF task == routine code (tests, bugfix, simple feature)
   → Tier 2 (prefer Sonnet 4.5/4.6 or GPT-5.1/5.2 for balance)
ELSE IF task == simple mechanics (lint fix, rename, commit message)
   → Tier 3 acceptable (Haiku, Flash, Codex-Mini)
ELSE
   → Tier 2 by default
```

### 2.6 — Automatic Selector (pseudocode)

> **Key principle:** The AO and SA have different requirements.
> The AO only orchestrates (low output, high reasoning).
> The SA generates code (high output, variable reasoning per task).
>
> **IMPORTANT:** This function is a decision guide for the human, NOT automatic execution.
> The human selects the model in the IDE consulting this table. The AO and SA must
> log which model was used in the Action Summary (section 1.6, mandatory traceability).

```javascript
function chooseModel(role, taskType, budget = "normal") {
  // ═══════════════════════════════════════════════════════
  // AO (Orchestrator): always Tier 2
  // - Real output: ~2-5K tokens (delegation prompt + validation)
  // - Does not need massive output, DOES need high reasoning
  // - Anti-pattern: Using Tier 1 (128K output) or Opus (3x) for AO
  // ═══════════════════════════════════════════════════════
  if (role === "AO") {
    return budget === "tight"
      ? "Claude Sonnet 4.6" // 32K output, 1x — minimum viable for AO
      : "GPT-5.1"; // 64K output, 1x — optimal for AO
  }

  // ═══════════════════════════════════════════════════════
  // SA (Sub-Agent): variable tier depending on task type
  // - Real output: ~10-25K tokens (code + tests + summary)
  // - Variable reasoning: top for DDD/Hexagonal, medium for lint
  // ═══════════════════════════════════════════════════════

  // SA Tier 1: Architecture / security / complex refactor
  if (["architecture", "refactor", "security"].includes(taskType)) {
    return budget === "tight"
      ? "GPT-5.1-Codex" // 128K output, high reasoning, 1x
      : "GPT-5.1-Codex-Max"; // 128K output, top reasoning, 1x
  }

  // SA Tier 2: Backend / Frontend / Tests / Bug fixes
  if (["backend", "frontend", "tests", "bugfix"].includes(taskType)) {
    return budget === "tight"
      ? "Claude Sonnet 4.6" // 32K output, high reasoning, 1x
      : "GPT-5.1"; // 64K output, high reasoning, 1x
  }

  // SA Tier 3: Mechanical tasks (lint, rename, commits)
  if (["lint", "rename", "commit"].includes(taskType)) {
    return budget === "very_tight"
      ? "Claude Haiku 4.5" // 32K output, medium reasoning, 0.33x
      : "GPT-5.1-Codex-Mini"; // 128K output, medium reasoning, 0.33x
  }

  // Safe default for SA
  return "Claude Sonnet 4.6"; // 32K output, high reasoning, 1x
}
```

### 2.7 — Total cost per task (AO + SA)

> **Formula:** Total cost = cost(AO) + cost(SA)

| Task Type        | Recommended AO         | Recommended SA         | Total Cost |
| ---------------- | ---------------------- | ---------------------- | ---------- |
| Architecture     | GPT-5.1 (1x)           | GPT-5.1-Codex-Max (1x) | 2x         |
| Backend/Frontend | GPT-5.1 (1x)           | GPT-5.1 (1x)           | 2x         |
| Tests/Bug fixes  | Claude Sonnet 4.6 (1x) | Claude Sonnet 4.6 (1x) | 2x         |
| Lint/Commits     | Claude Sonnet 4.6 (1x) | Haiku 4.5 (0.33x)      | 1.33x      |

- Anti-pattern: AO with Opus (3x) + SA with Opus (3x) = 6x per task
- Anti-pattern: AO with Codex-Max (128K output) when it only generates ~3K tokens

---

## 3. Reusable prompt template

> **Use this block at the beginning of every user prompt to guarantee context loading and rule enforcement.**

```
BOOTSTRAP OBLIGATORIO: ejecuta el protocolo PRE-RESPONSE completo antes de responder.
- CWD: ${workspaceFolder}
- Leer y validar: docs/agent-context/PROJECT_CONTEXT.md, RULES.md, WORKFLOW.md, SKILL_REGISTRY.md
- Idioma de salida: español formal
- NO ejecutar cambios sin Plan de Accion aprobado por el humano

SOLICITUD:
<descripcion de la tarea aqui>
```

---

## 4. Post-response verification checklist

> **After every response, verify compliance with the following items before delivering the answer.**

- [ ] Se ejecutó el protocolo PRE-RESPONSE completo (pasos A, B, C, D)
- [ ] Se confirmó la carga de los cuatro módulos (sin bloque obligatorio)
- [ ] La respuesta está en español formal (sin mezclar idiomas)
- [ ] Si implica cambios de código: se presentó Plan de Acción antes de ejecutar
- [ ] Si implica cambios de código: el plan fue aprobado explícitamente por el humano
- [ ] Ningún archivo fue modificado fuera del scope del skill seleccionado
- [ ] Se registró la interacción en `AI_WORKFLOW.md` (WORKFLOW paso 8)
- [ ] Si se resolvió deuda técnica: se actualizó `DEBT_REPORT.md` (WORKFLOW paso 9)
- [ ] Los commits siguen la convención `conventional-commits`
- [ ] El linter no reporta errores y el tipado es 100% (sin `any`)

**STATUS:** COPILOT ADAPTER ACTIVE. LOAD CONTEXT MODULES TO PROCEED.
