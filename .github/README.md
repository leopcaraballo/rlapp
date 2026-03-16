# ASDD Framework — Guía de Uso (GitHub Copilot)

**ASDD** (Agent Spec Software Development) es un framework de desarrollo asistido por IA que organiza el trabajo de software en cinco fases orquestadas por agentes especializados.

```
Requerimiento → Spec → [Backend ∥ Frontend ∥ DB] → [Tests BE ∥ Tests FE] → QA → Doc (opcional)
```

> Esta guía cubre el uso con **GitHub Copilot Chat** en VS Code.

---

## Requisitos

| Requisito | Detalle |
|---|---|
| VS Code | Cualquier versión reciente |
| GitHub Copilot Chat | Extensión instalada y activa |
| Setting habilitado | `github.copilot.chat.codeGeneration.useInstructionFiles: true` |

El archivo `.vscode/settings.json` debe mantener habilitado `github.copilot.chat.codeGeneration.useInstructionFiles: true`. La resolucion de agentes, skills e instrucciones depende de la estructura real de `.github/`.

---

## Onboarding del repositorio

Antes de usar cualquier agente en RLAPP, valida estos archivos **en orden**:

| # | Archivo | Qué escribir |
|---|---------|-------------|
| 1 | `README.md` (raíz del proyecto) | Contexto general del sistema y documentación principal |
| 2 | `apps/backend/README.md` | Arquitectura backend, comandos y estructura real |
| 3 | `apps/frontend/README.md` | Arquitectura frontend, comandos y estructura real |
| 4 | `.github/instructions/*.md` | Reglas path-scoped para backend, frontend y tests |
| 5 | `.github/copilot-instructions.md` | Flujo ASDD y diccionario de dominio |

Una vez validados, los agentes tienen el contexto minimo para operar de forma consistente con este repositorio.

Si cambia el stack o la estructura de carpetas, actualiza primero `instructions/`, `agents/`, `skills/` y `prompts/`.

---

## El flujo ASDD paso a paso

### Paso 1 — Spec (obligatorio, siempre primero)

Genera la especificación técnica antes de escribir código:

```
@Spec Generator genera la spec para: [tu requerimiento]
```
```
/generate-spec <nombre-feature>
```

El agente valida el requerimiento y genera `specs/<feature>.spec.md` con estado `DRAFT`.
Revisa y aprueba la spec (cambia a `APPROVED`) antes de continuar.

---

### Paso 2 — Implementación (paralelo)

Con la spec `APPROVED`, lanza backend, frontend y base de datos en paralelo:

```
@Backend Developer implementa specs/<feature>.spec.md
@Frontend Developer implementa specs/<feature>.spec.md
@Database Agent diseña el modelo de datos para specs/<feature>.spec.md
```

O con el Orchestrator para coordinar todo automáticamente:
```
@Orchestrator ejecuta el flujo completo para: [tu requerimiento]
```

> **Database Agent** solo es necesario si hay cambios en el modelo de datos.

---

### Paso 3 — Tests (paralelo)

Con la implementación completa, genera los tests:

```
@Test Engineer Backend genera tests para specs/<feature>.spec.md
@Test Engineer Frontend genera tests para specs/<feature>.spec.md
```
```
/unit-testing <nombre-feature>
```

---

### Paso 4 — QA

Con tests completos, ejecuta la estrategia QA:

```
@QA Agent ejecuta QA para specs/<feature>.spec.md
```

El agente genera: casos Gherkin, matriz de riesgos y (si hay SLAs) plan de performance.

---

### Paso 5 — Documentación *(opcional)*

Al cerrar el feature:

```
@Documentation Agent documenta el feature specs/<feature>.spec.md
```

---

### Flujo completo con Orchestrator

```
@Orchestrator ejecuta el flujo completo para: [tu requerimiento]
```
```
/asdd-orchestrate <nombre-feature>
```

---

## Agentes disponibles (`@nombre` en Copilot Chat)

| Agente | Fase | Cuándo usarlo |
|---|---|---|
| `@Orchestrator` | Entry point | Coordinar el flujo completo (`/asdd-orchestrate status` para ver estado) |
| `@Spec Generator` | Fase 1 | Validar un requerimiento y generar su spec técnica |
| `@Backend Developer` | Fase 2 ∥ | Implementar el backend según la spec |
| `@Frontend Developer` | Fase 2 ∥ | Implementar el frontend según la spec |
| `@Database Agent` | Fase 2 ∥ | Diseñar modelos de datos, migrations y seeders |
| `@Test Engineer Backend` | Fase 3 ∥ | Generar tests para el backend (paralelo con Frontend) |
| `@Test Engineer Frontend` | Fase 3 ∥ | Generar tests para el frontend (paralelo con Backend) |
| `@QA Agent` | Fase 4 | Gherkin, riesgos y análisis de performance |
| `@Documentation Agent` | Fase 5 | README, API docs y ADRs |

---

## Skills disponibles (`/comando` en Copilot Chat)

