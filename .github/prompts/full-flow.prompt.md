---
description: 'Orquesta el flujo completo ASDD: Spec → [Backend ∥ Frontend ∥ DB] → [Tests Backend ∥ Tests Frontend] → QA → DOC (opcional). Requiere un requerimiento de negocio como input.'
agent: Orchestrator
---

Inicia el flujo completo ASDD con paralelismo máximo.

**Feature**: ${input:featureName:nombre del feature en kebab-case}
**Requerimiento**: ${input:requirement:descripción funcional del feature}

**El @Orchestrator ejecuta automáticamente:**

1. **[FASE 1 — Secuencial]** `Spec Generator` → genera `.github/specs/${input:featureName}.spec.md`
2. **[FASE 2 — Paralelo]** al aprobar la spec:
   - `Backend Developer` → implementa `apps/backend/src/`
   - `Frontend Developer` → implementa `apps/frontend/src/`
   - `Database Agent` → si hay cambios de esquema en la spec
3. **[FASE 3 — Paralelo]** al completar implementación:
   - `Test Engineer Backend` → genera `apps/backend/src/Tests/`
   - `Test Engineer Frontend` → genera `apps/frontend/test/`
4. **[FASE 4]** `QA Agent` → estrategia, Gherkin, riesgos, automatización
5. **[FASE 5 — Opcional]** `Documentation Agent` → si el usuario lo solicita

**El requerimiento se puede buscar también en** `.github/requirements/`.
