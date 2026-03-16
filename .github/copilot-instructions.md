# Copilot Instructions

## ASDD Workflow (Agent Spec Software Development)

Este repositorio sigue el flujo **ASDD**: toda funcionalidad nueva se ejecuta en cuatro fases orquestadas por agentes especializados.

```
[Orchestrator] → [Spec Generator] → [Backend ∥ Frontend ∥ DB] → [Tests BE ∥ Tests FE] → [QA] → [Doc]
```

### Fases del flujo ASDD
1. **Spec**: El agente `spec-generator` genera la spec en `.github/specs/<feature>.spec.md`.
2. **Implementación (paralelo)**: `backend-developer` + `frontend-developer` + `database-agent` (si hay cambios de DB).
3. **Tests (paralelo)**: `test-engineer-backend` + `test-engineer-frontend`.
4. **QA**: `qa-agent` genera estrategia, Gherkin, riesgos y análisis de performance.
5. **Doc (opcional)**: `documentation-agent` genera README updates, API docs y ADRs.

### Skills disponibles (slash commands):
- `/asdd-orchestrate` — orquesta el flujo completo ASDD o consulta estado
- `/generate-spec` — genera spec técnica en `.github/specs/`
- `/implement-backend` — implementa feature completo en el backend
- `/implement-frontend` — implementa feature completo en el frontend
- `/unit-testing` — genera suite de tests (backend + frontend)
- `/gherkin-case-generator` — casos Given-When-Then + datos de prueba
- `/risk-identifier` — clasificación de riesgos ASD (Alto/Medio/Bajo)
- `/automation-flow-proposer` — propuesta de automatización con ROI
- `/performance-analyzer` — planificación de pruebas de performance

### Requerimientos y Specs
- Los requerimientos de negocio viven en `.github/requirements/`. Son la entrada al pipeline ASDD.
- Las specs técnicas viven en `.github/specs/`. Cada spec es la fuente de verdad para implementar.
- Antes de implementar cualquier desarrollo, debe existir una spec aprobada en `.github/specs/`.
- Flujo: `requirements/<feature>.md` → `/generate-spec` → `specs/<feature>.spec.md` (APPROVED)

---

## Mapa de Archivos ASDD

### Agentes
| Agente | Fase | Ruta |
|---|---|---|
| Orchestrator | Entry point | `.github/agents/orchestrator.agent.md` |
| Spec Generator | Fase 1 | `.github/agents/spec-generator.agent.md` |
| Backend Developer | Fase 2 | `.github/agents/backend-developer.agent.md` |
| Frontend Developer | Fase 2 | `.github/agents/frontend-developer.agent.md` |
| Database Agent | Fase 2 | `.github/agents/database.agent.md` |
| Test Engineer Backend | Fase 3 | `.github/agents/test-engineer-backend.agent.md` |
| Test Engineer Frontend | Fase 3 | `.github/agents/test-engineer-frontend.agent.md` |
| QA Agent | Fase 4 | `.github/agents/qa.agent.md` |
| Documentation Agent | Fase 5 | `.github/agents/documentation.agent.md` |

### Skills
| Skill | Agente | Ruta |
|---|---|---|
| `/asdd-orchestrate` | Orchestrator | `.github/skills/asdd-orchestrate/SKILL.md` |
| `/generate-spec` | Spec Generator | `.github/skills/generate-spec/SKILL.md` |
| `/implement-backend` | Backend Developer | `.github/skills/implement-backend/SKILL.md` |
| `/implement-frontend` | Frontend Developer | `.github/skills/implement-frontend/SKILL.md` |
| `/unit-testing` | Test Engineer Backend + Frontend | `.github/skills/unit-testing/SKILL.md` |
| `/gherkin-case-generator` | QA Agent | `.github/skills/gherkin-case-generator/SKILL.md` |
| `/risk-identifier` | QA Agent | `.github/skills/risk-identifier/SKILL.md` |
| `/automation-flow-proposer` | QA Agent | `.github/skills/automation-flow-proposer/SKILL.md` |
| `/performance-analyzer` | QA Agent | `.github/skills/performance-analyzer/SKILL.md` |

