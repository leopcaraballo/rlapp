---
name: backend-task
description: Implementa una funcionalidad en el backend .NET basada en una spec ASDD aprobada.
argument-hint: "<nombre-feature> (debe existir .github/specs/<nombre-feature>.spec.md)"
agent: Backend Developer
tools:
  - edit/createFile
  - edit/editFiles
  - read/readFile
  - search/listDirectory
  - search
  - execute/runInTerminal
---

Implementa el backend para el feature especificado, siguiendo la spec aprobada.

**Feature**: ${input:featureName:nombre del feature en kebab-case}

## Pasos obligatorios:

1. **Lee la spec** en `.github/specs/${input:featureName:nombre-feature}.spec.md` — si no existe, detente e informa al usuario.
2. **Revisa el código existente** en `apps/backend/src/` para entender patrones actuales.
3. **Implementa en orden**:
  - `WaitingRoom.Application/DTOs|Commands|CommandHandlers` — contratos y caso de uso
  - `WaitingRoom.Domain/` — aggregate, invariantes y eventos
  - `WaitingRoom.Infrastructure/` — persistencia, proyecciones o integraciones
  - `WaitingRoom.API/` — endpoints, filtros, middlewares y DI
4. **Registra el wiring** en `apps/backend/src/Services/WaitingRoom/WaitingRoom.API/Program.cs` si aplica.
5. **Verifica compilacion o tests relevantes** con `dotnet test` sobre el proyecto o solucion correspondiente.

## Restricciones:
- Respetar Event Sourcing, CQRS y los contratos existentes.
- No introducir capas o patrones ajenos al backend actual.
- Mantener operaciones asincronas cuando el contrato existente lo requiera.
