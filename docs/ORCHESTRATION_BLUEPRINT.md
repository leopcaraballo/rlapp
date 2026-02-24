# Blueprint: sistema de orquestacion multi-agente

Guia universal para construir un sistema Orquestador + Sub-agentes (skills) en cualquier proyecto de software, independiente de lenguaje o framework.

## Indice

1. Vision general y principios
2. Requisitos previos
3. Estructura de carpetas
4. Modulos de contexto
5. Archivo orquestador (5.1 PRE-RESPONSE, 5.2 Bootstrap, 5.3 Algoritmo de delegacion, 5.4 Matriz de skills, 5.5 Grafo de dependencia, 5.6 Presupuesto de contexto)
6. Creacion de skills (6.1 Plantilla, 6.2 Assets, 6.3 Skills recomendadas, 6.4 Delegation templates)
7. Technology Discovery Protocol
8. Guardrails dinamicos y quality gates
9. Rollback y manejo de fallos (9.1 Protocolo de rechazo)
10. Script de sincronizacion de skills
11. Documentacion y trazabilidad (11.1 AI_WORKFLOW, 11.2 DEBT_REPORT, 11.3 Action Summary, 11.4 Checklist post-ejecucion)
12. Politica de seleccion de modelos (12.1 Umbrales, 12.2 Tiers, 12.3 Regla rapida, 12.4 Modelos prohibidos, 12.5 Selector automatico, 12.6 Costo total, 12.7 Anti-patrones)
13. Plantillas reutilizables
14. Checklist de verificacion final (14.1 Setup, 14.2 Runtime por respuesta)

## 1. Vision general y principios

El sistema consta de **un agente orquestador (AO)** que delega tareas a **sub-agentes especializados (SA)** con contexto aislado. Cada SA recibe solo la informacion necesaria para su tarea, ejecuta con guardrails y reporta un resumen.

**Principios aplicados:**

- **SRP (Single Responsibility):** El orquestador solo coordina; las reglas, contexto y workflow viven en archivos externos.
- **OCP (Open/Closed):** Se agregan nuevas skills sin modificar el orquestador.
- **DIP (Dependency Inversion):** El orquestador depende de abstracciones (modulos de contexto, protocolo de descubrimiento), no de tecnologias concretas.
- **Fail-fast:** Si falta un modulo de contexto o una skill, se detiene antes de producir resultados incorrectos.
- **Context isolation:** Cada SA opera con contexto reducido para prevenir "Context Overflow" y "Lost in the Middle".

## 2. Requisitos previos

Antes de implementar el sistema, verificar:

- El proyecto tiene un repositorio Git inicializado.
- El entorno del agente (IDE, CLI o plataforma) soporta tool-use real (lectura/escritura de archivos, git, linter, test runner).
- Se define un idioma de salida para respuestas, documentacion y commits.
- Se conoce (o se puede descubrir) el stack tecnologico del proyecto.

## 3. Estructura de carpetas

Crear esta estructura en la raiz del repositorio:

```
<proyecto>/
  .github/
    copilot-instructions.md    <- Orquestador (GitHub Copilot)
  GEMINI.md                    <- Orquestador (Gemini / otros agentes)
  docs/
    agent-context/
      PROJECT_CONTEXT.md       <- Arquitectura, stack, estructura
      RULES.md                 <- Reglas, anti-patrones, convenciones
      WORKFLOW.md              <- Flujo de trabajo de N pasos
      SKILL_REGISTRY.md        <- Catalogo de skills (auto-generado)
    MD_STYLE_GUIDE.md          <- Estilo para documentacion Markdown
  skills/
    action-summary-template.md <- Plantilla de reporte del SA al AO
    <nombre-skill>/
      skill.md                 <- Definicion del sub-agente
      assets/                  <- Templates de codigo, documentacion
  scripts/
    sync.sh                    <- Sincronizador de skills
  AI_WORKFLOW.md               <- Registro de interacciones humano-maquina
  DEBT_REPORT.md               <- Estado de hallazgos y deuda tecnica
```

**Nota:** `copilot-instructions.md` y `GEMINI.md` son versiones gemelas del mismo orquestador, adaptadas a cada plataforma.

## 4. Modulos de contexto

Crear cuatro archivos en `docs/agent-context/`. Mantenerlos concisos (menos de 100 lineas cada uno).

**Single Source of Truth (referencia obligatoria):**

- **Architecture/Stack:** `PROJECT_CONTEXT.md`
- **Rules/Anti-patterns:** `RULES.md`
- **N-step Workflow:** `WORKFLOW.md`
- **Skill Catalog:** `SKILL_REGISTRY.md` (auto-generado)
- **Markdown Style:** `docs/MD_STYLE_GUIDE.md` (sin emojis en encabezados/tablas, vocabulario de estado estandarizado)

### 4.1 PROJECT_CONTEXT.md

Describe el proyecto sin detalles de implementacion:

