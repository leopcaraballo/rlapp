════════════════════════════════════════════════════════════════════════════════
RESULTADO: ES UN REQUERIMIENTO DE ALTO NIVEL — REQUIERE DESCOMPOSICIÓN
════════════════════════════════════════════════════════════════════════════════

**Identificador del Artefacto:** AUDIT-ARCH-2026-02-28
**Título:** Auditoría Arquitectónica Completa del Monorepo — Elevación a Enterprise-Grade
**Fecha de Evaluación:** 28 de febrero de 2026
**Evaluador:** Evaluador IEEE — Especialista en Estándares IEEE 830 / ISO 29148
**Estado:** DESCOMPOSICIÓN COMPLETADA — LISTO PARA DISEÑO

---

## 1. Requerimiento Analizado

**Solicitud Original (texto íntegro):**

> Ejecutar una auditoría arquitectónica completa del monorepo, coordinando:
>
> - agent_backend
> - agent_frontend
> - agent_qa
> - agent_spec
>
> Todas las skills disponibles en .github/skills
>
> La auditoría debe elevar el proyecto a nivel enterprise-grade en:
>
> - Arquitectura
> - Gobernanza
> - Escalabilidad
> - Mantenibilidad
> - Calidad de código
> - Testing
> - DevOps readiness
> - Coherencia documental

**Señales de Amplitud Detectadas:**

- Múltiples dominios: arquitectura, gobernanza, escalabilidad, mantenibilidad, código, testing, DevOps, documentación
- Coordinación de 4 agentes especializados (backend, frontend, QA, spec)
- 6 fases secuenciales independientes (diagnóstico, auditoría por capa, deuda técnica, reporte consolidado)
- Alcance estimado: semanas (no días)
- Términos genéricos sin cuantificación: "nivel enterprise-grade", "madurez estructural", "coherencia documental"
- Validaciones cruzadas contra múltiples contextos y lineamientos

---

## 2. Evaluación de Criterios de Calidad (IEEE 830 / ISO/IEC/IEEE 29148)

### Criterio 1: COMPLETO ✅

**Calificación:** ✅ CUMPLE

**Justificación:** El requerimiento especifica claramente TODOS los elementos necesarios para comprender qué auditar. Identifica actores (4 agentes especializados), dominios a auditar (8 áreas principales), contexto de negocio (escalabilidad a 5 años), criterios de validación (conformidad con arquitectura y lineamientos definidos), restricciones (stack real, no asumir arquitectura sino deducirla). Aunque es amplío, contiene información completa para que un equipo disponga de todo lo necesario para realizar la auditoría sin aclaraciones críticas de contexto.

---

### Criterio 2: CORRECTO ✅

**Calificación:** ✅ CUMPLE

**Justificación:** La necesidad de negocio es clara y justificable: determinación del estado arquitectónico actual de un monorepo con el objetivo de escalar de manera confiable a 5 años. Una auditoría integral es el instrumento correcto para validar que el proyecto cumple lineamientos de gobernanza, escalabilidad y mantenibilidad. Resuelve problema real (desconocimiento de desviaciones arquitectónicas) y habilita decisión estratégica (es viable crecer con esta arquitectura o requiere refactor). Alineado con objetivos de un CoE DevArq (Sofka).

---

### Criterio 3: SIN AMBIGÜEDAD ❌

**Calificación:** ❌ NO CUMPLE

**Justificación (Evidencia Directa):** El requerimiento contiene términos subjetivos sin cuantificación que generan múltiples interpretaciones:

- **"Nivel enterprise-grade"** — no define métricas concretas. ¿Qué indicadores determinan si algo ES enterprise-grade? (ej. 99.99% disponibilidad, cobertura >85%, adherencia a SOLID >90%, zero vulnerabilidades críticas)
- **"Madurez estructural"** — vago. ¿Se mide en escala CMMI, CMM, capacidad de agencia, arquitectura limpia, cumplimiento SOLID?
- **"Coherencia documental"** — sin criterio verificable. ¿Qué porcentaje de desalineación es aceptable? ¿Documentación desactualizada cuenta como incoherencia?
- **"Elevar a nivel enterprise-grade"** — ¿Es objetivo de esta auditoría elevar el código mismo, o solo identificar divergencias? (diferencia crítica: auditoría vs. refactorización)
- **"Escalabilidad"** como dominio auditable sin límites de carga específicos, throughput esperado ni usuarios concurrentes de referencia

El requerimiento no cuantifica NINGUNA métrica de auditoría (línea de base actual vs. meta, tolerancia de desviaciones, peso relativo de hallazgos críticos).

---

### Criterio 4: VERIFICABLE (TESTEABLE) ⚠️

**Calificación:** ⚠️ CUMPLE PARCIALMENTE

**Justificación:** La escala 0–5 de madurez es medible, permitiendo antes/después. Sin embargo, falta especificación precisa de:

- Qué indicadores componen cada nivel (0=caótico, 5=optimizado)
- Criterios de aceptación por fase (¿cuándo concluye el diagnóstico general?)
- Definición de "hallazgo crítico" vs "hallazgo informativo" (su peso en la puntuación final)
- Umbral de consenso entre agentes (¿todos deben acordar una clasificación?)

Aspecto positivo: el formato de respuesta solicitado (hallazgos críticos, riesgos, violaciones, redundancias, plan priorizado) es verificable y documentable.

---

### Criterio 5: FACTIBLE ✅

**Calificación:** ✅ CUMPLE

**Justificación:** Técnica y económicamente viable. Existen 4 agentes especializados definidos, 8 skills especializadas disponibles en el repositorio, contexto arquitectónico documentado, stack conocido (.NET, Next.js, PostgreSQL, RabbitMQ). La auditoría no requiere investigación tecnológica ni recursos ajenos al proyecto. Estimación de esfuerzo es estándar (análisis de código, documentación, validación de patrones) sin dependencias bloqueantes. Recursos: equipos de desarrollo/QA + ambiente de desarrollo actual, sin requisitos de infraestructura especial.

---

### Criterio 6: NECESARIO ✅

**Calificación:** ✅ CUMPLE

**Justificación:** Valor de negocio tangible: desconocimiento del estado arquitectónico real es riesgo crítico para escalabilidad a 5 años. Una auditoría integral aporta fundamento para decisiones de arquitectura (refactor, replatforming, inversión continua). Beneficiarios directos: liderazgo técnico (CTO/VP Engineering), equipos de desarrollo, CoE DevArq. Sin esta auditoría, riesgo de evolucionar sobre cimientos inestables. No hay redundancia con otros análisis en contexto.

---

### Criterio 7: ESPECÍFICO (vs ALTO NIVEL) — CRITERIO CRÍTICO ❌

**Calificación:** ❌ **NO CUMPLE** — **EVIDENCIA EXHAUSTIVA**

**Por qué es ALTO NIVEL — Análisis en profundidad:**

1. **Agrupa múltiples funcionalidades independientes implementables separadamente:**
   - Fase 1: Diagnóstico general (ejecuta en paralelo, genera outputs independientes)
   - Fase 2: Auditoría backend (ejecuta en paralelo, genera hallazgos específicos del backend)
   - Fase 3: Auditoría frontend (ejecuta en paralelo, genera hallazgos específicos del frontend)
   - Fase 4: Auditoría QA (ejecuta en paralelo, genera hallazgos de cobertura y testing)
   - Fase 5: Auditoría spec (ejecuta en paralelo, genera hallazgos de especificaciones)
   - Fase 6: Deuda técnica (consolida hallazgos previos, no genera nuevo análisis)

   Cada una de estas fases podría ser un requerimiento separado con valor propio. No son pasos de un único trabajo sino análisis independientes que ocurren en paralelo.

2. **Coordina trabajo de múltiples agentes sin especificar tareas unitarias:**
   - El texto dice "coordinando: agent_backend, agent_frontend, agent_qa, agent_spec" pero NO especifica qué exactamente hace CADA agente
   - ¿agent_backend audita solo separación de capas o también seguridad, testing, performance?
   - ¿agent_frontend audita solo componentes o también accesibilidad, rendimiento, testing?
   - ¿agent_qa valida cobertura de tests, estrategia completa de QA, o ambas?
   - ¿agent_spec valida coherencia con requerimientos, granularidad de HU, o ambas?

   Falta especificación clara de responsabilidades unitarias por agente.

