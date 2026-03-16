# Estándares de Arquitectura del Proyecto

## Propósito

Este documento define los **patrones arquitectónicos aprobados**, los **antipatrones prohibidos**, los principios de **acoplamiento/cohesión** y las decisiones de diseño vigentes para el proyecto.

Debe usarse como referencia obligatoria durante análisis, refinamiento e implementación de historias.

---

## 1) Patrones arquitectónicos aprobados

1. Arquitectura por capas dentro de cada feature:
   - `API`
   - `Application`
   - `Domain`
   - `Infrastructure`
2. Diseño por bounded context (separación explícita de dominios).
3. Backend basado en Event Sourcing + CQRS + Outbox Pattern.
4. Enfoque por casos de uso en capa `Application`.
5. Contratos API versionados por ruta (`/api/v1/...`).
6. Frontend con App Router y separación entre `app`, `application`, `domain`, `infrastructure`, `components` y `hooks`.

---

## 2) Reglas de responsabilidad por capa

### `api`

- Orquesta request/response HTTP.
- Valida formato de entrada y delega en `Application`.
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

1. **Dependencia hacia adentro**: `API` -> `Application` -> `Domain`.
2. **Dominio aislado**: `Domain` no depende de `Infrastructure` ni de componentes web.
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

1. El backend principal vive en `apps/backend/` y usa .NET 10 con ASP.NET Minimal API.
2. El dominio central implementa Event Sourcing, CQRS y Outbox Pattern sobre PostgreSQL y RabbitMQ.
3. El frontend principal vive en `apps/frontend/` y usa Next.js App Router con React 19 y TypeScript.
4. Los contratos públicos y la terminología deben respetar el diccionario operativo de RLAPP.
5. Las historias que impacten múltiples módulos o bounded contexts deben evaluarse para descomposición antes de implementarse.

---

## 6) Criterios de cumplimiento para análisis de requerimientos

Una propuesta de análisis se considera alineada cuando:

- [ ] Identifica bounded context principal.
- [ ] Ubica responsabilidades en capas correctas.
- [ ] Evita antipatrones prohibidos.
- [ ] Respeta stack y arquitectura vigentes del repositorio.
- [ ] No contradice ADRs activos (`architecture_decision_records.context.md`).

---

## 7) Regla de gobernanza

Si un requerimiento necesita desviarse de estos estándares:

1. Se documenta explícitamente el motivo.
2. Se propone evaluación arquitectónica.
3. Se formaliza decisión mediante nuevo ADR o actualización de ADR vigente.