```markdown
# Context: Project and architecture

## 1. Project overview

[Descripcion breve del proyecto: que hace, para quien, flujo principal]

## 2. Architecture

- Pattern: [Event-Driven / Monolith / Microservices / Serverless / ...]
- Flow: [Diagrama textual del flujo principal]

## 3. Key folder structure

[Arbol de carpetas relevante]

## 4. Tech stack

| Layer    | Technology | Version | Notes |
| -------- | ---------- | ------- | ----- |
| Backend  | [...]      | [...]   | [...] |
| Frontend | [...]      | [...]   | [...] |
| Database | [...]      | [...]   | [...] |
| Testing  | [...]      | [...]   | [...] |
| Infra    | [...]      | [...]   | [...] |
```

### 4.2 RULES.md

Define convenciones, anti-patrones y directrices:

```markdown
# Context: Rules and directives

## 1. Cultural conventions

- Rol del agente (Senior Engineer / Lead)
- El humano es el arquitecto/revisor principal
- Cambios criticos incluyen `// HUMAN CHECK` con justificacion
- Cumplimiento estricto de SOLID, DRY, KISS

## 2. Operation rules (anti-patterns)

- Anti-pattern: Ejecutar cambios sin Plan de Accion aprobado
- Anti-pattern: Modificar archivos sin consultar la skill correspondiente
- Anti-pattern: Omitir registro en AI_WORKFLOW.md
- Anti-pattern: Omitir actualizacion de DEBT_REPORT.md
- [Agregar anti-patrones especificos del proyecto]

## 3. Naming conventions

[Idioma de nomenclatura, estilo de nombres, etc.]

## 4. Context hygiene

- Al concluir una tarea, purgar detalles de implementacion
- Nunca acumular contexto de multiples tareas en una sola sesion
```

### 4.3 WORKFLOW.md

Define el flujo de trabajo paso a paso:

```markdown
# Context: Workflow and traceability

## 1. Workflow (the algorithm)

1.  READ -> DEBT_REPORT.md (estado actual)
2.  CHOOSE -> Siguiente item pendiente
3.  MATCH -> Identificar skill por trigger (SKILL_REGISTRY.md)
4.  PLAN -> SA presenta Plan de Accion al humano
5.  APPROVE -> Humano valida, corrige o rechaza
6.  EXECUTE -> SA implementa los cambios aprobados
7.  RECEIVE -> Resumen de accion del SA
8.  REGISTER -> Actualizar AI_WORKFLOW.md
9.  UPDATE -> Marcar item en DEBT_REPORT.md
10. COMMIT -> Conventional Commits
11. PURGE -> Descartar razonamiento intermedio, conservar resumen

## 2. Traceability

- Toda interaccion se registra en AI_WORKFLOW.md
- Todo commit se registra con hash, fecha, tipo, descripcion, actor

## 3. Mandatory delegation

- Cada tarea se delega a un Sub-Agente con contexto aislado
- Prohibido realizar ediciones masivas directamente
```

### 4.4 SKILL_REGISTRY.md

Catalogo auto-generado por `scripts/sync.sh`:

```markdown
# Context: Skill registry

> Auto-invocation: cuando el trigger de una skill coincide con la solicitud, cargar el skill.md.

<!-- BEGIN SKILL REFERENCES (auto-generated by scripts/sync.sh) -->

| Skill           | Path            | Trigger         | Scope           |
| --------------- | --------------- | --------------- | --------------- |
| [auto-generado] | [auto-generado] | [auto-generado] | [auto-generado] |

<!-- END SKILL REFERENCES -->
```

## 5. Archivo orquestador

El orquestador es el "cerebro" del sistema. Se coloca en `.github/copilot-instructions.md` (Copilot) o en la raiz como `GEMINI.md` (otros agentes).

### 5.1 Protocolo PRE-RESPONSE (obligatorio en cada prompt)

```markdown
## PRE-RESPONSE PROTOCOL (mandatory on every prompt)

**Step A -- Verify working directory:**
The active working directory MUST be the repository root
(use `${workspaceRoot}` if available).

**Step A.1 -- Tooling availability:**
Verify tool-use is available (file read/write, git, linter, test runner).
If unavailable, abort with: `TOOLING ERROR: no tool-use available.`

**Step B -- Execute Bootstrap:**
Read and validate all context modules. Do not proceed if any fails to load.

**Step C -- Enforce workflow before execution:**
Never execute code changes without first presenting an Action Plan
and receiving explicit approval.

**Step D -- Output language enforcement:**
[Definir idioma de salida]

> **CRITICAL COMMUNICATION DIRECTIVE:**
>
> - **Internal reasoning:** The model processes all rules, code, and logic in English.
> - **Output language:** ALL user-facing responses, code comments, documentation, and commit messages MUST be in the configured output language. Never output explanations in a different language.

**Step E -- Context budget enforcement:**
Prefer selective loading of modules and skills to avoid overflow.