3. **Alcance estimable en semanas, no en días:**
   - Auditoría arquitectónica completa de monorepo multi-capa: mínimo 3-4 sprints (2-3 semanas)
   - Análisis backend (Services, BuildingBlocks, patrones, testing): mínimo 3-5 días
   - Análisis frontend (componentes, estado, testing, a11y): mínimo 3-5 días
   - Análisis QA (cobertura, estrategia, riesgos, flows críticos): mínimo 3-5 días
   - Análisis spec (coherencia, granularidad, DoR/DoD): mínimo 2-3 días
   - Consolidación y reporte: mínimo 2-3 días

   Total estimado: 15-30 días de esfuerzo concentrado. Una tarea específica estimable en días (máximo 5).

4. **Describe una "capacidad general" antes que una "funcionalidad acotada":**
   - Texto original usa frases como: "ejecutar una auditoría arquitectónica completa", "elevar el proyecto a nivel enterprise-grade"
   - Estos son enunciados de capacidad amplia, no de función implementable
   - Comparable a "construir un sistema de gestión de inventario" vs. "registrar entrada de mercancía con validación de SKU y lote"

5. **Múltiples validaciones contra diferentes contextos sin especificar cuál es responsabilidad de quién:**
   - Validar contra: `project_architecture.context.md`, `project_architecture_standards.context.md`, `tech_stack_constraints.context.md`, lineamientos de dev/QA, reglas de oro, DoR, DoD, ADRs
   - El texto NO especifica:
     - Quién valida cada contexto (¿agent_backend valida todos o solo los de backend?)
     - Qué hacer si hay divergencia (¿reportarla o corregirla?)
     - Peso relativo de cada validación en la puntuación final

6. **Ausencia de especificación clara del "CÓMO" (métodos de análisis):**
   - ¿Cómo audita agent_backend? ¿Inspección de código + análisis estático + análisis dinámico?
   - ¿Cuáles herramientas usa? ¿SonarQube, custom parsers, inspección manual?
   - ¿Qué patrones específicos valida? (SOLID, DDD, Clean Architecture, Hexagonal)
   - ¿Cómo se objetivan hallazgos? (checklist, scoring system, rubric)

7. **Requiere descomposición significativa para ser implementable:**
   - Para que agent_backend sepa qué auditar, necesita especificación:

     ```
     RF-AUDIT-BACKEND-001: Validar separación de Domain / Application / Infrastructure
     Dado que: el backend está estructurado en capas por feature
     Cuando: agent_backend inspecciona importaciones en cada módulo
     Entonces: genera lista de violaciones de dependencia (imports hacia adentro esperados, desde afuera detectados)
     ```

   - Sin esta descomposición, agent_backend no sabe dónde buscar ni cómo reportar.

**Conclusión del Criterio 7:**
El requerimiento NO ES ESPECÍFICO. Describe una auditoría INTEGRAL con 6 fases y 4 agentes coordinados. Un equipo de desarrollo NO PUEDE diseñar e implementar directamente "auditoría arquitectónica completa" sin descomponerlo primero en auditorías específicas por dominio (backend, frontend, QA, spec), cada una con métodos y criterios claros.

---

### Criterio 8: TRAZABLE ✅

**Calificación:** ✅ CUMPLE

**Justificación:** Identificable unívocamente como "Auditoría Arquitectónica del Monorepo — Feb 2026". Origen claro: solicitud de CoE DevArq para validar estado arquitectónico. Trazable a objetivo estratégico: escalabilidad del proyecto a 5 años sin deuda técnica crítica. Propósito comercial definido: fundamento para decisiones de futuro (continuar evolución, refactor, replatforming). Puede incorporarse al DEBT_REPORT.md con ID específico.

---

## 3. Resultado de la Prueba de Descomposición

**Aplicación de Prueba Crítica:** "Si descompusiera este requerimiento, ¿qué obtendría? ¿Constituye cada elemento un requerimiento independiente con valor propio?"

**Resultado:** ✅ **CONFIRMA ALTO NIVEL**

La descomposición natural genera:

- **RF-AUDIT-001** (Diagnóstico Monorepo) → requerimiento independiente evaluable
- **RF-AUDIT-002** (Auditoría Backend) → requerimiento independiente evaluable
- **RF-AUDIT-003** (Auditoría Frontend) → requerimiento independiente evaluable
- **RF-AUDIT-004** (Auditoría QA) → requerimiento independiente evaluable
- **RF-AUDIT-005** (Auditoría Spec) → requerimiento independiente evaluable
- **RF-AUDIT-006** (Deuda Técnica) → requerimiento independiente evaluable
- **RF-AUDIT-007** (Reporte Consolidado) → requerimiento independiente evaluable

Cada uno constituye ANÁLISIS INDEPENDIENTE con entregables propios que agregados componen la auditoría integral. No son pasos de diseño/implementación sino requerimientos con valor de negocio discrente.

---

## 4. Conclusión: REQUERIMIENTO DE ALTO NIVEL (REQUIERE DESCOMPOSICIÓN)

════════════════════════════════════════════════════════════════════════════════

**DECISIÓN FINAL: ES UN REQUERIMIENTO DE ALTO NIVEL — REQUIERE DESCOMPOSICIÓN**

**Justificación fundamentada (6-9 oraciones):**

El requerimiento de auditoría arquitectónica completa cumple parcialmente con los estándares de especificación IEEE 830, pero **falla críticamente en el criterio 7 "ESPECÍFICO"** (❌ NO CUMPLE), lo que lo clasifica automáticamente como Alto Nivel independientemente de otros criterios. El texto describe una **capacidad amplia** ("auditoría arquitectónica completa") que agrupa **6 fases secuenciales** y **4 agentes especializados** trabajando en paralelo, cada uno con dominio y responsabilidades distintas. El alcance es estimable en **2-3 semanas de esfuerzo**, no en días. Múltiples términos carecen de cuantificación ("enterprise-grade", "madurez estructural", "coherencia documental"), generando ambigüedad sobre criterios de validación. La prueba de descomposición confirma que cada fase (backend, frontend, QA, spec, deuda técnica) constituye un **requerimiento independiente con valor propio**, no pasos de un trabajo único. Para que los agentes especializados comiencen a trabajar, cada uno debe recibir especificaciones détalladas: qué validar exactamente, cuáles herramientas, qué se considera violación, cómo reportar hallazgos. **Esta descomposición es obligatoria antes de asignar trabajo a los agentes.**

**Razones principales:**

1. **Criterio 7 "ESPECÍFICO" = ❌ NO CUMPLE** → Regla B automática (ALTO NIVEL)
2. **Agrupa 6 análisis independientes** que pueden desarrollarse en paralelo por agentes distintos
3. **Alcance semanal, no diario** → Requiere sub-división de esfuerzo
4. **Ambigüedad en criterios de validación** → Cada agente necesita especificación de qué auditar
5. **Métodos de análisis no especificados** → Falta detalle de cómo cada agente desarrolla su auditoría

**Evidencia textual crítica:**

- "Ejecutar una auditoría arquitectónica completa del monorepo, coordinando: agent_backend, agent_frontend, agent_qa, agent_spec"
- "Evaluar madurez estructural"
- "Elevar el proyecto a nivel enterprise-grade"
- "Validar ... contra: project_architecture.context.md, project_architecture_standards.context.md, tech_stack_constraints.context.md"

Estos enunciados describen CAPACIDADES INTEGRALES, no funcionalidades acotadas directamente implementables.

────────────────────────────════════════════════════════

---

## 5. Descomposición en Requerimientos Específicos

### 5.1. Requerimientos Funcionales (RF)

---

#### **RF-AUDIT-001: Ejecutar Diagnóstico General del Monorepo**

**Identificador:** RF-AUDIT-001
**Prioridad:** ALTA
**Dependencias:** Ninguna (puede ejecutarse en paralelo con otros RF)

**Descripción Completa:**

El sistema debe ejecutar un diagnóstico arquitectónico de alto nivel del monorepo completo, analizando la organización estructural, patrones de acoplamiento, separación de responsabilidades entre capas y módulos, y madurez relativa de cada componente. El análisis debe cubrir: (a) detección del tipo de arquitectura implementada (Clean, DDD, monolítico modular, microservicios, etc.), (b) evaluación de la organización física del monorepo (coherencia de convenciones de carpetas, nombres, separación por contextos de negocio), (c) identificación de acoplamientos bidireccionales indebidos, (d) validación de dependencias cruzadas no intencionadas entre módulos, (e) verificación de separación clara entre backend y frontend, (f) asignación de puntuación de madurez estructural en escala 0-5. El diagnóstico genera un informe de estado general que sirve como fundamento para auditorías especializadas posteriores.

