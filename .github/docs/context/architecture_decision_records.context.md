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
| ADR-001 | Arquitectura por capas por feature (`api`, `application`, `domain`, `infrastructure`) | Activa   | 2026-02-18 | —                                 |
| ADR-002 | Backend reactivo con Spring WebFlux + Reactor + R2DBC                                 | Activa   | 2026-02-18 | —                                 |
| ADR-003 | API REST JSON versionada por ruta (`/api/v1/...`)                                     | Activa   | 2026-02-18 | —                                 |
| ADR-004 | Límite de dispersión por historia: máximo 3 módulos/features independientes           | Activa   | 2026-02-18 | —                                 |
| ADR-005 | Prohibición de mezcla bloqueante/reactiva en un mismo caso de uso                     | Activa   | 2026-02-18 | —                                 |
| ADR-006 | Uso de JPA/Hibernate bloqueante en módulos WebFlux                                    | Obsoleta | 2026-02-18 | Reemplazada por ADR-002 y ADR-005 |

---

## Detalle de ADRs activos

### ADR-001: Arquitectura por capas por feature

#### Contexto

Se requiere mantener separadas responsabilidades de transporte, negocio, dominio e infraestructura para mejorar mantenibilidad y testabilidad.

#### Decisión

Adoptar estructura por capas dentro de cada módulo funcional:

- `api`
- `application`
- `domain`
- `infrastructure`

#### Consecuencias

- Facilita cambios aislados por responsabilidad.
- Reduce acoplamiento entre detalles técnicos y reglas de negocio.

---

### ADR-002: Backend reactivo end-to-end

#### Contexto

El proyecto prioriza consistencia reactiva para operaciones de catálogo y escalabilidad del backend.

#### Decisión

Adoptar Spring WebFlux + Reactor + Spring Data R2DBC en toda la cadena de ejecución.

#### Consecuencias

- Se evita bloqueo en flujos de entrada/salida.
- Obliga disciplina técnica para no introducir componentes bloqueantes.

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

### ADR-005: Prohibición de mezcla bloqueante/reactiva

#### Contexto

La mezcla de llamadas bloqueantes en flujos reactivos degrada rendimiento y genera comportamientos no deseados.

#### Decisión

Prohibir componentes bloqueantes en casos de uso reactivos del backend.

#### Consecuencias

- Mejor consistencia operativa del modelo reactivo.
- Requiere validar librerías/adaptadores antes de adopción.

---

## ADRs obsoletos

### ADR-006: Uso de JPA/Hibernate en módulos WebFlux

**Estado**: Obsoleta.

#### Motivo de obsolescencia

Contradice el enfoque reactivo end-to-end y fue reemplazada por las decisiones ADR-002 y ADR-005.

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