### Instructions (path-scoped)
| Scope | Ruta | Se aplica a |
|---|---|---|
| Backend | `.github/instructions/backend.instructions.md` | `apps/backend/src/**/*.cs` |
| Frontend | `.github/instructions/frontend.instructions.md` | `apps/frontend/src/**/*.{ts,tsx,js,jsx}` |
| Tests | `.github/instructions/tests.instructions.md` | `apps/backend/src/Tests/**/*.cs` · `apps/frontend/test/**/*` |

### Lineamientos y Contexto
| Documento | Ruta |
|---|---|
| Lineamientos de Desarrollo | `.github/docs/lineamientos/dev-guidelines.md` |
| Lineamientos QA | `.github/docs/lineamientos/qa-guidelines.md` |
| Stack + Arquitectura + Naming | `.github/instructions/backend.instructions.md` |
| Stack Frontend + Naming | `.github/instructions/frontend.instructions.md` |
| Arquitectura Backend | `apps/backend/README.md` |
| Arquitectura Frontend | `apps/frontend/README.md` |

### Lineamientos generales para todos los agentes
- **Reglas de Oro**: ver `.github/AGENTS.md` — rigen TODAS las interacciones.
- **Specs activas**: `.github/specs/` — consultar siempre antes de implementar.

---

## Reglas de Oro

> Principio rector: todas las contribuciones de la IA deben ser seguras, transparentes, con propósito definido y alineadas con las instrucciones explícitas del usuario.

### I. Integridad del Código y del Sistema
- **No código no autorizado**: no escribir, generar ni sugerir código nuevo a menos que el usuario lo solicite explícitamente.
- **No modificaciones no autorizadas**: no modificar, refactorizar ni eliminar código, archivos o estructuras existentes sin aprobación explícita.
- **Preservar la lógica existente**: respetar los patrones arquitectónicos, el estilo de codificación y la lógica operativa existentes del proyecto.

### II. Clarificación de Requisitos
- **Clarificación obligatoria**: si la solicitud es ambigua, incompleta o poco clara, detenerse y solicitar clarificación antes de proceder.
- **No realizar suposiciones**: basar todas las acciones estrictamente en información explícita provista por el usuario.

### III. Transparencia Operativa
- **Explicar antes de actuar**: antes de cualquier acción, explicar qué se hará y posibles implicaciones.
- **Detención ante la incertidumbre**: si surge inseguridad o conflicto con estas reglas, detenerse y consultar al usuario.
- **Acciones orientadas a un propósito**: cada acción debe ser directamente relevante para la solicitud explícita.

---

## Diccionario de Dominio

Términos canónicos a usar en specs, código y mensajes:

| Término | Definición | Sinónimos rechazados |
|---------|-----------|---------------------|
| **Paciente** (`patient`) | Persona registrada para ser atendida | Cliente, usuario final |
| **Turno** (`queue`) | Cola o flujo de atencion asignado al Paciente | Fila genérica |
| **Consultorio** (`consulting room`) | Sala de atencion medica habilitada | Box, modulo |
| **Recepcionista** | Rol que registra pacientes y gestiona ingreso | Operador |
| **Cajero** | Rol que valida pago y llama siguiente paciente | Caja, pago |
| **Doctor** | Rol que inicia y finaliza la consulta | Medico tratante |
| **Dashboard** | Pantalla principal con métricas (solo lectura) | Inicio |
| **Administrador** | Rol con permisos completos | Superusuario |
| `queueId` | Identificador de la cola de atencion | Fila, ticket |
| `patientId` | Identificador del paciente | ID técnico ambiguo |
| `created_at` | Timestamp de creación en UTC | Fecha alta |
| `updated_at` | Timestamp de última actualización en UTC | Fecha modificación |

**Reglas:** usar la terminologia operacional de RLAPP. `Dashboard` es solo lectura. Timestamps en snake_case cuando existan en contratos o persistencia.

---

## Project Overview

> Ver `README.md` en la raíz del proyecto.