**Cumplimiento de Criterios de Calidad:**

- **Completo:** ✅ Especifica actores (análisis automático + revisión manual), entradas (codebase completo), salidas (informe diagnóstico), condiciones (stack existente)
- **Correcto:** ✅ Necesidad válida de entender arquitectura antes de auditarías especializadas
- **Sin Ambigüedad:** ⚠️ "Madurez estructural" sin métrica exacta (ver métricas verificables)
- **Verificable:** ✅ Entregable concreto: informe con hallazgos listados
- **Factible:** ✅ Análisis estándar de estructura de código
- **Necesario:** ✅ Pre-requisito para auditorías especializadas
- **Específico:** ✅ Dominio acotado (monorepo general, no específico de stack)
- **Trazable:** ✅ Identificable como RF-AUDIT-001

**Criterios de Aceptación (Gherkin):**

```gherkin
CRITERIO-001.1: Detectar Tipo de Arquitectura
  Dado que: el codebase contiene patrones de organización definidos
  Cuando: el sistema analiza la estructura de carpetas, dependencias entre módulos y separación de responsabilidades
  Entonces: genera clasificación de arquitectura con evidencia textual directa (ej. "Clean Architecture detectada: Domain aislado de Infrastructure")

CRITERIO-001.2: Identificar Acoplamientos No Intencionados
  Dado que: existen dependencias bidireccionales potenciales entre módulos
  Cuando: el sistema ejecuta análisis de importaciones cruzadas
  Entonces: genera lista de acoplamientos con nombre de módulos, rutas de archivos y líneas de código exactas

CRITERIO-001.3: Evaluar Separación Backend/Frontend
  Dado que: existe código en rlapp-backend/ y rlapp-frontend/
  Cuando: sistema verifica si existe código compartido no documentado entre ambas carpetas
  Entonces: reporta grado de separación (aislado / mínimamente acoplado / moderadamente acoplado / altamente acoplado)

CRITERIO-001.4: Asignar Puntuación de Madurez Estructural
  Dado que: métricas de madurez están definidas en escala 0-5
  Cuando: sistema calcula score basado en hallazgos (modularidad, cohesión, acoplamiento, convenciones)
  Entonces: genera puntuación numérica 0-5 con justificación por cada componente
```

**Métricas de Verificación:**

| Métrica | Método | Criterio Aceptación | Condiciones |
|---------|--------|-----------------------|------------|
| Tipo de arquitectura detectado | Análisis estático de estructura + revisión manual | Debe identificarse arquitectura base (Clean/DDD/Monolito/Microservicios) | Codebase en estado actual sin cambios |
| Acoplamientos bidireccionales | Parser de importaciones + grafo de dependencias | ≤ 3 acoplamientos críticos sin justificación documentada | Análisis de src/ excluida node_modules |
| Separación BackendFrontend | File system + búsqueda de imports cruzados | 0 importaciones directas de backend en frontend o viceversa (excepto DTOs documentados) | Estado actual sin modificaciones |
| Puntuación madurez estructural | Rubric de 6 factores (modularidad, cohesión, acoplamiento, convenciones, doc, testing) | Puntuación 0-5 con justificación por factor | Assessment realizado por especialista |

**Prioridad - Justificación:**
ALTA — Es prerequisito para todas las auditorías especializadas. Sin diagnóstico de arquitectura general, auditorías de componentes carecerían de contexto. Define línea base contra la cual se validan otras auditorías.

---

#### **RF-AUDIT-002: Ejecutar Auditoría Arquitectónica Backend**

**Identificador:** RF-AUDIT-002
**Prioridad:** ALTA
**Dependencias:** RF-AUDIT-001 (diagnóstico general proporciona contexto)

**Descripción Completa:**

El sistema debe ejecutar auditoría especializada del código backend (rlapp-backend/src/), evaluando adherencia a arquitectura limpia, DDD, patrones SOLID y estándares definidos en lineamientos. La auditoría debe analizar: (a) separación de capas (Domain/Application/Infrastructure) en cada módulo, (b) violaciones a Clean Architecture (lógica de negocio fuera del Domain, detalles de infraestructura filtrándose a capas superiores), (c) distinción entre modelos ricos vs. anémicos de dominio, (d) ubicación correcta de DTOs, (e) manejo de excepciones y validaciones, (f) código duplicado y muerto, (g) uso indebido de dependencias, (h) falta de validaciones en puntos críticos. Además, evalúa cobertura y calidad de testing (unitarios e integración). Entrega informe con hallazgos críticos (rojo), hallazgos moderados (amarillo) y mejoras recomendadas (verde).

**Cumplimiento de Criterios de Calidad:**

- **Completo:** ✅ Especifica dominio (backend), componentes a auditar (capas, patrones, testing), criterios (Clean Architecture, SOLID, lineamientos)
- **Correcto:** ✅ Necesidad crítica para escalabilidad: backend debe estar limpio arquitectónicamente
- **Sin Ambigüedad:** ⚠️ "Violaciones a Clean Architecture" sin lista exhaustiva (ver criterios específicos)
- **Verificable:** ✅ Hallazgos son listables con ubicación exacta en código
- **Factible:** ✅ Análisis estándar de patrones arquitectónicos
- **Necesario:** ✅ Crítico para decisión de escalabilidad
- **Específico:** ✅ Dominio acotado (backend .NET solamente)
- **Trazable:** ✅ RF-AUDIT-002

**Criterios de Aceptación (Gherkin):**

```gherkin
CRITERIO-002.1: Validar Separación de Capas
  Dado que: cada módulo backend debe tener estructura Domain/Application/Infrastructure
  Cuando: sistema analiza paquetes y archivos dentro de rlapp-backend/src/Services/
  Entonces: verifica que Domain no importa desde Infrastructure ni Application, genera lista de violaciones con archivo:línea

CRITERIO-002.2: Detectar Lógica de Negocio Fuera del Dominio
  Dado que: reglas de negocio deben residir en capa Domain
  Cuando: análisis detecta lógica de validación o cálculo en Controllers o Services de Application
  Entonces: reporta con severidad alta: "Lógica de negocio detectada en rlapp-backend/src/Services/WaitingRoom/WaitingRoom.API/Controllers/..."

CRITERIO-002.3: Evaluar Distinción entre Modelos Ricos y Anémicos
  Dado que: entidades de dominio deben encapsular lógica (ricos) no ser meros contenedores de datos
  Cuando: se inspeccionan clases de Domain analizando métodos vs. propiedades
  Entonces: genera clasificación por entidad: "Rica (métodos >= 3 relacionados a negocio)" o "Anémica (solo propiedades, sin comportamiento)"

CRITERIO-002.4: Validar Cobertura de Testing
  Dado que: cobertura mínima requerida es 80%
  Cuando: se ejecuta herramienta de cobertura (ej. OpenCover) en tests/
  Entonces: reporta porcentaje actual y módulos por debajo del umbral con lista de clases no cubiertas
```

**Métricas de Verificación:**

| Métrica | Método | Criterio Aceptación | Condiciones |
|---------|--------|-----------------------|------------|
| Violaciones separación capas | Parser de importaciones + AST analysis | ≤ 2 violaciones sin justificación documentada | Análisis de WaitingRoom/ solamente |
| Lógica negocio fuera Domain | Análisis semántico de métodos | 0 lógica de validación en API/controllers | Inspección manual + validación |
| Modelos ricos vs anémicos | Conteo de métodos por entidad | ≥ 70% de entidades deben ser ricas | Dominios de negocio críticos |
| Cobertura testing | OpenCover / Coverlet report | >= 80% en lógica de negocio (Domain + Application) | Build actual del proyecto |
| Código duplicado | SonarQube / FxCop custom rule | ≤ 5% código duplicado | Análisis de src/ |

**Prioridad - Justificación:**
ALTA — Backend es componente crítico. Arquitectura deficiente del backend bloquea escalabilidad, aumenta riesgo de deuda técnica exponencial. Hallazgos aquí informan decisiones de refactorización urgentes.

---

#### **RF-AUDIT-003: Ejecutar Auditoría Arquitectónica Frontend**

