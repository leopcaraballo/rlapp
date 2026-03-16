---
name: generate-tests
description: Genera pruebas para backend y/o frontend en paralelo, basadas en la spec ASDD y el código implementado.
argument-hint: "<nombre-feature> [--backend] [--frontend] (por defecto genera ambos en paralelo)"
agent: Orchestrator
tools:
  - edit/createFile
  - edit/editFiles
  - read/readFile
  - search/listDirectory
  - search
  - execute/runInTerminal
---

Genera pruebas unitarias completas para el feature especificado.

**Feature**: ${input:featureName:nombre del feature en kebab-case}
**Scope**: ${input:scope:backend, frontend, o ambos en paralelo (default)}

## Pasos obligatorios:

1. **Lee la spec** en `.github/specs/${input:featureName:nombre-feature}.spec.md` — sección "Plan de Pruebas Unitarias".
2. **Si scope es "ambos"**: lanza en paralelo `Test Engineer Backend` + `Test Engineer Frontend`.
3. **Si scope es "backend"**: delega a `Test Engineer Backend`:
   - `apps/backend/src/Tests/WaitingRoom.Tests.Domain/...`
   - `apps/backend/src/Tests/WaitingRoom.Tests.Application/...`
   - `apps/backend/src/Tests/WaitingRoom.Tests.Integration/...`
4. **Si scope es "frontend"**: delega a `Test Engineer Frontend`:
   - `apps/frontend/test/components/[Feature].test.tsx`
   - `apps/frontend/test/hooks/use[Feature].test.tsx`
   - `apps/frontend/test/e2e/[feature].spec.ts`
5. **Verifica** que los tests corren:
   - Backend: `cd apps/backend && dotnet test RLAPP.slnx --configuration Release --verbosity minimal`
   - Frontend: `cd apps/frontend && npm test -- --runInBand`

## Cobertura obligatoria por test:
- ✅ Happy path (flujo exitoso)
- ❌ Error path (excepciones, errores de red, datos inválidos)
- 🔲 Edge cases (campos vacíos, duplicados, permisos)

## Restricciones:
- Cada test debe ser independiente (no compartir estado).
- Mockear dependencias externas cuando la suite no sea de integracion real.
- Para backend: usar xUnit + Moq + FluentAssertions siguiendo la suite existente.
- Para frontend: usar Jest + Testing Library; usar Playwright solo si la spec requiere flujo navegador.
