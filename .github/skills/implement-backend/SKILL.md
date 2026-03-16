---
name: implement-backend
description: Implementa un feature completo en el backend. Requiere spec con status APPROVED en .github/specs/.
argument-hint: "<nombre-feature>"
---

# Implement Backend

## Prerequisitos
1. Leer spec: `.github/specs/<feature>.spec.md` — sección 2 (modelos, endpoints)
2. Leer stack: `.github/instructions/backend.instructions.md`
3. Leer arquitectura: `apps/backend/README.md`

## Orden de implementación
```
DTOs/Commands -> Handlers -> Domain -> Infrastructure/Projections -> API wiring
```

| Capa | Responsabilidad |
|------|-----------------|
| **DTOs / Commands** | Contratos de entrada y salida |
| **Handlers** | Orquestacion del caso de uso |
| **Domain** | Invariantes, aggregate, eventos |
| **API / Endpoints** | HTTP mapping, DI, filtros, middlewares |

## Patron de DI
- Registrar e inyectar dependencias via `WaitingRoom.API/Program.cs`.
- Seguir el patron actual de Minimal API + handler + filtros por rol.

## Reglas
Ver `.github/instructions/backend.instructions.md` — async, naming, errores, timestamps.

## Restricciones
- Solo `apps/backend/`. No tocar frontend.
- No generar tests (responsabilidad de `test-engineer-backend`).