**Identificador:** RF-AUDIT-003
**Prioridad:** ALTA
**Dependencias:** RF-AUDIT-001

**Descripción Completa:**

El sistema debe ejecutar auditoría especializada del código frontend (rlapp-frontend/src/), evaluando organización de componentes, separación UI/lógica, reutilización de componentes, acoplamiento indebido, gestión de estado, calidad de testing y accesibilidad (WCAG 2.1 AA). La auditoría debe analizar: (a) estructura de carpetas coherente con patrones definidos, (b) componentes sin lógica anidada (separación Container/Presenter), (c) reutilización efectiva de componentes (no duplicación), (d) acoplamiento de estado (prop drilling vs. context/global), (e) calidad de tests (unitarios vs. E2E balance), (f) cumplimiento de estándares de accesibilidad en elementos interactivos, (g) seguridad (sin datos sensibles en logs, sanitización de inputs). Entrega informe con hallazgos por categoría.

**Cumplimiento de Criterios de Calidad:**

- **Completo:** ✅ Especifica dominio (frontend Next.js/React), componentes auditables, criterios (organización, testing, a11y, seguridad)
- **Correcto:** ✅ Crítico para experiencia de usuario y mantenibilidad frontend
- **Sin Ambigüedad:** ⚠️ "Estructura coherente" sin definición exacta de estructura esperada (mitigado por referencias a dev-guidelines)
- **Verificable:** ✅ Hallazgos listables (componentes violadores, ratio reutilización, puntuación a11y)
- **Factible:** ✅ Herramientas estándar (ESLint, Jest, Lighthouse, axe)
- **Necesario:** ✅ UX depende de calidad frontend
- **Específico:** ✅ Dominio acotado (frontend Next.js/React solamente)
- **Trazable:** ✅ RF-AUDIT-003

**Criterios de Aceptación (Gherkin):**

```gherkin
CRITERIO-003.1: Validar Estructura de Componentes
  Dado que: componentes deben seguir patrón Container/Presenter
  Cuando: se inspeccionan archivos en rlapp-frontend/src/components/
  Entonces: reporta componentes que mezclan lógica con presentación (>100 líneas con lógica no separada)

CRITERIO-003.2: Detectar Duplicación de Componentes
  Dado que: reutilización mejora mantenibilidad
  Cuando: se ejecuta análisis de similitud de código en componentes
  Entonces: identifica pares de componentes con >80% similitud sugiriendo consolidación

CRITERIO-003.3: Evaluar Accesibilidad WCAG 2.1 AA
  Dado que: elementos interactivos deben cumplir estándares a11y
  Cuando: Lighthouse + axe-core analizan rlapp-frontend/
  Entonces: reporta puntuación de accesibilidad (target: >= 90/100) con detalles de violaciones

CRITERIO-003.4: Validar Testing Coverage
  Dado que: cobertura frontend mínima requerida es 75%
  Cuando: Jest ejecuta cobertura en src/
  Entonces: reporta % actual, identifica archivos < 75%, sugiere tests faltantes
```

**Métricas de Verificación:**

| Métrica | Método | Criterio Aceptación | Condiciones |
|---------|--------|-----------------------|------------|
| Componentes mixtos (lógica+UI) | ESLint custom rule / manual | ≤ 5 componentes violadores | src/components/ solamente |
| Duplicación componentes | Similitud semántica | ≤ 3% pares duplicados | Análisis de src/components/ |
| Puntuación accesibilidad | Lighthouse API + axe-core | >= 90/100 en accesibilidad | rlapp-frontend/ en modo producción |
| Cobertura testing | Jest coverage report | >= 75% en src/ (excepto configuración) | npm test -- --coverage |
| Componentes reutilizados | Conteo de imports | >= 50% componentes utilisados >=2 veces | src/components/ |

**Prioridad - Justificación:**
ALTA — Frontend es cara visible del sistema. Problemas de accesibilidad, seguridad o testing frontend impactan directamente experiencia del usuario y mantenibilidad. Hallazgos informan mejoras en UI/UX y seguridad cliente.

---

#### **RF-AUDIT-004: Ejecutar Auditoría de Calidad (QA Strategy & Coverage)**

**Identificador:** RF-AUDIT-004
**Prioridad:** MEDIA-ALTA
**Dependencias:** RF-AUDIT-001, RF-AUDIT-002, RF-AUDIT-003

**Descripción Completa:**

El sistema debe ejecutar auditoría de calidad integral, evaluando cobertura de testing actual, estrategia de regresión, identificación de casos críticos no cubiertos, mapeo de flujos de negocio críticos, riesgos funcionales, análisis de performance potencial y especificación de datos de prueba. La auditoría debe: (a) validar distribución de tests en pirámide (70% unitarios, 20% integración, 10% E2E), (b) identificar flujos críticos del negocio que carecen de E2E, (c) generar matriz de riesgo priorizando casos de alto impacto, (d) revisar cobertura de criterios de aceptación en historias existentes, (e) proponer suite de regresión optimizada, (f) identificar riesgos de performance (latencia, throughput). Entrega: estrategia de testing documentada, casos Gherkin para gaps, matriz de riesgos priorizada.

**Cumplimiento de Criterios de Calidad:**

- **Completo:** ✅ Especifica dominio (testing y QA), criterios (cobertura, estrategia, riesgos), entregables (casos, matriz)
- **Correcto:** ✅ Necesidad crítica: cobertura insuficiente causa regresiones en producción
- **Sin Ambigüedad:** ⚠️ "Riesgos funcionales" requiere definición de matriz (mitigado por metodología ASD)
- **Verificable:** ✅ Casos Gherkin son reproducibles, matriz de riesgo es auditable
- **Factible:** ✅ Análisis estándar de cobertura + técnicas de riesgo
- **Necesario:** ✅ Testing de calidad es requisito de escalabilidad
- **Específico:** ✅ Dominio acotado (QA, testing, cobertura)
- **Trazable:** ✅ RF-AUDIT-004

**Criterios de Aceptación (Gherkin):**

```gherkin
CRITERIO-004.1: Validar Pirámide de Testing
  Dado que: distribución ideal es 70% unitarios, 20% integración, 10% E2E
  Cuando: se analizan tests en rlapp-backend/src/Tests/ y rlapp-frontend/test/
  Entonces: reporta distribución actual con recomendaciones de balanceo

CRITERIO-004.2: Identificar Flujos Críticos Sin Cobertura E2E
  Dado que: flujos de negocio críticos (autenticación, registro paciente, consulta) deben tener E2E
  Cuando: sistema mapea flujos críticos vs. tests E2E existentes
  Entonces: genera lista de gaps con severidad (crítico/alto/medio) y recomendación de casos E2E

CRITERIO-004.3: Generar Matriz de Riesgos Priorizada
  Dado que: no todos los riesgos tienen igual impacto
  Cuando: matriz de riesgo se construye con Probabilidad x Impacto
  Entonces: identifica riesgos Alto (ASD=obligatorio), Medio (ASD=recomendado), Bajo (ASD=opcional)

CRITERIO-004.4: Revisar Criterios de Aceptación en Historias
  Dado que: cada HU debe tener criterios BDD claros
  Cuando: se inspeccionan historias en documentación/backlog
  Entonces: reporta % con criterios completos, identifica HU sin criterios de aceptación
```

**Métricas de Verificación:**

| Métrica | Método | Criterio Aceptación | Condiciones |
|---------|--------|-----------------------|------------|
| Distribución pirámide testing | Conteo por tipo (Unit/Integration/E2E) | 65-75% Unit, 15-25% Integration, 8-12% E2E | Análisis de test suites actuales |
| Flujos críticos cubiertos | Mapeo manual vs. scripts E2E | 100% de 5-7 flujos críticos con E2E | Principales: login, registro, consulta |
| Matriz riesgos completitud | Revisión de todos los RF/RNF | >=80% riesgos identificados (Alto/Medio/Bajo) | Basada en auditorías previas (RF-002, 003) |
| Criterios aceptación completos | Inspección de HU | >=90% HU con criterios BDD | Historias en backlog |
| Cobertura end-to-end | Reporte de test execution | >=60% de flujos e2e automatizados | Scripts en rlapp-frontend/test/e2e/ |

**Prioridad - Justificación:**
MEDIA-ALTA — Calidad de testing es prerequisito para confianza en releases. Ejecutarse después de auditorías backend/frontend para tener contexto de lo que auditar. Hallazgos informan estrategia de QA futura.

