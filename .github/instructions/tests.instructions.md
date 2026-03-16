---
applyTo: "apps/backend/src/Tests/**/*.cs,apps/frontend/test/**/*.{ts,tsx,js,jsx}"
---

> Scope: reglas para los tests reales del repositorio RLAPP.

# Instrucciones para Archivos de Pruebas

## Principios

- Independencia: cada test debe poder correr aislado.
- Aislamiento: mockear dependencias externas salvo cuando el test sea explicitamente de integracion contra infraestructura controlada.
- Claridad: nombres descriptivos del comportamiento esperado.
- Cobertura: incluir happy path, errores y edge cases.

## Backend (.NET / xUnit / Moq / FluentAssertions)

### Ubicacion

```
apps/backend/src/Tests/
  WaitingRoom.Tests.Domain/
  WaitingRoom.Tests.Application/
  WaitingRoom.Tests.Integration/
  WaitingRoom.Tests.Projections/
```

### Convenciones

- Usar `[Fact]` y `[Theory]` con nombres tipo `GivenX_WhenY_ThenZ` cuando el modulo ya siga ese patron.
- Usar `Moq` para puertos, stores, publishers y adaptadores.
- Usar `FluentAssertions` para aserciones expresivas.
- Los tests de dominio validan invariantes del aggregate.
- Los tests de aplicacion validan orquestacion, no reimplementan reglas del dominio.

## Frontend (Jest + Testing Library + Playwright)

### Ubicacion

```
apps/frontend/test/
  app/
  components/
  hooks/
  services/
  e2e/
```

### Convenciones

- Tests unitarios e integracion con Jest y Testing Library.
- E2E con Playwright en `test/e2e/`.
- Usar `jest.mock(...)` para modulos externos y limpiar estado entre pruebas.
- Priorizar tests sobre hooks, adapters, pages y flujos criticos ya existentes.

## Nunca hacer

- No depender del orden de ejecucion.
- No dejar `console.log` permanentes.
- No llamar infraestructura real si el test no esta disenado como integracion o E2E.
- No usar esperas arbitrarias si existe polling, matcher async o utilidades del framework.

## Estructura AAA / GWT

Usar comentarios o separacion logica de `Arrange / Act / Assert` o `Given / When / Then` cuando mejore la legibilidad.

> Para estrategia de calidad y automatizacion, ver `.github/docs/lineamientos/qa-guidelines.md`.
