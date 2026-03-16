# Índice Documental de RLAPP

Este índice resume la documentación vigente del repositorio y apunta a las fuentes que hoy reflejan el estado real del proyecto.

## Documentos base

| Archivo | Propósito |
|---|---|
| `README.md` | Vista general del sistema y acceso a la documentación principal |
| `ARCHITECTURE.md` | Mapa del monorepo y sus componentes activos |
| `.github/README.md` | Guía operativa del framework ASDD/Copilot activo |
| `.github/copilot-instructions.md` | Flujo ASDD, diccionario de dominio y reglas de operación |

## Contexto y decisiones

| Archivo | Propósito |
|---|---|
| `docs/decisions/PROJECT_CONTEXT.md` | Contexto del proyecto, stack y estructura real del repo |
| `docs/decisions/RULES.md` | Reglas operativas del framework documental y de trabajo |
| `docs/decisions/WORKFLOW.md` | Flujo operativo de trabajo con el framework activo |
| `docs/decisions/SKILL_REGISTRY.md` | Registro manual de agentes y skills activas en `.github` |

## Lineamientos

| Archivo | Propósito |
|---|---|
| `docs/guidelines/guidelines.md` | Estándares generales del proyecto |
| `docs/guidelines/dev-guidelines.md` | Lineamientos de desarrollo y arquitectura |
| `docs/guidelines/qa-guidelines.md` | Lineamientos de calidad, pruebas y QA |
| `docs/guidelines/reglas-de-oro.md` | Reglas operativas de colaboración con IA |
| `docs/guidelines/definition_of_ready.context.md` | Criterios de entrada para trabajo implementable |
| `docs/guidelines/definition_of_done.context.md` | Criterios de salida y cierre de trabajo |

## Arquitectura y auditorías

| Archivo | Propósito |
|---|---|
| `docs/architecture/README.md` | Punto de entrada de documentación arquitectónica vigente |
| `docs/audits/AUDITORIA_TECNICA_2026-02-27.md` | Auditoría técnica base del estado arquitectónico |
| `docs/audits/REPORTE_FINAL_VALIDACION_2026-03-01.md` | Validación integral del sistema |
| `docs/audits/REPORTE_HARDENING_FINAL_CLINICO.md` | Evidencia de hardening técnico y clínico |
| `docs/audits/GOBERNANZA_DOCUMENTAL_2026-02-27.md` | Registro de limpieza y convergencia documental |

## Testing y QA

| Archivo | Propósito |
|---|---|
| `docs/testing/TEST_PLAN.md` | Plan maestro de pruebas |
| `docs/testing/TESTING_STRATEGY.md` | Estrategia multinivel de pruebas |
| `docs/testing/QA_STRATEGY.md` | Estrategia QA complementaria |
| `docs/testing/TEST_CASES_AI.md` | Casos de prueba generados y refinados para flujos clave |
| `docs/testing/TEMPLATE_EVIDENCIA_TDD_PR.md` | Plantilla para evidenciar ciclos TDD en PRs |

## Reportes y trazabilidad

| Archivo | Propósito |
|---|---|
| `docs/AI_WORKFLOW.md` | Trazabilidad histórica de colaboración humano-IA |
| `docs/DEBT_REPORT.md` | Registro de deuda técnica y remediaciones |
| `docs/HISTORIAS_DE_USUARIO.md` | Historias de usuario consolidadas |
| `docs/USER_STORIES_REFINEMENT.md` | Refinamiento de criterios de aceptación y reglas |
| `docs/reports/` | Reportes técnicos, auditorías extendidas y material de validación |

## Framework activo

El framework operativo de agentes, skills, prompts e instrucciones vive en `.github/`.

| Ruta | Contenido |
|---|---|
| `.github/agents/` | Agentes ASDD activos |
| `.github/skills/` | Skills activas del framework |
| `.github/prompts/` | Prompts operativos |
| `.github/instructions/` | Instrucciones path-scoped para backend, frontend y tests |
| `.github/specs/` | Specs técnicas generadas y aprobadas |

## Nota de vigencia

- Este índice reemplaza al inventario legacy del pipeline GAIDD y de las skills antiguas eliminadas.
- Si cambian la estructura del repositorio o el framework `.github`, actualiza este archivo junto con `ARCHITECTURE.md`, `docs/decisions/PROJECT_CONTEXT.md` y `docs/decisions/SKILL_REGISTRY.md`.
