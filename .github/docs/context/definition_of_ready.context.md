# Definition of Ready (DoR) del Proyecto

## Propósito

Este documento define las condiciones mínimas que una historia de usuario debe cumplir **antes de entrar a desarrollo** en el contexto del proyecto **Catálogo de Productos**.

Su objetivo es asegurar que el equipo reciba historias claras, estimables, implementables en un sprint y alineadas con dominio, arquitectura y stack aprobados.

---

## Alcance

Aplica a todas las historias funcionales del backlog del contexto **Catálogo de Productos**.

El DoR se valida en refinamiento y planificación. Si una historia no cumple los criterios obligatorios, debe volver a refinamiento.

---

## 1) Criterios de negocio y semántica (obligatorios)

Una historia está Ready cuando:

1. Usa estructura completa **Como / Quiero / Para que**.
2. Usa exclusivamente términos canónicos del diccionario de dominio vigente.
3. El rol está definido de forma unívoca (sin combinaciones ambiguas como "Usuario del Sistema (o Administrador)").
4. El valor de negocio es claro y verificable (sin términos subjetivos como "rápido", "preciso", "correctamente" sin métrica).
5. No contiene términos ambiguos sin operacionalizar (por ejemplo: "completo", "disponible", "gestionar").

---

## 2) Criterios de aceptación (BDD) (obligatorios)

1. Incluye criterios en formato **Dado / Cuando / Entonces**.
2. Cubre al menos:
   - escenario feliz,
   - validaciones de entrada,
   - escenario de no encontrado o conflicto (según aplique),
   - error técnico controlado cuando sea relevante para el endpoint.
3. Cada criterio es testeable y tiene resultado observable (estado HTTP, estructura de respuesta, mensaje/error esperado).
4. No deja decisiones abiertas de comportamiento (ejemplo: elegir entre `409` o `400` para el mismo caso sin regla explícita).

---

## 3) Contrato API y reglas funcionales (obligatorios para historias API)

1. Endpoint definido con método y ruta versionada (`/api/v1/...`).
2. Request explícito: campos obligatorios, tipos y reglas de validación.
3. Response explícito: estructura JSON de éxito con campos definidos (evitar "objeto completo" sin contrato).
4. Códigos HTTP definidos y coherentes con el estándar del proyecto (`200`, `201`, `400`, `404`, `409`, `500` según caso).
5. Estructura de error acordada (mensaje general y detalle por campo cuando aplique).
6. Comportamiento ante valores inválidos y duplicados especificado (ejemplo: unicidad de `code`, rango de `price`).

---

## 4) Alineación técnica y arquitectónica (obligatorios)

1. La historia pertenece a un único bounded context o justifica explícitamente cruces.
2. Encaja en la estructura por capas del módulo:
   - `product-api`
   - `product-application`
   - `product-domain`
   - `product-infrastructure`
3. Respeta restricciones del stack aprobado:
   - Java 21, Spring Boot 3.x,
   - Spring WebFlux + Reactor,
   - Spring Data R2DBC + PostgreSQL 15+.
4. No exige tecnologías no homologadas ni mezcla de acceso bloqueante/reactivo.
5. El impacto estructural esperado no supera el umbral de dispersión (máximo 3 features/módulos independientes).

---

## 5) Criterios de preparación para ejecución (obligatorios)

1. La historia cumple INVEST de forma explícita (especialmente **Estimable**, **Small** y **Testeable**).
2. Dependencias críticas están identificadas (técnicas, de datos, de negocio, de otros equipos/historias).
3. Riesgos principales están identificados con mitigación inicial.
4. Tiene criterio de estimación posible por el equipo (sin supuestos críticos no resueltos).
5. Existe acuerdo de alcance (qué incluye / qué no incluye en el sprint).

---

## 6) Artefactos mínimos requeridos para declarar Ready

Antes de pasar a desarrollo, debe existir:

- [ ] Historia refinada y actualizada en `docs/requirements`.
- [ ] Terminología validada contra `business_domain_dictionary.context.md`.
- [ ] Criterios BDD completos y verificables.
- [ ] Contrato API explícito (request/response/errores) cuando aplique.
- [ ] Validaciones de negocio críticas definidas (ej. unicidad `code`, rango de `price`).
- [ ] Impacto arquitectónico identificado (módulos/capas afectadas).
- [ ] Dependencias y riesgos documentados.
- [ ] Aceptación del equipo en sesión de refinamiento/planning.

---

## 7) Reglas de decisión Ready / Not Ready

### Ready

Una historia es **Ready** cuando cumple todos los criterios obligatorios de este documento y no tiene ambigüedades críticas abiertas.

### Not Ready

Una historia es **Not Ready** cuando presenta al menos una de estas condiciones:

1. Rol o términos no canónicos/no definidos en diccionario.
2. Criterios BDD incompletos o no testeables.
3. Contrato API ambiguo o incompleto.
4. Decisiones funcionales clave pendientes (códigos HTTP, estructura de error, validaciones).
5. Dependencias críticas sin resolver o sin plan.

---

## 8) Relación DoR vs DoD

- **DoR**: controla la calidad de entrada al desarrollo.
- **DoD**: controla la calidad de salida al terminar la implementación.

Una historia puede iniciar desarrollo solo si está **Ready**, y solo puede cerrarse si está **Done**.