**Fallback:**
If the model skips this protocol, re-send prepending:
`BOOTSTRAP OBLIGATORIO: ejecuta el protocolo PRE-RESPONSE completo.`
```

### 5.2 Bootstrap (carga de contexto)

```javascript
// Pseudocode: Dependency Injection with fail-fast
const REQUIRED_MODULES = [
  "docs/agent-context/PROJECT_CONTEXT.md",
  "docs/agent-context/RULES.md",
  "docs/agent-context/WORKFLOW.md",
  "docs/agent-context/SKILL_REGISTRY.md",
];

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

### 5.3 Algoritmo de delegacion

```javascript
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

  // 4.5. Technology Discovery -- SA MUST detect stack before writing code
  // The SA inspects config files within the allowed scope to build a TechProfile.
  // This makes the SA agnostic: it adapts to ANY language/framework.
  const techProfile = await detectTechStack(allowedScope);

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
   - Read package.json, tsconfig.json, requirements.txt, pom.xml,
     build.gradle, pyproject.toml, Cargo.toml, or equivalent.
2. **Identify the tech profile:**
   - Language: Determine from file extensions (.ts, .js, .py, .java, etc.)
   - Framework: Determine from imports, decorators, and config
   - Package manager: npm, yarn, pnpm, pip, maven, etc.
   - Test runner: jest, vitest, pytest, junit, etc.
   - Linter/formatter: eslint, prettier, pylint, checkstyle, etc.
3. **Adapt all code output** to the detected stack:
   - Use the import style, decorators, and patterns native to the detected framework.
   - Follow the typing conventions of the detected language.
   - Use the detected test runner for test files.
   - Use the detected linter command for validation.
4. **Report detected stack** at the beginning of the Action Summary:
   Detected stack: [language] + [framework] | Tests: [runner] | Linter: [tool]

# Detected Tech Profile: ${JSON.stringify(techProfile)}

# Strict Code Guardrails (adapted to detected stack):
- Run the detected linter (${techProfile.linter}) and ensure there are no errors.
- If the language supports static typing: all code must be 100% typed.
- If TypeScript: FORBIDDEN use of any.
- If Python: use type hints on all function signatures.
- If Java/Kotlin: no raw types.
- Adapt guardrails to the detected language; do NOT apply TypeScript rules to non-TS code.

# SCOPE LIMIT (guardrail):
- Only modify files within: ${allowedScope.join(", ")}
- If you need to modify files OUTSIDE the scope -> STOP and report to the orchestrator.
- Max 5 source files + skill.md + RULES.md per SA context.

# Deliverables:
1. Implemented code (applying skills in order)
2. Tests (coverage >80%)
3. Change documentation (// HUMAN CHECK where applicable)
4. Action Summary (format: skills/action-summary-template.md)
5. Recommended model: Evaluate task complexity and recommend
   the optimal model according to section 12 (Model selection policy).
   Format: "Recommended model for this task: [model] (Tier X) -- [reason]"
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

  // 8. Document (WORKFLOW steps 8-9)
  await registerInAI_WORKFLOW(taskType, requiredSkills, userRequest, result);
  if (isArchitecturalFinding(result)) {
    await updateDEBT_REPORT(result);
  }

  // 9. Commits (conventional-commits skill -- always LAST)
  await createCommits(result.changes);

  // 10. Purge SA context, keep only Action Summary
  return result.actionSummary;
}
```

### 5.4 Matriz de seleccion de skills

Definir una tabla que mapee tipos de tarea a skills requeridas (minimo 2-3):

```markdown
| Task type              | Required skills (minimum 2-3)                 |
| ---------------------- | --------------------------------------------- |
| Frontend (UI/UX)       | `frontend-ui`, `refactor-arch`, `testing`     |
| Backend (API/Logic)    | `backend-api`, `refactor-arch`, `testing`     |
| Architectural refactor | `refactor-arch`, `testing`                    |
| Security/Audit         | `security-audit`, `refactor-arch`, `testing`  |
| Microservices          | `backend-api`, `refactor-arch`, `testing`     |
| Testing/QA             | `testing`, `refactor-arch`                    |
| Infrastructure         | `infra`, `backend-api`, `testing`             |
| Commits/Docs           | `conventional-commits`, `skill-creator` (opt) |
| Skill creation         | `skill-creator`, `refactor-arch`, `testing`   |
```

### 5.5 Grafo de dependencia de skills

```
domain-skills ──┐
(backend, frontend, infra, refactor) ──┤── ejecutar primero
                                       │
security ──── validacion pre-deploy    │
testing ───── quality gate (valida TODO)
conventional-commits ── siempre ULTIMO
skill-creator ── meta: solo cuando no existe skill
```

### 5.6 Presupuesto de contexto

