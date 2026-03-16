---
name: implement-frontend
description: Implementa un feature completo en el frontend. Requiere spec con status APPROVED en .github/specs/.
argument-hint: "<nombre-feature>"
---

# Implement Frontend

## Prerequisitos
1. Leer spec: `.github/specs/<feature>.spec.md` — sección 2.3 (componentes, páginas, hooks)
2. Leer stack: `.github/instructions/frontend.instructions.md`
3. Leer arquitectura: `apps/frontend/README.md`

## Orden de implementación
```
services -> application/hooks -> components -> app routes
```

| Capa | Responsabilidad |
|------|-----------------|
| **Services** | Llamadas HTTP, SignalR y adaptadores de infraestructura |
| **Application / Hooks** | Casos de uso de UI, estado, efectos, acciones |
| **Components** | UI reutilizable alineada a App Router |
| **App Routes** | Pantallas en `src/app/**` con layout y navigation |

## Patrones obligatorios
- Respetar App Router y la organización actual en `src/app`, `src/components`, `src/application`, `src/infrastructure`.
- Variables de entorno: usar solo `NEXT_PUBLIC_*` cuando el valor deba exponerse al cliente.
- No hardcodear URLs del backend ni credenciales.
- Seguir los patrones ya existentes de componentes cliente/servidor.

Ver patrones específicos en `.github/instructions/frontend.instructions.md`.

## Restricciones
- Solo `apps/frontend/`. No tocar backend.
- No generar tests (responsabilidad de `test-engineer-frontend`).