---

#### **RF-AUDIT-005: Ejecutar Auditoría de Especificaciones (GAIDD Alignment)**

**Identificador:** RF-AUDIT-005
**Prioridad:** MEDIA
**Dependencias:** RF-AUDIT-001

**Descripción Completa:**

El sistema debe ejecutar auditoría de especificaciones, validando coherencia entre requerimientos documentados (Historias de Usuario, Requerimientos) y código actual, evaluando granularidad de historias (INVEST), detectar conflictos de requerimientos sin resolver, evaluar alineación con Definition of Ready y Definition of Done, validar que glosarios de dominio están siendo usados consistentemente. La auditoría debe: (a) revisar todas las HU en documentación y backlog, (b) verificar que cada HU cumple criterios INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable), (c) detectar HU que son realmente épicas disfrazadas (requieren descomposición), (d) validar referencias a artefactos de especificación vs. código (¿las HU describen lo que el código hace?), (e) revisar DoR/DoD y que se aplican consistentemente. Entrega: lista de HU problemáticas, hallazgos de granularidad, recomendaciones de refinamiento.

**Cumplimiento de Criterios de Calidad:**

- **Completo:** ✅ Especifica dominio (especificaciones, historias, granularidad)
- **Correcto:** ✅ Alineación código-especificación es crítica para mantenibilidad
- **Sin Ambigüedad:** ⚠️ "Coherencia" sin métrica exacta (mitigado por matriz INVEST)
- **Verificable:** ✅ INVEST criteria son objetivos, HU problemáticas son listables
- **Factible:** ✅ Análisis de documentación + comparación manual
- **Necesario:** ✅ Especificaciones desalineadas causan confusión y deuda técnica
- **Específico:** ✅ Dominio acotado (especificaciones, HU, granularidad)
- **Trazable:** ✅ RF-AUDIT-005

**Criterios de Aceptación (Gherkin):**

```gherkin
CRITERIO-005.1: Validar INVEST Criteria en Historias de Usuario
  Dado que: cada HU debe cumplir criterios INVEST
  Cuando: se inspeccionan HU en documentación
  Entonces: reporta % cumplimiento por criterio (Independent/Negotiable/Valuable/Estimable/Small/Testable) con ejemplos de violaciones

CRITERIO-005.2: Identificar Épicas Disfrazadas
  Dado que: HU estimadas en L o XL podrían ser épicas (requieren descomposición)
  Cuando: se revisa estimación vs. descripción de HU
  Entonces: marca HU > L como candidata a descomposición con justificación

CRITERIO-005.3: Validar Alineación Código vs. Especificación
  Dado que: código debe implementar exactamente lo especificado en HU
  Cuando: se cruza HU con código implementado
  Entonces: identifica divergencias (código implementa diferente, HU describe funcionalidad no implementada, implementación va más allá del alcance)

CRITERIO-005.4: Revisar Definición de Ready y Done Cumplimiento
  Dado que: DoR y DoD deben aplicarse consistentemente
  Cuando: se inspeccionan HU cerradas en últimos sprints
  Entonces: verifica % que cumple criterios DoR/DoD (50+ criterios en 2 docs de referencia)
```

**Métricas de Verificación:**

| Métrica | Método | Criterio Aceptación | Condiciones |
|---------|--------|-----------------------|------------|
| Cumplimiento INVEST | Checklist manual | >= 85% de HU cumple >=5 de 6 criterios | Todas las HU activas |
| HU bien estimadas | Distribución: XS/S/M/L/XL | >=70% de HU <= M (máx. 2-3 spraints) | Estimaciones documentadas |
| Coherencia código-spec | Comparación línea a línea | >=90% de HU correctamente implementadas | Historias de últimos 3 sprints |
| Criterios DoR/DoD cumplidos | Inspección de checklist aplicado | >=80% de HU completadas cumplen DoD | HU en "Done" |
| Glosario dominio usado | Búsqueda de términos canónicos | >=80% de HU usa terminología definida en diccionario | business_domain_dictionary.md |

**Prioridad - Justificación:**
MEDIA — Importante para coherencia, pero menos crítico que RC backend/frontend. Permite ajustar proceso de especificación futuro, pero no impacta escalabilidad técnica inmediata.

---

#### **RF-AUDIT-006: Identificar Deuda Técnica y Redundancias Estructurales**

**Identificador:** RF-AUDIT-006
**Prioridad:** ALTA
**Dependencias:** RF-AUDIT-002, RF-AUDIT-003, RF-AUDIT-004, RF-AUDIT-005

**Descripción Completa:**

El sistema debe analizar críticamente el codebase identificando deuda técnica acumulada y redundancias estructurales que impiden escalabilidad. El análisis debe detectar: (a) código muerto (funciones/clases no referenciadas), (b) archivos/directorios duplicados con lógica similar, (c) documentación obsoleta que contradice código actual, (d) configuración innecesaria o heredada, (e) workflows duplicados en CI/CD, (f) dependencias no usadas declaradas, (g) outputs versionados accidentalmente en repositorio (node_modules, build artifacts), (h) patrones anti-architectural crónica (ej. siempre hay "util" helpers globales sin cohesión), (i) módulos abandonados (no mantenidos, tests fallidos), (j) complejidad técnica mayor a la del dominio de negocio (over-engineering). Entrega: lista priorizada de deuda técnica categorizando por impacto (crítica/alta/media/baja) y esfuerzo de remediación.

**Cumplimiento de Criterios de Calidad:**

- **Completo:** ✅ Especifica tipos de deuda (código muerto, duplicación, documentación obsoleta, config innecesaria, etc.)
- **Correcto:** ✅ Deuda técnica no abordado causa ralentización exponencial
- **Sin Ambigüedad:** ✅ Tipos de deuda son específicos y concretos
- **Verificable:** ✅ Código muerto es detectable, documentación obsoleta es identificable
- **Factible:** ✅ Herramientas estándar (SonarQube, Roslyn analyzers, custom scripts)
- **Necesario:** ✅ Crítico conocer deuda para planificar remediación
- **Específico:** ✅ Dominio acotado (deuda técnica, redundancias)
- **Trazable:** ✅ RF-AUDIT-006

**Criterios de Aceptación (Gherkin):**

```gherkin
CRITERIO-006.1: Detectar Código Muerto
  Dado que: código no usado consume mantenimiento sin aportar valor
  Cuando: se ejecuta análisis de referencias (SonarQube/Roslyn)
  Entonces: lista clases, métodos, funciones nunca llamadas con ubicación exacta

CRITERIO-006.2: Identificar Archivos Duplicados
  Dado que: duplicación aumenta costo de cambios
  Cuando: se ejecuta análisis de similitud de contenido
  Entonces: identifica archivos/directorios con >80% similitud con propuesta de consolidación

CRITERIO-006.3: Detectar Documentación Obsoleta
  Dado que: documentación desactualizada es peor que sin documentación
  Cuando: se cruzan archivos .md en docs/ con cambios de código recientes
  Entonces: identifica documentación no actualizada en últimos 6 meses vs. cambios relacionados

CRITERIO-006.4: Listar Dependencias No Usadas
  Dado que: toda dependencia declarada incurre costo de actualización y seguridad
  Cuando: se ejecutan analysers (depcheck, npm audit)
  Entonces: lista dependencias sin importes activos en codebase
```

**Métricas de Verificación:**

| Métrica | Método | Criterio Aceptación | Condiciones |
|---------|--------|-----------------------|------------|
| Código muerto identificado | SonarQube / Roslyn / custom script | <=5 entidades no usadas | rlapp-backend/src/ + rlapp-frontend/src/ |
| Duplicación código | Similitud semántica + manual | <=3% código con duplicación >80% | Análisis de fuentes principales |
| Documentación desactualizada | Búsqueda de referencias obsoletas | >=90% documentación actualizada en 12 meses | docs/, README, inline comments |
| Dependencias innecesarias | npm list / gradle dependencies | <=10% dependencias no utilizadas | package.json + pom.xml |
| Outputs en repo | Búsqueda de node_modules/build/ | 0 artifacts accidentales versionados | .gitignore compliance check |

**Prioridad - Justificación:**
ALTA — Deuda técnica crece exponencialmente si no se aborda. Hallazgos aquí informan hoja de ruta de remediación criatura, afectando velocidad de desarrollo futura. Ejecutarse después de auditorías especializadas que generan el contexto de lo que es verdadera deuda.