| Recurso                    | Limite       | Si se excede                          |
| -------------------------- | ------------ | ------------------------------------- |
| Archivos fuente en prompt  | 5 max por SA | Dividir tarea en sub-tareas           |
| Skills cargadas            | 3 max por SA | Priorizar por grafo de dependencia    |
| Lineas totales de contexto | 500 max      | Resumir archivos, usar grep selectivo |
| Reintentos por tarea       | 2 max        | Escalar a revision humana             |

## 6. Creacion de skills (sub-agentes)

Cada skill se define en `skills/<nombre>/skill.md` con esta estructura:

### 6.1 Plantilla de skill

```markdown
---
name: "<nombre-de-la-skill>"
description: "<proposito en una linea>"
trigger: "<palabras clave que activan esta skill>"
scope: "<directorios/archivos permitidos, separados por coma>"
author: "<equipo o autor>"
version: "1.0.0"
license: "MIT"
autoinvoke: true
---

# Skill: <nombre>

## Context

[Descripcion del contexto especifico para esta skill.
Que parte del sistema atiende, que tecnologias usa.]

## Rules

1. [Regla especifica 1]
2. [Regla especifica 2]
3. Cada decision critica incluye `// HUMAN CHECK` con justificacion.
   [Agregar reglas propias del dominio de la skill]

## Tools permitted

- Read/Write: archivos dentro de [scope]
- Terminal: [comandos permitidos, e.g. `npm run test`, `pytest`]
- Explore: grep/glob para localizar componentes afectados

## Workflow

1. Leer el item de feedback e identificar archivos afectados.
2. Usar grep para localizar componentes relacionados.
3. Consultar plantillas en `assets/` para el patron esperado.
4. Implementar el cambio siguiendo las reglas.
5. Agregar `// HUMAN CHECK` donde aplique.
6. Retornar un Action Summary conciso.

## Assets

- `assets/templates/[patron].ext` -- [descripcion]
- `assets/docs/[guia].md` -- [descripcion]
```

### 6.2 Carpeta de assets

Cada skill puede tener una carpeta `assets/` con:

- **Templates de codigo:** patrones de referencia que el SA debe seguir (e.g., `service-pattern.ts`, `component-pattern.tsx`).
- **Documentacion especializada:** guias de dominio (e.g., `ack-nack-strategy.md`, `css-conventions.md`).

### 6.3 Skills recomendadas para iniciar

Dependiendo del tipo de proyecto, crear al menos estas skills:

| Skill                  | Proposito                                   |
| ---------------------- | ------------------------------------------- |
| `backend-api`          | Logica de negocio, servicios, controladores |
| `frontend-ui`          | Componentes, paginas, estilos               |
| `testing-qa`           | Tests unitarios, mocking, cobertura         |
| `refactor-arch`        | Refactorizacion, SOLID, patrones de diseño  |
| `security-audit`       | Seguridad, vulnerabilidades, OWASP          |
| `infra` / `docker`     | Docker, CI/CD, variables de entorno         |
| `conventional-commits` | Historial semantico de Git                  |
| `skill-creator`        | Meta-skill para crear nuevas skills         |

### 6.4 Delegation templates por skill

Cada skill puede incluir un archivo `assets/delegation-template.md` que define la estructura de delegacion esperada para ese tipo de tarea. El AO referencia estos templates al construir el prompt del SA:

```markdown
> **Delegation templates by task type:**
>
> - Frontend: See skills/frontend-ui/assets/delegation-template.md
> - Backend: See skills/backend-api/assets/delegation-template.md
> - Security: See skills/security-audit/assets/delegation-template.md
> - Testing: See skills/testing-qa/assets/delegation-template.md
>
> **Action Summary template:** See skills/action-summary-template.md
>
> **Executed examples:** See AI_WORKFLOW.md
```

Estos templates proveen one-shot examples que guian al SA a producir codigo consistente con el patron del proyecto.

## 7. Technology Discovery Protocol

El SA no debe asumir ninguna tecnologia. Antes de escribir codigo, ejecuta estos pasos:

### 7.1 Pasos de descubrimiento

1. **Inspeccionar archivos de configuracion** dentro del scope:
   - `package.json`, `tsconfig.json`, `requirements.txt`, `pom.xml`,
     `build.gradle`, `pyproject.toml`, `Cargo.toml`, o equivalente.

2. **Identificar el perfil tecnologico:**
   - Lenguaje: determinar por extensiones (`.ts`, `.js`, `.py`, `.java`, `.rs`, etc.)
   - Framework: determinar por imports, decoradores, config
   - Gestor de paquetes: `npm`, `yarn`, `pnpm`, `pip`, `maven`, etc.
   - Test runner: `jest`, `vitest`, `pytest`, `junit`, etc.
   - Linter/formatter: `eslint`, `prettier`, `pylint`, `checkstyle`, etc.

3. **Adaptar la salida** al stack detectado:
   - Usar el estilo de imports, decoradores y patrones nativos del framework.
   - Seguir las convenciones de tipado del lenguaje.
   - Usar el test runner detectado para archivos de prueba.
   - Usar el linter detectado para validacion.

4. **Reportar stack detectado** al inicio del Action Summary:
   `Detected stack: [language] + [framework] | Tests: [runner] | Linter: [tool]`

### 7.2 Pseudocodigo

```javascript
async function detectTechStack(allowedScope) {
  const configFiles = await findConfigFiles(allowedScope);
  // configFiles: package.json, tsconfig.json, requirements.txt, pom.xml, etc.

  return {
    language: inferLanguage(configFiles), // "TypeScript" | "Python" | ...
    framework: inferFramework(configFiles), // "NestJS" | "FastAPI" | ...
    packageManager: inferPackageManager(configFiles), // "npm" | "pip" | ...
    testRunner: inferTestRunner(configFiles), // "jest" | "pytest" | ...
    linter: inferLinter(configFiles), // "eslint" | "pylint" | ...
    configFiles: configFiles.map((f) => f.path),
    typingEnforced: inferTypingEnforced(configFiles), // true | false
  };
}
```

## 8. Guardrails dinamicos y quality gates

Los guardrails se adaptan al stack detectado:

```markdown
# Strict Code Guardrails (adapted to detected stack):

