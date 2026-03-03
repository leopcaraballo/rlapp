# Estándares de Arquitectura del Proyecto

## Propósito

Este documento define los **patrones arquitectónicos aprobados**, los **antipatrones prohibidos**, los principios de **acoplamiento/cohesión** y las decisiones de diseño vigentes para el proyecto.

Debe usarse como referencia obligatoria durante análisis, refinamiento e implementación de historias.

---

## 1) Patrones arquitectónicos aprobados

1. Arquitectura por capas dentro de cada feature:
   - `api`
   - `application`
   - `domain`
   - `infrastructure`
2. Diseño por bounded context (separación explícita de dominios).
3. Backend reactivo end-to-end:
   - Spring WebFlux + Reactor
   - Persistencia reactiva con R2DBC
4. Enfoque por casos de uso en capa `application`.
5. Contratos API versionados por ruta (`/api/v1/...`).

---

## 2) Reglas de responsabilidad por capa

### `api`

- Orquesta request/response HTTP.
- Valida formato de entrada y delega en `application`.
- No contiene reglas de negocio complejas.

### `application`

- Implementa casos de uso y orquestación de reglas.
- Coordina acceso a puertos/repositorios.
- No contiene detalles técnicos de infraestructura.

### `domain`

- Define entidades, value objects y reglas del negocio.
- Es independiente de frameworks y tecnologías externas.

### `infrastructure`

- Implementa adaptadores técnicos (persistencia, integraciones).
- No define reglas de negocio; solo detalles de implementación.

---

## 3) Principios de acoplamiento y cohesión

1. **Dependencia hacia adentro**: `api` -> `application` -> `domain`.
2. **Dominio aislado**: `domain` no depende de `infrastructure` ni de componentes web.
3. **Bajo acoplamiento entre contextos**: evitar dependencias directas entre bounded contexts.
4. **Alta cohesión por feature**: una historia debe concentrar cambios en un módulo funcional principal.
5. **Contratos explícitos**: integración entre capas mediante interfaces/puertos claros.

---

## 4) Antipatrones prohibidos

1. Lógica de negocio compleja en controladores.
2. Mezcla de programación bloqueante y reactiva en el mismo caso de uso.
3. Uso de estado mutable global en singletons.
4. Fuga de errores técnicos de infraestructura al contrato público del API.
5. Cruce de bounded contexts en una historia sin justificación ni descomposición.
6. Creación de estructuras fuera de la convención por capas/feature sin aprobación.

---

## 5) Decisiones de diseño vigentes (resumen operacional)

<!-- Referencias de ejemplo - actualizar según proyecto específico -->
<!-- Config: {project-root}/.github/docs/config/config.yaml -->
<!-- Agents: {project-root}/.github/agents/ -->
<!-- Output: {project-root}/.github/_gaidd-output -->
<!-- Context: {project-root}/.github/docs/context -->

Ahora verifico los archivos de contexto disponibles y los de validación del paso anterior.

---

¡Hola, Julian! Soy **Tomás**, analista técnico senior de requerimientos. He recibido el artefacto **HU-P001: Registrar Nuevo Producto en el Catálogo** y procedo a verificar los insumos necesarios para ejecutar el análisis técnico.

---

## Verificación de Insumos

**✅ Artefacto recibido:** `HU-P001` — Registrar Nuevo Producto en el Catálogo

**✅ Archivos de contexto disponibles:**
- `business_domain_dictionary.context.md`
- `project_architecture.context.md`
- `project_structure_principles.context.md`
- `tech_stack_constraints.context.md`

---

**❌ Archivos requeridos NO encontrados:**

Los siguientes archivos son necesarios para continuar y no se encuentran en el workspace:

| # | Archivo | Ubicación esperada | Para qué sirve |
|---|---------|-------------------|----------------|
| 1 | `HU-P001.step_2.requirement-validator.md` | `_gaidd-output/HU-P001/` | Resultado de la validación del requerimiento en el Paso 2: completitud, claridad, viabilidad técnica, hallazgos y recomendaciones específicas. Sin este insumo no es posible contextualizar qué ambigüedades o riesgos ya fueron identificados. |
| 2 | `HU-P001.step_2.resolution-of-conflicts.md` | `_gaidd-output/HU-P001/` | Registro de cómo se resolvieron los conflictos y ambigüedades detectados en el Paso 2. Es necesario para no repetir análisis ya realizados ni contradecir resoluciones tomadas. |
1. El estilo base del backend es reactivo (WebFlux + Reactor + R2DBC).
2. El módulo de Catálogo de Productos mantiene separación estricta por capas.
3. La API REST del proyecto usa contratos JSON y versionado por ruta.
4. Las historias que impacten más de 3 módulos/features independientes deben reevaluarse para descomposición.

---

## 6) Criterios de cumplimiento para análisis de requerimientos

Una propuesta de análisis se considera alineada cuando:

- [ ] Identifica bounded context principal.
- [ ] Ubica responsabilidades en capas correctas.
- [ ] Evita antipatrones prohibidos.
- [ ] Respeta stack y enfoque reactivo vigentes.
- [ ] No contradice ADRs activos (`architecture_decision_records.context.md`).

---

## 7) Regla de gobernanza

Si un requerimiento necesita desviarse de estos estándares:

1. Se documenta explícitamente el motivo.
2. Se propone evaluación arquitectónica.
3. Se formaliza decisión mediante nuevo ADR o actualización de ADR vigente.