---

#### **RF-AUDIT-007: Generar Reporte Consolidado con Hallazgos y Plan de Transformación**

**Identificador:** RF-AUDIT-007
**Prioridad:** ALTA
**Dependencias:** RF-AUDIT-001 hasta RF-AUDIT-006 (todas)

**Descripción Completa:**

El sistema debe consolidar todos los análisis anteriores (RF-001 a 006) en un reporte ejecutivo único que presente: (a) evaluación de madurez actual en escala 0-5 por dominio (backend, frontend, QA, specs, deuda técnica), (b) listado priorizado de hallazgos críticos categorizados por impacto (crítica/alta/media/baja), (c) riesgos arquitectónicos identificados con potencial de impacto en escalabilidad, (d) violaciones a Clean/DDD detectadas con ubicación exacta, (e) problemas frontend específicos, (f) problemas QA y testing, (g) desalineaciones con documentación, (h) redundancias estructurales, (i) plan de transformación enterprise-grade priorizado (12-18 meses de hoja de ruta), (j) recomendaciones de arquitectura objetivo. El reporte debe ser técnico (dirigido a líderes técnicos/CTO) pero accesible a stakeholders de negocio. Entrega: documento unificado (.pdf o .md) con formato ejecutivo + detalles técnicos separados.

**Cumplimiento de Criterios de Calidad:**

- **Completo:** ✅ Consolida todos los análisis previos en narrativa coherente
- **Correcto:** ✅ Necesidad de reporte único para tomar decisiones estratégicas
- **Sin Ambigüedad:** ✅ Formato de reporte es claro y estructura es predefinida
- **Verificable:** ✅ Reporte es auditable (cita hallazgos anteriores)
- **Factible:** ✅ Consolidación de información análisis
- **Necesario:** ✅ Crítico para comunicar estado a liderazgo
- **Específico:** ✅ Dominio acotado (consolidación y reporteria)
- **Trazable:** ✅ RF-AUDIT-007

**Criterios de Aceptación (Gherkin):**

```gherkin
CRITERIO-007.1: Consolidar Hallazgos de Todas las Auditorías
  Dado que: auditorías RF-001 a 006 generan hallazgos independientes
  Cuando: se consolidan en categorías comunes
  Entonces: reporte integra hallazgos sin duplicación, con referencias a fuente original (ej. "RF-AUDIT-002: Violación Clean Architecture en file X")

CRITERIO-007.2: Generar Plan de Transformación Priorizado
  Dado que: no todos los hallazgos pueden remediarse simultáneamente
  Cuando: se aplica matriz Prioridad (impacto x esfuerzo) a hallazgos
  Entonces: plan propone hoja de ruta 12-18 meses con releases/fases, estimación de esfuerzo, dependencias entre iniciativas

CRITERIO-007.3: Presentar Métricas de Madurez Antes/Objetivo
  Dado que: línea base actual (0-5) vs. meta objetivo (4-5) en cada dominio
  Cuando: se compilan puntuaciones de RF-001 a 006
  Entonces: reporta matriz: Backend (actual:X, meta:5), Frontend (actual:Y, meta:5), QA (actual:Z, meta:4), Specs (actual:W, meta:4), Deuda (actual:U, meta:4)

CRITERIO-007.4: Validar Coherencia con Lineamientos Definidos
  Dado que: proyecto tiene lineamientos de desarrollo, QA, gobernanza documentados
  Cuando: se validen hallazgos contra esos lineamientos
  Entonces: reporte marca: Alignment=[Low/Medium/High] vs. guidelines definidos (lín-dev, qa, gobernanza)
```

**Métricas de Verificación:**

| Métrica | Método | Criterio Aceptación | Condiciones |
|---------|--------|-----------------------|------------|
| Cobertura hallazgos | Conteo de items reportados vs. análisis | 100% hallazgos de RF 001-006 incluidos en reporte | Consolidación completa |
| Plan de transformación | PMO review + estimación | >=8 iniciativas priorizadas con estimación (story points / meses) | Roadmap 12-18 meses |
| Matriz madurez | Review de puntuaciones | 5 dominios con escala 0-5 + meta objetivo | Antes/Después claramente diferenciados |
| Validez vs. lineamientos | Comparación con guidelines.md | >=85% hallazgos alineados con lineamientos existentes | Cross-reference comprobada |
| Accesibilidad del reporte | Revisión de stakeholders | Ejecutivo (<2 pp.) + detalles técnicos separados | Formato .md o .pdf |

**Prioridad - Justificación:**
ALTA — Consolidación es el punto de decisión para liderazgo. Sin reporte coherente, hallazgos aislados no se convierten en acción. Ejecutarse último después de todos los análisis específicos.

---

### 5.2. Requerimientos No Funcionales (RNF)

---

#### **RNF-REN-001: Tiempo Total de Ejecución de Auditoría**

**Identificador:** RNF-REN-001
**Categoría:** Rendimiento / Performance
**Prioridad:** MEDIA

**Descripción Completa (Cuantificada):**

La auditoría arquitectónica completa debe ejecutarse en un tiempo máximo de **15 días hábiles de esfuerzo concentrado** (equivalente a ~3 sprints de 2 semanas con dedicación del 100% del equipo especializado). Este tiempo incluye: fase diagnóstico (1-2 días), auditoría backend (3-4 días), auditoría frontend (3-4 días), auditoría QA (2-3 días), auditoría spec (1-2 días), deuda técnica (1-2 días), consolidación y reporte (1-2 días). El tiempo máximo de turnaround para entrega de reporte consolidado es **21 días calendario desde inicio**, permitiendo máximo 6 días de overhead (meetings, contexto-switching, revisions).

**Métrica de Verificación:**

| Métrica a Medir | Unidad | Método de Medición | Criterio de Aceptación | Condiciones de Medición |
|-----------------|--------|-------------------|------------------------|------------------------|
| Tiempo total ejecución | Días hábiles | Tracking de timesheet por agente + fase | <=15 días hábiles concentrados | Team dedicado 100%, monorepo en estado actual, acceso a contextos |
| Turnaround reporte | Días calendario | Fecha inicio - fecha reporte final | <=21 días calendario | Incluida revisión de stakeholders |
| Tiempo por fase | Días | Desglose RF-001 a 007 | RF-001:<=2d, RF-002:=3-4d, RF-003:=3-4d, RF-004:=2-3d, RF-005:=1-2d, RF-006:=1-2d, RF-007:=1-2d | Esfuerzo efectivo sin interrupciones |
| Paralelismo | Fases/agentes simultáneas | Observación directa | 4 agentes en paralelo desde RF-001 a 005 | RF-006 secuencial (requiere inputs de otros), RF-007 secuencial final |

---

#### **RNF-COM-001: Compatibilidad con Stack Tecnológico Existente**

**Identificador:** RNF-COM-001
**Categoría:** Compatibilidad / Integración
**Prioridad:** ALTA

**Descripción Completa (Cuantificada):**

La auditoría debe ser compatible 100% con el stack tecnológico definido del proyecto: **.NET 10.0 / ASP.NET Core Minimal API, Next.js 16/React 19, PostgreSQL 16, RabbitMQ 3.x, Docker Compose v2, Java 21, Spring Boot 3.x, Spring WebFlux, R2DBC, xUnit, Jest**. Todos los análisis producen outputs en formatos estándar interoperables (Markdown, JSON, YAML para reportes y datos). Las herramientas de análisis utilizadas (linters, coverage tools, analyzers) deben ser las nativas del stack (.NET → Roslyn analyzers / FxCop, JavaScript → ESLint, Java → PMD/SpotBugs) evitando herramientas externas incompatibles. El 100% de los hallazgos reportados deben ser reproducibles en el stack actual sin requerer dependencias adicionales fuera de las ya declaradas.

**Métrica de Verificación:**

| Métrica a Medir | Unidad | Método de Medición | Criterio de Aceptación | Condiciones de Medición |
|-----------------|--------|-------------------|------------------------|------------------------|
| Herramientas nativas usadas | % de análisis | Auditoría de tools por agente | 100% herramientas nativas del stack | Linters/analyzers declarados en package.json / pom.xml / project files |
| Formatos de output | % de reportes | Inspección manual de archivos entregables | 100% outputs en Markdown/JSON/YAML | Reporte consolidado + datos detallados |
| Reproducibilidad hallazgos | % de hallazgos | Verificación spot-check de muestras | >=95% hallazgos reproducibles en stack actual | Sin setup adicional, sin herramientas externas |
| Dependencias externas | Conteo | Auditoría de scripts de análisis | 0 herramientas adicionales requeridas | Todas las herramientas ya presentes en stack |
| Compatibilidad versiones | Chequeo | Validar contra package.json / pom.xml / *.csproj | Herramientas compatibles con versiones vigentes (+/-1 major) | Stack definido en PROJECT_CONTEXT.md |