- Run the detected linter and ensure there are no errors.
- If the language supports static typing: all code must be 100% typed.
- If TypeScript: FORBIDDEN use of `any`.
- If Python: use type hints on all function signatures.
- If Java/Kotlin: no raw types.
- Adapt guardrails to the detected language.
```

**Quality gates obligatorias antes de cerrar tarea:**

1. Tests pasan (comando del test runner detectado).
2. Linter sin errores (comando del linter detectado).
3. Scope enforcement: ningun archivo modificado fuera del scope permitido.

## 9. Rollback y manejo de fallos

| Escenario             | Accion                                        | Reintentos |
| --------------------- | --------------------------------------------- | ---------- |
| Violacion de scope    | `git checkout -- .` + escalar a humano        | 0          |
| Tests fallidos        | `git checkout -- .` + reintentar con contexto | 2          |
| Linter con errores    | `git checkout -- .` + reintentar con contexto | 2          |
| SA no puede completar | Registrar en AI_WORKFLOW.md + escalar         | 0          |
| Humano rechaza plan   | Re-planificar con nuevas restricciones        | 3          |

### 9.1 Protocolo de rechazo del plan

Cuando el humano rechaza el Plan de Accion, seguir estos pasos:

1. **Registrar** la razon del rechazo en `AI_WORKFLOW.md`.
2. **Solicitar** clarificacion especifica al humano sobre que ajustar.
3. **Re-planificar** con las nuevas restricciones (volver al paso 4: PLAN del workflow).
4. **Maximo 3 rechazos** por tarea. Si se superan, cambiar completamente el enfoque o escalar a revision humana con contexto completo de los intentos previos.

> **Anti-pattern:** Reintentar el mismo plan sin incorporar el feedback del rechazo.

## 10. Script de sincronizacion de skills

Crear `scripts/sync.sh` que:

1. Parsee los YAML frontmatter de todos los `skills/*/skill.md`.
2. Extraiga `name`, `trigger`, `scope` de cada skill.
3. Regenere la tabla de Skill References en `docs/agent-context/SKILL_REGISTRY.md`.
4. Use comentarios sentinela para reemplazo idempotente.

### 10.1 Plantilla del script

```bash
#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_FILE="$REPO_ROOT/docs/agent-context/SKILL_REGISTRY.md"
SKILLS_DIR="$REPO_ROOT/skills"

# Verify files exist
[ -f "$AGENT_FILE" ] || { echo "Error: SKILL_REGISTRY.md not found"; exit 1; }
[ -d "$SKILLS_DIR" ] || { echo "Error: skills/ not found"; exit 1; }

# Build table from YAML frontmatter
TABLE_ROWS=""
for skill_dir in "$SKILLS_DIR"/*/; do
    skill_file="${skill_dir}skill.md"
    [ -f "$skill_file" ] || continue

    name=$(awk '/^---$/{n++; next} n==1 && /^name:/{sub(/^name: *"?/,""); sub(/"? *$/,""); print; exit}' "$skill_file")
    trigger=$(awk '/^---$/{n++; next} n==1 && /^trigger:/{sub(/^trigger: *"?/,""); sub(/"? *$/,""); print; exit}' "$skill_file")
    scope=$(awk '/^---$/{n++; next} n==1 && /^scope:/{sub(/^scope: *"?/,""); sub(/"? *$/,""); print; exit}' "$skill_file")
    rel_path="${skill_file#$REPO_ROOT/}"

    [ -n "$name" ] && TABLE_ROWS="${TABLE_ROWS}| \`${name}\` | \`${rel_path}\` | ${trigger} | \`${scope}\` |\n"
done

