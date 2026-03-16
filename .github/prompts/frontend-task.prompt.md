---
name: frontend-task
description: Implementa una funcionalidad en el frontend Next.js basada en una spec ASDD aprobada.
argument-hint: "<nombre-feature> (debe existir .github/specs/<nombre-feature>.spec.md)"
agent: Frontend Developer
tools:
  - edit/createFile
  - edit/editFiles
  - read/readFile
  - search/listDirectory
  - search
  - execute/runInTerminal
---

Implementa el frontend para el feature especificado, siguiendo la spec aprobada.

**Feature**: ${input:featureName:nombre del feature en kebab-case}

## Pasos obligatorios:

1. **Lee la spec** en `.github/specs/${input:featureName:nombre-feature}.spec.md` — si no existe, detente e informa al usuario.
2. **Revisa el código existente** en `apps/frontend/src/` para entender patrones actuales.
3. **Implementa en orden**:
  - `apps/frontend/src/services/` o `src/infrastructure/` — acceso a API o SignalR
  - `apps/frontend/src/application/` o `src/hooks/` — estado y casos de uso de UI
  - `apps/frontend/src/components/` — componentes reutilizables
  - `apps/frontend/src/app/` — rutas App Router, layouts o paginas
4. **Registra la navegacion o ruta** dentro de `src/app/` siguiendo App Router.
5. **Verifica** el build o tests relevantes: `cd apps/frontend && npm test -- --runInBand` o `npm run build`

## Restricciones:
- Respetar la arquitectura y estilos existentes del frontend.
- Las variables de entorno expuestas al cliente deben usar prefijo `NEXT_PUBLIC_`.
- No asumir React Router ni `App.jsx`; el proyecto usa Next.js App Router.
- Mantener compatibilidad con componentes cliente/servidor segun el arbol actual.
