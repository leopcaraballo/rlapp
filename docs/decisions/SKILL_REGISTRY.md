# Context: Skill registry

> Registro manual del framework ASDD activo. La fuente operativa es `.github/`.

## Agentes activos

| Agente | Ruta | Uso principal |
|---|---|---|
| `Orchestrator` | `.github/agents/orchestrator.agent.md` | Coordina el flujo ASDD completo |
| `Spec Generator` | `.github/agents/spec-generator.agent.md` | Genera y valida specs técnicas |
| `Backend Developer` | `.github/agents/backend-developer.agent.md` | Implementa funcionalidades backend |
| `Frontend Developer` | `.github/agents/frontend-developer.agent.md` | Implementa funcionalidades frontend |
| `Database Agent` | `.github/agents/database.agent.md` | Diseña modelo de datos, migraciones y seeders |
| `Test Engineer Backend` | `.github/agents/test-engineer-backend.agent.md` | Genera pruebas backend |
| `Test Engineer Frontend` | `.github/agents/test-engineer-frontend.agent.md` | Genera pruebas frontend |
| `QA Agent` | `.github/agents/qa.agent.md` | Gherkin, riesgos y performance |
| `Documentation Agent` | `.github/agents/documentation.agent.md` | Documentación técnica y ADRs |

## Skills activas

| Skill | Ruta | Cuándo usarla |
|---|---|---|
| `asdd-orchestrate` | `.github/skills/asdd-orchestrate/SKILL.md` | Orquestar el flujo ASDD o consultar estado |
| `generate-spec` | `.github/skills/generate-spec/SKILL.md` | Crear una spec técnica antes de implementar |
| `implement-backend` | `.github/skills/implement-backend/SKILL.md` | Implementar una spec aprobada en backend |
| `implement-frontend` | `.github/skills/implement-frontend/SKILL.md` | Implementar una spec aprobada en frontend |
| `unit-testing` | `.github/skills/unit-testing/SKILL.md` | Generar pruebas backend y frontend |
| `gherkin-case-generator` | `.github/skills/gherkin-case-generator/SKILL.md` | Producir escenarios Given-When-Then |
| `risk-identifier` | `.github/skills/risk-identifier/SKILL.md` | Clasificar riesgos de calidad ASD |
| `automation-flow-proposer` | `.github/skills/automation-flow-proposer/SKILL.md` | Priorizar automatización por ROI |
| `performance-analyzer` | `.github/skills/performance-analyzer/SKILL.md` | Definir estrategia de performance testing |

## Nota operativa

- La carpeta legacy `tools/automation/skills` fue retirada por duplicar capacidades ya cubiertas en `.github/skills`.
- Si el framework ASDD cambia, actualiza este archivo junto con `.github/README.md` y `.github/copilot-instructions.md`.