# Replace between sentinel comments
REPLACEMENT="| Skill | Path | Trigger | Scope |\n|-------|------|---------|-------|\n${TABLE_ROWS}"
sed -i "/<!-- BEGIN SKILL REFERENCES/,/<!-- END SKILL REFERENCES/c\\
<!-- BEGIN SKILL REFERENCES (auto-generated by scripts/sync.sh) -->\n\n${REPLACEMENT}\n<!-- END SKILL REFERENCES -->" "$AGENT_FILE"

echo "Sync complete."
```

**Ejecutar despues de crear o modificar skills:** `bash scripts/sync.sh`

## 11. Documentacion y trazabilidad

### 11.1 AI_WORKFLOW.md

Registra cada interaccion humano-maquina. Cada entrada **debe incluir:**

- Solicitud del usuario (texto original)
- Tipo de tarea identificado
- Skills cargadas (en orden de ejecucion)
- **Modelo AO** utilizado (e.g., Claude Sonnet 4.6)
- **Modelo SA** utilizado (e.g., GPT-5.1-Codex-Max)
- Resumen de accion del SA (Action Summary)
- Commits generados (hash, tipo, descripcion)
- Aprobacion humana (aprobado/corregido/rechazado + razon)

### 11.2 DEBT_REPORT.md

Tabla consolidada de hallazgos y deuda tecnica:

```markdown
| ID   | Severity | Description   | Status  | Resolved in |
| ---- | -------- | ------------- | ------- | ----------- |
| A-01 | High     | [descripcion] | Pending |             |
| A-02 | Medium   | [descripcion] | Done    | commit abc  |
```

### 11.3 Action Summary (reporte del SA al AO)

Cada SA reporta usando la plantilla `skills/action-summary-template.md`:

```markdown
## Action Summary

- **Item:** [ID del DEBT_REPORT]
- **Skill:** [skill usada]
- **AO Model:** [modelo del orquestador]
- **SA Model:** [modelo del sub-agente]
- **Recommended Model:** [modelo optimo para esta tarea segun seccion 12, e.g. Claude Sonnet 4.6 (Tier 2) -- razon]
- **Files Changed:**
  - `path/to/file` -- [descripcion breve]
- **What Was Done:** [1-2 oraciones]
- **What to Validate:**
  - [ ] [comando de test o verificacion manual]
- **HUMAN CHECK Added:** [Si/No -- ubicaciones]
- **Breaking Changes:** [Si/No -- impacto]
```

### 11.4 Checklist post-ejecucion (obligatoria)

Despues de cada tarea completada, verificar:

- [ ] Commits con Conventional Commits
- [ ] Documentacion actualizada (AI_WORKFLOW.md + DEBT_REPORT.md si aplica)
- [ ] Tests pasando
- [ ] Linter ejecutado sin errores (tipado 100%, sin `any` en TypeScript)
- [ ] Git status limpio
- [ ] Scope enforcement validado (ningun archivo fuera del scope)

## 12. Politica de seleccion de modelos

> Basada en 4 dimensiones: ventana de output, razonamiento, ventana de input, costo.

### 12.1 Umbrales minimos para SA

| Dimension      | Minimo                     | Justificacion                                                                |
| -------------- | -------------------------- | ---------------------------------------------------------------------------- |
| Ventana output | >=32K tokens               | SA genera controlador + tests + resumen (~10-25K tokens en tareas complejas) |
| Ventana input  | >=100K tokens              | 4 modulos + 3 skills + tarea + codigo fuente (~35-40K tokens)                |
| Razonamiento   | Tier Sonnet/Pro o superior | SOLID, DDD, Hexagonal, tipado 100%, `// HUMAN CHECK` con justificacion       |
| Costo          | <=1x rutinario             | Delegaciones frecuentes a 3x no son sostenibles                              |

### 12.2 Clasificacion por tier

**Tier 1 -- Recomendado para AO y SA (tareas de cualquier complejidad):**

| Modelo            | Input | Output | Razonamiento | Costo | Notas                               |
| ----------------- | ----- | ------ | ------------ | ----- | ----------------------------------- |
| GPT-5.3-Codex     | 272K  | 128K   | Top          | 1x    | Mejor ratio capacidad/costo         |
| GPT-5.2-Codex     | 272K  | 128K   | Top          | 1x    | Input masivo para contextos grandes |
| GPT-5.1-Codex-Max | 128K  | 128K   | Top          | 1x    | Maximo output en familia GPT        |
| GPT-5.1-Codex     | 128K  | 128K   | Alto         | 1x    | Solido para SA de codigo            |
| Claude Opus 4.6   | 128K  | 64K    | Top          | 3x    | Solo para arquitectura compleja     |

**Tier 2 -- Bueno para SA rutinario (cambios de codigo, tests, bug fixes):**