---

#### **RNF-REG-001: Cumplimiento de Lineamientos de Gobernanza Documental y Arquitectónica**

**Identificador:** RNF-REG-001
**Categoría:** Regulatorio / Cumplimiento de Estándares
**Prioridad:** ALTA

**Descripción Completa (Cuantificada):**

Toda la auditoría debe realizarse conforme a los lineamientos definidos del proyecto, validando 100% contra: **RULES.md, guidelines.md (dev-guidelines, qa-guidelines), project_architecture.context.md, project_architecture_standards.context.md, reglas-de-oro.md, Definition of Ready/Done, Architecture Decision Records (ADRs)**, y **MD_STYLE_GUIDE.md para documentación**. Cada hallazgo debe citar específicamente qué guideline/estándar viola (ej. "Violación a RULES.md: Lógica de negocio en controller violates SRP"). El reporte consolidado debe incluir tabla de validación cruzada: Hallazgo X → Lineamiento Violado → Severidad. Documento de especificaciones debe escribirse conforme a MD_STYLE_GUIDE.md (sin emojis en encabezados, sentence case, sin ALL-CAPS, español formal). Cumplimiento esperado: **>=95% de hallazgos trazables a lineamiento específico**.

**Métrica de Verificación:**

| Métrica a Medir | Unidad | Método de Medición | Criterio de Aceptación | Condiciones de Medición |
|-----------------|--------|-------------------|------------------------|------------------------|
| Trazabilidad a lineamientos | % de hallazgos | Auditoría de reporte: cada hallazgo cita guideline | >=95% hallazgos con referencia explícita | Cross-reference vs. RULES.md + guidelines.md + context docs |
| Adherencia MD_STYLE_GUIDE | % de reportes | Checklist de MD_STYLE_GUIDE.md aplicado (sección 11) | 100% cumplimiento de estilo | Reporte consolidado + todos los .md generados |
| Validación vs. ADRs | % de hallazgos | Comparación contra ADR-001 a ADR-006 | 0 hallazgos que contradigan ADRs activos (sin aprobación de nuevo ADR) | ADRs en architecture_decision_records.context.md |
| Coherencia DoR/DoD | % de evaluaciones | Inspección de historias versionadas en docs | >=85% de historias posteriores a audit cumplen DoR/DoD | Definition_of_Done.context.md + Definition_of_Ready.context.md |
| Formato documentación | % validación | Aplicación de checklist MD_STYLE_GUIDE.md sección 11 antes de entregar | 100% reportes cumplen estilo (sin emojis, sentence case, español) | Todos los .md del projeto |

---

#### **RNF-MAN-001: Claridad y Reutilizabilidad de Outputs para Futuras Auditorías y Mantenimiento**

**Identificador:** RNF-MAN-001
**Categoría:** Mantenibilidad / Facilidad de Mantenimiento
**Prioridad:** MEDIA

**Descripción Completa (Cuantificada):**

Todos los outputs de la auditoría (reportes, hallazgos, matrices, plan de transformación) deben estar estructurados de forma que sean **100% reutilizables en auditorías posteriores (ej. cada 6-12 meses)** sin requerer reescritura. Cada dato debe estar en formato estructurado (JSON para datos crudos, Markdown para narrativa) permitiendo parsing y difcore. La matriz de hallazgos debe usar identificadores únicos (HALL-XXX) que persistan entre auditorías. El plan de transformación debe incluir criterios de cierre verificables ("Criterio completado cuando: X test pasa, Y métrica <= umbral, Z documento actualizado"). Documentación de cómo se ejecutó cada análisis (scripts usados, parámetros, fecha, versión de herramientas) debe ser registrada para reproducibilidad. **Objetivo: que una auditoría futura pueda ejecutarse en <=50% del tiempo si reutiliza estructura y datos previos.**

**Métrica de Verificación:**

| Métrica a Medir | Unidad | Método de Medición | Criterio de Aceptación | Condiciones de Medición |
|-----------------|--------|-------------------|------------------------|------------------------|
| Estructura de datos reutilizable | % de outputs | Validación de formato (JSON/YAML/Markdown) | 100% outputs en formato estructurado, no narrativa libre | Hallazgos en JSON, plan en YAML, narrativa en Markdown |
| Identificadores únicos persistentes | % de hallazgos | Asignación de HALL-XXX a cada issue | 100% hallazgos con ID único que se mantiene | HALL-001, HALL-002, etc. en reporte |
| Criterios de cierre explícitos | % items plan transformación | Definición de "qué significa completado" | 100% iniciativas con criterio de cierre medible | Plan de transformación verifiable |
| Documentación de metodología | Completitud | Archivo metadata.json con herramientas/versiones/fecha/parámetros | Completa documentación de setup, ejecución, versiones | script_audit.md con instrucciones reproducibles |
| Comparación año-a-año | Factibilidad | Estructura de datos permite tracking de progreso | Hallazgos de 2026 comparables con 2027 usando misma estructura | Identidad persistente de items |

---

#### **RNF-SEG-001: Privacidad, Confidencialidad y Seguridad de Hallazgos Sensibles**

**Identificador:** RNF-SEG-001
**Categoría:** Seguridad / Protección de Datos
**Prioridad:** MEDIA

**Descripción Completa (Cuantificada):**

Toda la auditoría opera bajo principios de privacidad y confidencialidad. Datos sensibles (credenciales, PII, información financiera, tokens) que pudiesen aparecer en código NO deben ser incluidos en reportes públicos — solo referencias anónimas (ej. "Credencial hardcodeada detectada en archivo X:línea Y, tipo: [DATABASE_PASSWORD]" sin mostrar el valor). Hallazgos de vulnerabilidades critiques (OWASP, CWE) deben ser reportados separadamente con acceso restringido (solo liderazgo técnico/security team, no público). El reporte consolidado debe tener **versión pública** (sin hallazgos de seguridad específica) y **versión confidencial** (con detalles completos) claramente marcadas. Audit logs de quién ejecutó la auditoría, cuándo, con qué contexto deben ser mantenidos por trazabilidad. **Cumplimiento esperado: 100% de datos sensibles excluidos de reportes públicos, 0 vulnerabilidades divulgadas sin contexto de mitigación.**

**Métrica de Verificación:**

| Métrica a Medir | Unidad | Método de Medición | Criterio de Aceptación | Condiciones de Medición |
|-----------------|--------|-------------------|------------------------|------------------------|
| Exclusión de datos sensibles | % de selecciones | Audit de reportes en búsqueda de credenciales/PII/tokens | 100% datos sensibles excluidos o enmascarados | Búsqueda automática + manual spot-check |
| Reportes públicos vs. confidenciales | Conteo | Verificar que existen 2 versiones separadas | 2 versiones: [reporte].public.md + [reporte].confidential.md | Marking e-clear de scope (PÚBLICO vs CONFIDENCIAL) |
| Hallazgos de seguridad segregados | % items críticos | Inspección de hallazgos tipo OWASP/CWE | Hallazgos críticos (CVSS >= 7) en reporte confidencial solamente | Solo Security leads/CTO acceso a confidencial |
| Audit trail de ejecución | Completitud | Archivo audit_log.json con timestamp/usuario/contexto | Log comparo de todas las ejecuciones sin brecha | metadata de auditoría incluida |
| Mitigación de vulnerabilidades | % de items | Cada hallazgo crítico incluye recomendación de remediación | 100% hallazgos críticos con mitigation path claro | Guidance específica en reportes |

---

## 6. Resumen de Descomposición

### Requerimientos Funcionales (RF)

