# Architecture Decision Records (ADRs) del Proyecto

## Propósito

Este documento resume las decisiones arquitectónicas relevantes del proyecto, indicando su estado y vigencia para evitar contradicciones en análisis e implementación.

---

## Estados permitidos

- **Activa**: decisión vigente y obligatoria.
- **Obsoleta**: reemplazada por una decisión posterior.
- **En evaluación**: propuesta aún no adoptada.

---

## Registro de decisiones

| ID      | Decisión                                                                              | Estado   | Fecha      | Reemplaza                         |
| ------- | ------------------------------------------------------------------------------------- | -------- | ---------- | --------------------------------- |
| ADR-001 | Arquitectura por capas por feature (`API`, `Application`, `Domain`, `Infrastructure`) | Activa   | 2026-02-18 | —                                 |
| ADR-002 | Backend principal con .NET 10, Minimal API, Event Sourcing y CQRS                     | Activa   | 2026-02-18 | —                                 |
| ADR-003 | API REST JSON versionada por ruta (`/api/v1/...`)                                     | Activa   | 2026-02-18 | —                                 |
| ADR-004 | Límite de dispersión por historia: máximo 3 módulos/features independientes           | Activa   | 2026-02-18 | —                                 |
| ADR-005 | Prohibición de mezclar flujos clínicos del aggregate con atajos de infraestructura     | Activa   | 2026-02-18 | —                                 |
| ADR-006 | Persistencia reactiva Spring/JPA como base del backend                                 | Obsoleta | 2026-02-18 | Reemplazada por ADR-002 y ADR-005 |

---

## Detalle de ADRs activos

### ADR-001: Arquitectura por capas por feature

#### Contexto

Se requiere mantener separadas responsabilidades de transporte, negocio, dominio e infraestructura para mejorar mantenibilidad y testabilidad.

#### Decisión

Adoptar estructura por capas dentro de cada módulo funcional:

- `API`
- `Application`
- `Domain`
- `Infrastructure`

#### Consecuencias

- Facilita cambios aislados por responsabilidad.
- Reduce acoplamiento entre detalles técnicos y reglas de negocio.

---

### ADR-002: Backend .NET con Event Sourcing y CQRS

#### Contexto

El proyecto requiere trazabilidad clínica, consistencia de reglas del dominio y capacidad de reproyección sobre eventos persistidos.

#### Decisión

Adoptar .NET 10 con ASP.NET Core Minimal API, Event Sourcing, CQRS y Outbox Pattern como base del backend operativo.

#### Consecuencias

- La mutación del estado clínico queda centralizada en aggregates y eventos de dominio.
- La lectura puede evolucionar mediante proyecciones sin romper el flujo transaccional principal.

---

### ADR-003: Versionado de API por ruta

#### Contexto

Se necesita evolución controlada de contratos públicos sin ruptura inmediata de consumidores.

#### Decisión

Versionar endpoints por ruta base (`/api/v1/...`).

#### Consecuencias

- Mayor gobernanza en cambios de contrato.
- Facilita compatibilidad progresiva entre versiones.

---

### ADR-004: Umbral de dispersión por historia

#### Contexto

Se observó riesgo de historias sobredimensionadas con cambios excesivamente transversales.

#### Decisión

Establecer umbral máximo de 3 módulos/features independientes impactados por historia.

#### Consecuencias

- Favorece historias pequeñas y estimables.
- Disminuye riesgo de épicas disfrazadas.

---

### ADR-005: Prohibición de atajos que salten el aggregate

#### Contexto

Se observó que escribir estado clínico directamente desde endpoints, proyecciones o adaptadores degrada la trazabilidad y rompe invariantes del dominio.

#### Decisión

Prohibir mutaciones de estado clínico fuera del aggregate y del flujo command -> handler -> event store.

#### Consecuencias

- Mejora la consistencia de reglas clínicas e idempotencia.
- Obliga a modelar correctamente commands, handlers, eventos y proyecciones.

---

## ADRs obsoletos

### ADR-006: Persistencia reactiva Spring/JPA como base del backend

**Estado**: Obsoleta.

#### Motivo de obsolescencia

No representa el stack real del repositorio y fue reemplazada por las decisiones ADR-002 y ADR-005.

---

## Reglas de uso en análisis de requerimientos

1. Ningún análisis puede contradecir ADRs con estado **Activa**.
2. Si un requerimiento exige excepción, debe proponerse nuevo ADR o actualización de uno existente.
3. Los ADRs **Obsoletos** se mantienen solo para trazabilidad histórica; no deben usarse como base de diseño.

---

## Plantilla para nuevas decisiones

```markdown
### ADR-XXX: [Título]

**Estado**: En evaluación | Activa | Obsoleta
**Fecha**: YYYY-MM-DD
**Reemplaza**: ADR-YYY (opcional)

**Contexto**
[Problema o tensión arquitectónica]

**Decisión**
[Decisión adoptada]

**Consecuencias**
[Impactos positivos, trade-offs, riesgos]
```