| Modelo            | Input | Output | Razonamiento | Costo | Notas                                        |
| ----------------- | ----- | ------ | ------------ | ----- | -------------------------------------------- |
| Claude Opus 4.5   | 128K  | 32K    | Top          | 3x    | Top razonamiento pero costoso y output justo |
| GPT-5.2           | 128K  | 64K    | Alto         | 1x    | Buen equilibrio general                      |
| GPT-5.1           | 128K  | 64K    | Alto         | 1x    | Buen equilibrio general                      |
| Claude Sonnet 4.5 | 128K  | 32K    | Alto         | 1x    | Mejor ratio calidad/costo en Claude          |
| Claude Sonnet 4.6 | 128K  | 32K    | Alto         | 1x    | Equivalente a Sonnet 4.5                     |
| Gemini 2.5 Pro    | 109K  | 64K    | Alto         | 1x    | Buen output, input ligeramente menor         |
| Gemini 3 Pro      | 109K  | 64K    | Alto         | 1x    | Preview -- monitorear estabilidad            |

**Tier 3 -- Solo para tareas simples (linting, renombrado, commits, formato):**

| Modelo             | Input | Output | Razonamiento | Costo | Notas                                 |
| ------------------ | ----- | ------ | ------------ | ----- | ------------------------------------- |
| Claude Haiku 4.5   | 128K  | 32K    | Medio        | 0.33x | Barato pero puede fallar en SOLID/DDD |
| Gemini 3 Flash     | 109K  | 64K    | Medio        | 0.33x | Preview, buen output para su costo    |
| GPT-5.1-Codex-Mini | 128K  | 128K   | Medio        | 0.33x | Output masivo, razonamiento medio     |

### 12.3 Regla rapida de seleccion

```
SI tarea == arquitectura compleja (refactor, DDD, security audit)
   -> Tier 1 (preferir GPT-5.x-Codex por costo, Opus solo si se necesita razonamiento superior)
SI tarea == codigo rutinario (tests, bugfix, feature simple)
   -> Tier 2 (preferir Sonnet 4.5/4.6 o GPT-5.1/5.2 por equilibrio)
SI tarea == mecanica simple (lint fix, rename, commit message)
   -> Tier 3 aceptable (Haiku, Flash, Codex-Mini)
SI NO
   -> Tier 2 por defecto
```

### 12.4 Modelos prohibidos

> **Razon:** No cumplen los umbrales minimos de la seccion 12.1.

| Modelo          | Input | Output | Razon de exclusion                                    |
| --------------- | ----- | ------ | ----------------------------------------------------- |
| GPT-4o          | 64K   | 4K     | Output inutilizable (no cabe 1 test completo)         |
| GPT-4.1         | 111K  | 16K    | Output insuficiente para generacion multi-archivo     |
| Claude Sonnet 4 | 128K  | 16K    | Output insuficiente para SA senior                    |
| GPT-5 mini      | 128K  | 64K    | Razonamiento insuficiente para nivel senior requerido |

### 12.5 Selector automatico (pseudocodigo)

> **Principio clave:** El AO y SA tienen requerimientos diferentes.
> El AO solo orquesta (bajo output, alto razonamiento).
> El SA genera codigo (alto output, razonamiento variable por tarea).
>
> **IMPORTANTE:** Esta funcion es una guia de decision para el humano, NO ejecucion automatica.
> El humano selecciona el modelo en el IDE consultando esta tabla. El AO y SA deben
> registrar que modelo se uso en el Action Summary (seccion 11.3, trazabilidad obligatoria).

```javascript
function chooseModel(role, taskType, budget = "normal") {
  // AO (Orchestrator): siempre Tier 2
  // - Output real: ~2-5K tokens (prompt de delegacion + validacion)
  // - No necesita output masivo, SI necesita alto razonamiento
  // - Anti-pattern: Usar Tier 1 (128K output) u Opus (3x) para AO
  if (role === "AO") {
    return budget === "tight"
      ? "Claude Sonnet 4.6" // 32K output, 1x -- minimo viable para AO
      : "GPT-5.1"; // 64K output, 1x -- optimo para AO
  }

  // SA (Sub-Agent): tier variable segun tipo de tarea
  // - Output real: ~10-25K tokens (codigo + tests + resumen)

  // SA Tier 1: Arquitectura / seguridad / refactor complejo
  if (["architecture", "refactor", "security"].includes(taskType)) {
    return budget === "tight"
      ? "GPT-5.1-Codex" // 128K output, alto razonamiento, 1x
      : "GPT-5.1-Codex-Max"; // 128K output, top razonamiento, 1x
  }

  // SA Tier 2: Backend / Frontend / Tests / Bug fixes
  if (["backend", "frontend", "tests", "bugfix"].includes(taskType)) {
    return budget === "tight"
      ? "Claude Sonnet 4.6" // 32K output, alto razonamiento, 1x
      : "GPT-5.1"; // 64K output, alto razonamiento, 1x
  }

  // SA Tier 3: Tareas mecanicas (lint, rename, commits)
  if (["lint", "rename", "commit"].includes(taskType)) {
    return budget === "very_tight"
      ? "Claude Haiku 4.5" // 32K output, medio razonamiento, 0.33x
      : "GPT-5.1-Codex-Mini"; // 128K output, medio razonamiento, 0.33x
  }

  // Default seguro para SA
  return "Claude Sonnet 4.6"; // 32K output, alto razonamiento, 1x
}
```