| ID | Título | Prioridad | Estado |
|----|--------|-----------|--------|
| RF-AUDIT-001 | Diagnóstico General del Monorepo | ALTA | Específico ✅ |
| RF-AUDIT-002 | Auditoría Arquitectónica Backend | ALTA | Específico ✅ |
| RF-AUDIT-003 | Auditoría Arquitectónica Frontend | ALTA | Específico ✅ |
| RF-AUDIT-004 | Auditoría de Calidad (QA Strategy) | MEDIA-ALTA | Específico ✅ |
| RF-AUDIT-005 | Auditoría de Especificaciones (GAIDD) | MEDIA | Específico ✅ |
| RF-AUDIT-006 | Identificar Deuda Técnica y Redundancias | ALTA | Específico ✅ |
| RF-AUDIT-007 | Reporte Consolidado y Plan Transformación | ALTA | Específico ✅ |

**Total RF:** 7
**Cobertura de alcance original:** ✅ 100% — Todas las fases mencionadas están representadas

### Requerimientos No Funcionales (RNF)

| ID | Título | Categoría | Prioridad | Estado |
|----|--------|-----------|-----------|--------|
| RNF-REN-001 | Tiempo Total de Ejecución | Rendimiento | MEDIA | Cuantificado ✅ |
| RNF-COM-001 | Compatibilidad con Stack Existente | Compatibilidad | ALTA | Cuantificado ✅ |
| RNF-REG-001 | Cumplimiento de Lineamientos | Regulatorio | ALTA | Cuantificado ✅ |
| RNF-MAN-001 | Claridad y Reutilizabilidad de Outputs | Mantenibilidad | MEDIA | Cuantificado ✅ |
| RNF-SEG-001 | Privacidad y Seguridad de Hallazgos | Seguridad | MEDIA | Cuantificado ✅ |

**Total RNF:** 5 — Por subcategoría: REN(1), COM(1), REG(1), MAN(1), SEG(1)
**Todas cuantificadas:** ✅ Sí — Cada RNF incluye métricas específicas, métodos de medición, criterios numéricos

### Totales

- **Total de Requerimientos Derivados:** 12 (7 RF + 5 RNF)
- **Cobertura de Dominio Original:** ✅ Arquitectura, Gobernanza, Escalabilidad, Mantenibilidad, Calidad, Testing, DevOps, Documentación — CUBIERTOS
- **Todos cumpliendo Criterios ESPECÍFICO:** ✅ Sí — Cada uno es implementable directamente sin descomposición adicional

---

## 7. Priorización Sugerida (Roadmap de Ejecución)

**Orden de ejecución recomendado** basado en dependencias y valor de negocio:

```
FASE 1 (Semana 1-2) — Fundacional:
┌─ RF-AUDIT-001 (Diagnóstico Monorepo)           [ALTA]    2 días
│  ├─ RNF-REN-001 (Tiempo max 15 días)          [MEDIA]
│  ├─ RNF-COM-001 (Compatibilidad stack)        [ALTA]
│  └─ RNF-REG-001 (Cumplimiento lineamientos)   [ALTA]

FASE 2 (Semana 2-4) — Análisis Especializados (PARALELO):
├─ RF-AUDIT-002 (Backend)                        [ALTA]    3-4 días
├─ RF-AUDIT-003 (Frontend)                       [ALTA]    3-4 días
├─ RF-AUDIT-004 (QA)                             [MEDIA]   2-3 días
└─ RF-AUDIT-005 (Specs)                          [MEDIA]   1-2 días

FASE 3 (Semana 4-5) — Post-análisis:
├─ RF-AUDIT-006 (Deuda Técnica)                  [ALTA]    1-2 días [depende 002-005]
├─ RNF-MAN-001 (Reutilizabilidad outputs)       [MEDIA]   [continuo]
└─ RNF-SEG-001 (Seguridad + Privacidad)         [MEDIA]   [continuo]

FASE 4 (Semana 5) — Consolidación:
└─ RF-AUDIT-007 (Reporte + Plan Transformación) [ALTA]    1-2 días [depende RF-001 a 006]
```

**Hito intermedio:** RF-001 a RF-005 completados en paralelo (días 1-10).
**Hito crítico:** RF-006 aportando deuda técnica (día 12-14).
**Entrega final:** RF-007 reporte consolidado (día 15).

---

## 8. Dependencias Identificadas

### Dependencias Funcionales (Qué debe completarse antes)

| Requisito | Depende De | Motivo |
|-----------|-----------|--------|
| RF-AUDIT-002 | RF-AUDIT-001 | Backend audit requiere contexto de arquitectura general |
| RF-AUDIT-003 | RF-AUDIT-001 | Frontend audit requiere contexto de arquitectura general |
| RF-AUDIT-004 | RF-AUDIT-001, RF-AUDIT-002, RF-AUDIT-003 | QA audit valida testing que covers hallazgos previos |
| RF-AUDIT-005 | RF-AUDIT-001 | Spec audit requiere entender arquitectura actual |
| RF-AUDIT-006 | RF-AUDIT-001, RF-AUDIT-002, RF-AUDIT-003, RF-AUDIT-004, RF-AUDIT-005 | Deuda técnica consolidate hallazgos de todos los análisis |
| RF-AUDIT-007 | RF-AUDIT-001 a RF-AUDIT-006 (todas) | Reporte final integra outputs de todas las fases |

### Dependencias Técnicas / RNF

| RNF | Depende | Motivo |
|-----|---------|--------|
| RNF-COM-001 | Todas las RF | Stack debe ser compatible en toda la auditoría |
| RNF-REN-001 | Todas las RF | Timeline afecta planificacion de todas las RF |
| RNF-REG-001 | Todas las RF | Lineamientos aplican a todos los análisis |
| RNF-MAN-001 | RF-AUDIT-007 | Consolidación establece estructura reutilizable |
| RNF-SEG-001 | RF-AUDIT-007 | Confidencialidad de hallazgos en reporte final |

### Requisitos Independientes (Pueden ejecutarse en paralelo)

- **RF-AUDIT-002, RF-AUDIT-003, RF-AUDIT-004, RF-AUDIT-005** pueden ejecutar en paralelo después de RF-001
- **RNF-COM-001, RNF-REN-001** deben estar presentes desde inicio (cross-cutting concerns)
- **RNF-MAN-001, RNF-SEG-001** aplican continuamente, no bloquean

---

## 9. Siguientes Pasos Accionables

1. ✅ **Presentar descomposición a stakeholders** (Product Owner, CTO, líderes técnicos) para validación de RF y RNF derivados
2. ✅ **Asignar agentes especializados** a cada RF: agent_backend → RF-002, agent_frontend → RF-003, agent_qa → RF-004, agent_spec → RF-005
3. ✅ **Estimación detallada por RF** en story points / horas / días considerando complejidad del codebase
4. ✅ **Planificar sprints** siguiendo roadmap de 4-5 semanas (FASE 1-4)
5. ✅ **Preparar environment** para auditoría: acceso a repos, herramientas de análisis disponibles, contexto documentado cargado
6. ✅ **Definir criterios de éxito específicos** para cada RF (métricas de verificación ya incluidas)
7. ✅ **Generar respectivas auditorías** ejecutando agent_orchestrator.agent.md con cada RF descompuesto
8. ✅ **Consolidar outputs** en RF-007 según template de reporte ejecutivo
9. ✅ **Validar contra RNF** asegurando cumplimiento de tiempo, compatibilidad, regulatorio, seguridad
10. ✅ **Ejecutar post-audit** dentro de 6-12 meses para validar progreso en plan de transformación

---

## APROBACIÓN Y CIERRE

────════════════════════════════════════════════════════════════

**Requerimiento de Alto Nivel:** AUDIT-ARCH-2026-02-28
**Descomposición:** COMPLETADA ✅
**Artefactos Generados:** 7 RF + 5 RNF (12 requerimientos específicos)
**Estado:** LISTO PARA DISEÑO E IMPLEMENTACIÓN

**Próximo paso:** Utilizar esta descomposición para ejecutar el pipeline completo de auditoría arquitectónica con:

- **agent_orchestrator.agent.md** como coordinador maestro
- **agent_backend.agent.md** para RF-002
- **agent_frontend.agent.md** para RF-003
- **agent_qa.agent.md** para RF-004
- **agent_spec.agent.md** para RF-005

────════════════════════════════════════════════════════════════

**Documento generado:** AUDIT-ARCH-2026-02-28.step_1.evaluation_high_level_requirement.md
**Ubicación:** `.github/docs/output/AUDIT-ARCH-2026-02-28/`
**Evaluador:** Evaluador IEEE — Especialista en Estándares IEEE 830 / ISO 29148
**Fecha:** 28 de febrero de 2026
