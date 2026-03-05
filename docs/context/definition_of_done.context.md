# Definition of Done (DoD) del Proyecto

## Propósito

Este documento define los criterios mínimos de calidad y completitud para considerar **terminada** una historia de usuario del proyecto.

Aplica a todo el backlog del contexto **Catálogo de Productos** y debe usarse como acuerdo transversal de equipo para evitar ambigüedades en entrega.

---

## 1) Criterios de negocio y requerimiento

Una historia se considera "Done" cuando:

1. El texto final de la HU usa **términos canónicos** del diccionario de dominio vigente.
2. No contiene términos ambiguos sin operacionalizar (por ejemplo: "rápido", "completo", "disponible") sin criterio verificable.
3. Tiene estructura completa **Como / Quiero / Para que**.
4. Contiene criterios de aceptación en formato **BDD (Dado / Cuando / Entonces)**.
5. Los criterios cubren al menos:
   - escenario feliz,
   - escenario(s) de validación,
   - escenario(s) de no encontrado o conflicto según aplique.

---

## 2) Criterios funcionales de API

Para historias que exponen o modifican API REST:

1. Endpoint definido con versión por ruta (`/api/v1/...`).
2. Contrato de request y response especificado sin usar expresiones abiertas como "objeto completo".
3. Códigos HTTP alineados al estándar del proyecto (`201`, `200`, `400`, `404`, `409`, `500` según aplique).
4. Respuestas de error definidas en formato JSON consistente.
5. Validaciones de entrada cubiertas para campos obligatorios, tipos y reglas de negocio relevantes (por ejemplo unicidad de `code`, rango de `price`).

---

## 3) Criterios técnicos y arquitectura

La implementación se considera "Done" cuando:

1. Respeta el estilo en capas por feature:
   - `product-api`
   - `product-application`
   - `product-domain`
   - `product-infrastructure`
2. Mantiene separación de responsabilidades:
   - el controlador no contiene lógica de negocio compleja,
   - el dominio no depende de infraestructura.
3. Mantiene consistencia reactiva extremo a extremo (WebFlux + Reactor + acceso R2DBC sin mezclas bloqueantes).
4. No introduce tecnologías fuera del stack aprobado.
5. No cruza bounded contexts sin justificación explícita y aprobada.
6. La dispersión estructural está dentro del umbral definido (máximo 3 módulos/features independientes impactados por historia).

---

## 4) Criterios de calidad de código

1. Código compilable y sin errores de build atribuibles a la historia.
2. Nombres de clases, métodos, paquetes y carpetas coherentes con responsabilidad de dominio.
3. Sin antipatrones prohibidos:
   - estado mutable global en singletons,
   - mezcla de acceso bloqueante/reactivo en el mismo caso de uso,
   - exposición de errores internos de infraestructura al consumidor.
4. Manejo de errores consistente con contrato público del API.

---

## 5) Pruebas y validación

Una historia está "Done" cuando:

1. Tiene evidencia de pruebas exitosas para sus criterios de aceptación.
2. Incluye pruebas del caso feliz y de los escenarios de error esperados.
3. Las validaciones de negocio críticas quedan cubiertas por pruebas (ej. duplicado de `code`, datos inválidos).
4. Los cambios no rompen contratos existentes del módulo.

> Nota: el nivel de pruebas (unitarias, integración, contrato/API) se decide por impacto, pero siempre debe existir evidencia verificable en el entregable.

---

## 6) Documentación y trazabilidad

1. La HU refinada y sus criterios finales quedan actualizados antes de cerrar.
2. Si se ajusta el contrato API, el cambio queda documentado en artefactos del proyecto.
3. Queda trazabilidad entre implementación y criterios de aceptación (referencia explícita en PR, checklist o artefacto equivalente del equipo).
4. Se registran decisiones relevantes de diseño cuando afecten futuras historias.

---

## 7) Checklist operacional de cierre

Antes de mover una historia a "Done", validar:

- [ ] Requerimiento semánticamente válido según diccionario de dominio.
- [ ] Criterios BDD completos y verificables.
- [ ] Contrato API explícito (request/response/errores).
- [ ] Implementación alineada con arquitectura por capas y enfoque reactivo.
- [ ] Pruebas ejecutadas con resultado satisfactorio para escenarios clave.
- [ ] Sin antipatrones ni desvíos de stack aprobados.
- [ ] Documentación/artefactos actualizados.
- [ ] Evidencia de revisión técnica del cambio (PR o mecanismo equivalente).

---

## 8) Criterio de salida

Una historia **solo** pasa a estado "Done" cuando **todos** los ítems obligatorios de este documento están cumplidos o existe una excepción explícitamente aprobada y registrada por el equipo.