| Comando | Agente | Qué hace |
|---|---|---|
| `/asdd-orchestrate` | Orchestrator | Orquesta el flujo completo o muestra estado actual |
| `/generate-spec` | Spec Generator | Genera spec técnica alineada al stack real del repo |
| `/implement-backend` | Backend Developer | Implementa feature completo en el backend |
| `/implement-frontend` | Frontend Developer | Implementa feature completo en el frontend |
| `/unit-testing` | Test Engineers | Genera suite de tests (backend + frontend) |
| `/gherkin-case-generator` | QA Agent | Flujos críticos + casos Given-When-Then + datos de prueba |
| `/risk-identifier` | QA Agent | Matriz de riesgos ASD (Alto/Medio/Bajo) |
| `/automation-flow-proposer` | QA Agent | Propone flujos a automatizar con estimación de ROI |
| `/performance-analyzer` | QA Agent | Planifica pruebas de carga y performance |

---

## Prompts disponibles (`/nombre` en Copilot Chat)

Alternativa rápida a invocar agentes directamente:

| Comando | Cuándo usarlo |
|---|---|
| `/generate-spec` | Crear una nueva spec desde un requerimiento |
| `/backend-task` | Implementar una spec en el backend |
| `/frontend-task` | Implementar una spec en el frontend |
| `/db-task` | Diseñar esquema de datos, migrations y seeders |
| `/generate-tests` | Generar tests para una spec o módulo existente |
| `/qa-task` | Ejecutar el flujo QA (Gherkin + riesgos + performance) |
| `/doc-task` | Generar documentación técnica del feature |
| `/full-flow` | Orquestar todas las fases de principio a fin |

---

## Instructions automáticas (sin intervención manual)

Inyectadas automáticamente por Copilot cuando el archivo activo coincide:

| Archivo activo | Instructions aplicadas |
|---|---|
| `apps/backend/src/**/*.cs` | `instructions/backend.instructions.md` |
| `apps/frontend/src/**/*.{ts,tsx,js,jsx}` | `instructions/frontend.instructions.md` |
| `apps/backend/src/Tests/**/*.cs` / `apps/frontend/test/**/*` | `instructions/tests.instructions.md` |

> Si cambian las rutas o el stack, ajusta los patrones `applyTo:` y los prompts antes de volver a usar los agentes.

---

## Lineamientos de referencia

Cargados automáticamente por los agentes:

| Documento | Contenido |
|---|---|
| `.github/docs/lineamientos/dev-guidelines.md` | Clean Code, SOLID, API REST, Seguridad, Observabilidad |
| `.github/docs/lineamientos/qa-guidelines.md` | Estrategia QA, Gherkin, Riesgos, Automatización, Performance |
| `.github/docs/lineamientos/guidelines.md` | Referencia rápida de estándares: código, tests, API, Git |

---

## Estructura de carpetas

```
Project Root/
│
├── docs/output/                     ← artefactos generados por los agentes
│   ├── qa/                          ← Gherkin, riesgos, performance
│   ├── api/                         ← documentación de API
│   └── adr/                         ← Architecture Decision Records
│
└── .github/                         ← framework Copilot del repositorio
    ├── README.md                    ← este archivo
    ├── AGENTS.md                    ← reglas críticas para todos los agentes
    ├── copilot-instructions.md      ← siempre activo en Copilot Chat
    │
    ├── agents/                      ← 9 agentes (@nombre en Copilot Chat)
    │   ├── orchestrator.agent.md
    │   ├── spec-generator.agent.md
    │   ├── backend-developer.agent.md
    │   ├── frontend-developer.agent.md
    │   ├── database.agent.md
    │   ├── test-engineer-backend.agent.md
    │   ├── test-engineer-frontend.agent.md
    │   ├── qa.agent.md
    │   └── documentation.agent.md
    │
    ├── skills/                      ← 9 skills (/comando en Copilot Chat)
    │   ├── asdd-orchestrate/
    │   ├── generate-spec/
    │   ├── implement-backend/
    │   ├── implement-frontend/
    │   ├── unit-testing/
    │   ├── gherkin-case-generator/
    │   ├── risk-identifier/
    │   ├── automation-flow-proposer/
    │   └── performance-analyzer/
    │
    ├── docs/lineamientos/           ← guidelines del framework
    │   ├── dev-guidelines.md
    │   └── qa-guidelines.md
    │
    ├── prompts/                     ← 8 prompts (/nombre en Copilot Chat)
    │
    ├── instructions/                ← aplicadas automáticamente por contexto de archivo
    │   ├── backend.instructions.md  ← applyTo: apps/backend/src/**/*.cs
    │   ├── frontend.instructions.md ← applyTo: apps/frontend/src/**/*
    │   └── tests.instructions.md    ← applyTo: apps/backend/src/Tests/** y apps/frontend/test/**
    │
    ├── requirements/                ← requerimientos de negocio (input del pipeline)
    │   └── <feature>.md
    │
    └── specs/                       ← specs técnicas (fuente de verdad)
        └── <feature>.spec.md        ← DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED
```

---

## Reglas de Oro

1. **No código sin spec aprobada** — siempre debe existir `specs/<feature>.spec.md` con estado `APPROVED`.
2. **No código no autorizado** — los agentes no generan ni modifican código sin instrucción explícita.
3. **No suposiciones** — si el requerimiento es ambiguo, el agente pregunta antes de actuar.
4. **Transparencia** — el agente explica qué va a hacer antes de hacerlo.