### 12.6 Costo total por tarea (AO + SA)

> **Formula:** Costo total = costo(AO) + costo(SA)

| Tipo de tarea    | AO recomendado         | SA recomendado         | Costo total |
| ---------------- | ---------------------- | ---------------------- | ----------- |
| Arquitectura     | GPT-5.1 (1x)           | GPT-5.1-Codex-Max (1x) | 2x          |
| Backend/Frontend | GPT-5.1 (1x)           | GPT-5.1 (1x)           | 2x          |
| Tests/Bug fixes  | Claude Sonnet 4.6 (1x) | Claude Sonnet 4.6 (1x) | 2x          |
| Lint/Commits     | Claude Sonnet 4.6 (1x) | Haiku 4.5 (0.33x)      | 1.33x       |

- Anti-pattern: AO con Opus (3x) + SA con Opus (3x) = 6x por tarea
- Anti-pattern: AO con Codex-Max (128K output) cuando solo genera ~3K tokens

### 12.7 Anti-patrones de seleccion

- Usar modelos con output menor a 32K para generacion multi-archivo.
- Usar Tier 3 para tareas que requieren razonamiento arquitectonico (DDD, Hexagonal, refactoring).
- Usar Opus (3x) para tareas rutinarias que un Sonnet/GPT-5.x resuelve igual.
- Usar modelos Preview en produccion sin monitorear resultados.

## 13. Plantillas reutilizables

### 13.1 Plantilla de prompt reutilizable

```
BOOTSTRAP OBLIGATORIO: ejecuta el protocolo PRE-RESPONSE completo antes de responder.
- CWD: [ruta del proyecto]
- Leer y validar: docs/agent-context/PROJECT_CONTEXT.md, RULES.md, WORKFLOW.md, SKILL_REGISTRY.md
- Idioma de salida: [idioma]
- NO ejecutar cambios sin Plan de Accion aprobado por el humano

SOLICITUD:
[descripcion de la tarea]
```

### 13.2 Plantilla de orquestador resumida

Copiar los archivos `.github/copilot-instructions.md` o `GEMINI.md` del proyecto de referencia y adaptar:

1. Reemplazar nombre del proyecto.
2. Actualizar modulos de contexto segun el nuevo proyecto.
3. Ajustar la matriz de skills segun las necesidades.
4. Ejecutar `bash scripts/sync.sh` tras crear las skills.

## 14. Checklist de verificacion final

### 14.1 Checklist de setup (una vez al configurar el sistema)

Antes de considerar el sistema operativo, verificar:

- [ ] Los 4 modulos de contexto existen y tienen contenido valido
- [ ] El archivo orquestador tiene el protocolo PRE-RESPONSE completo
- [ ] Al menos 3 skills estan creadas con YAML frontmatter correcto
- [ ] `scripts/sync.sh` ejecuta sin errores y genera SKILL_REGISTRY.md
- [ ] El agente carga los modulos al recibir un prompt y respeta el idioma configurado
- [ ] El agente presenta Plan de Accion antes de ejecutar cambios
- [ ] El agente respeta los limites de scope definidos en las skills
- [ ] El linter y los tests ejecutan correctamente dentro del scope
- [ ] AI_WORKFLOW.md existe para registrar interacciones
- [ ] DEBT_REPORT.md existe para rastrear hallazgos
- [ ] El Technology Discovery Protocol detecta el stack correctamente al intervenir codigo

### 14.2 Checklist por respuesta (runtime, en cada interaccion del agente)

Despues de cada respuesta, verificar cumplimiento antes de entregar al humano:

- [ ] Se ejecuto el protocolo PRE-RESPONSE completo (pasos A, A.1, B, C, D, E)
- [ ] Se confirmo la carga de los cuatro modulos
- [ ] La respuesta esta en el idioma configurado (sin mezclar idiomas)
- [ ] Si implica cambios de codigo: se presento Plan de Accion antes de ejecutar
- [ ] Si implica cambios de codigo: el plan fue aprobado explicitamente por el humano
- [ ] Ningun archivo fue modificado fuera del scope del skill seleccionado
- [ ] Se registro la interaccion en `AI_WORKFLOW.md` (WORKFLOW paso 8)
- [ ] Si se resolvio deuda tecnica: se actualizo `DEBT_REPORT.md` (WORKFLOW paso 9)
- [ ] Los commits siguen la convencion `conventional-commits`
- [ ] El linter no reporta errores y el tipado es 100%
