# Auditoría de cumplimiento de la rúbrica semana 3

> Evaluación técnica del estado actual del proyecto RLAPP frente a la rúbrica de DevOps, testing multinivel y ecosistema, con evidencia verificable en el repositorio al 8 de marzo de 2026.

---

## 1. Resumen ejecutivo

El proyecto presenta un avance sólido en contenedorización por servicio, documentación de pruebas, separación visual de jobs en GitHub Actions y evidencia histórica de ejecuciones exitosas. Sin embargo, no se puede afirmar que la rúbrica esté completamente cumplida en su estado actual.

Los principales incumplimientos o brechas se concentran en cuatro frentes: ausencia de un `Dockerfile` en la raíz del repositorio, debilidad de la prueba de Caja Negra exigida por la rúbrica dentro del pipeline principal, escaneo de vulnerabilidades no bloqueante y falta de evidencia verificable de release formal con tag semántico ya creado.

En términos de evaluación global, el repositorio se encuentra cerca de un nivel competente, pero todavía no alcanza una condición plenamente defendible para cierre completo de la rúbrica.

## 2. Alcance y método de verificación

La revisión se realizó sobre artefactos verificables del repositorio local:

- Workflows en `.github/workflows/`
- Dockerfiles y `.dockerignore`
- Suites de pruebas backend y frontend
- Documentación de testing y evidencia
- Historial Git local, ramas y tags
- Errores actuales reportados por el editor

Quedaron fuera de verificación directa los elementos que no residen en el repositorio local, como reglas reales de branch protection en GitHub o la existencia efectiva de Pull Requests remotos si no están materializados en artefactos versionados.

## 3. Veredicto general por entregable obligatorio

| Entregable | Estado | Veredicto | Observación principal |
| --- | --- | --- | --- |
| Dockerfile seguro en raíz | Parcial | No cumple | Existen Dockerfiles por servicio, pero no un Dockerfile en raíz |
| Pipeline YAML con jobs separados | Presente | Cumple | La separación visual existe en `ci.yml` |
| TEST_PLAN.md profesional | Presente | Cumple con reservas | Buen nivel técnico, pero con referencias desalineadas |
| Evidencia de ejecución multinivel | Parcial | Cumple con reservas | Existe evidencia útil, pero no está alineada con todas las referencias del plan |
| GitFlow y release formal | Parcial | No cumple | No hay tag local ni release ejecutado verificable |

## 4. Hallazgos principales

### 4.1 Falta el Dockerfile en la raíz

La rúbrica solicita explícitamente un archivo `Dockerfile` optimizado y seguro en la raíz del repositorio. En el estado revisado solo existen:

- `apps/backend/Dockerfile`
- `apps/frontend/Dockerfile`

Esto significa que la solución actual puede ser técnicamente válida para un monorepo, pero no cumple literalmente el entregable exigido.

### 4.2 Los Dockerfiles por servicio están bien encaminados

El backend en `apps/backend/Dockerfile` sí implementa una estructura multi-stage, usa usuario no root, define `HEALTHCHECK` y añade metadatos OCI.

El frontend en `apps/frontend/Dockerfile` también usa multi-stage, separa dependencias, construcción y runtime, y ejecuta la aplicación con usuario no root.

Conclusión: la calidad técnica de los Dockerfiles es buena, pero la ubicación exigida por la rúbrica no está satisfecha.

### 4.3 El pipeline principal separa visualmente los niveles de prueba

El workflow `.github/workflows/ci.yml` define jobs distintos para:

- `lint-and-build`
- `component-tests`
- `smoke-sanity-tests`
- `integration-tests`
- `qa-extended-tests`
- `black-box-tests`
- `image-scan`
- `release`

Este punto sí cumple el requerimiento de diferenciación visual entre componente e integración.

### 4.4 La Caja Negra del pipeline principal es insuficiente para la rúbrica

El job `black-box-tests` del pipeline principal levanta la API con Docker Compose, pero la validación implementada solo comprueba disponibilidad de `health/ready` y del esquema OpenAPI. No ejecuta un flujo de negocio real tipo check-in, error de validación y duplicado como pide la rúbrica.

Esto deja una brecha entre lo que la documentación afirma y lo que el pipeline realmente ejecuta.

### 4.5 Varias pruebas declaradas como Black Box usan infraestructura fake

La clase `WaitingRoomApiFactory` reemplaza PostgreSQL y RabbitMQ con implementaciones in-memory. Por lo tanto, cualquier suite basada en esa fábrica no debe defenderse como integración real ni como Caja Negra pura de infraestructura.

Esto afecta especialmente la narrativa de:

- `SmokeTests`
- `SanityTests`
- `RegressionTests`
- `ApiContractTests`
- varias suites no funcionales

Además, `SanityTests` y otras suites utilizan DTOs internos del backend, lo que reduce aún más el argumento de “desconocimiento de implementación interna”.

### 4.6 Sí existen pruebas de integración reales

No todo el ecosistema de integración está mockeado. Se encontraron pruebas que sí dependen de infraestructura real:

- `PostgresIdempotencyStoreTests`
- `PostgresPatientIdentityRegistryTests`
- `EventDrivenPipelineE2ETests`

Estas piezas sostienen parte de la defensa técnica del nivel de integración real con PostgreSQL y, en ciertos flujos, con RabbitMQ.

### 4.7 La clasificación componente vs integración no está limpia del todo

El problema no es la ausencia de pruebas, sino la mezcla conceptual:

- Hay pruebas ubicadas bajo `WaitingRoom.Tests.Integration` que usan fakes y deberían defenderse como componente o sistema simulado.
- Hay pruebas realmente integradas con infraestructura real.
- Hay una brecha entre nombre del proyecto de tests y naturaleza real de cada suite.

Esto puede ser objetado durante la defensa oral si el instructor pregunta si una prueba concreta es de integración o unitaria/componente.

### 4.8 El escaneo de vulnerabilidades no bloquea el pipeline

Tanto en `.github/workflows/ci.yml` como en `.github/workflows/security.yml`, Trivy está configurado con `exit-code: "0"`.

Eso implica que el job puede terminar en verde incluso si detecta vulnerabilidades de severidad alta o crítica. Para una defensa alineada con “Shift-Left Quality” y bloqueo preventivo de integraciones defectuosas, esta configuración es débil.

### 4.9 Existe evidencia histórica de pipeline en verde

Se encontró evidencia útil en `docs/audits/evidencia/EVIDENCIA_PIPELINE.md`, incluyendo:

- URLs de ejecuciones en GitHub Actions
- resumen de jobs aprobados
- capturas en `docs/audits/evidencia/screenshots/`

Esto fortalece el entregable de evidencia multinivel. Sin embargo, la evidencia no está completamente alineada con las referencias que hace `docs/testing/TEST_PLAN.md`.

### 4.10 El TEST_PLAN está trabajado, pero con desalineaciones documentales

`docs/testing/TEST_PLAN.md` presenta un informe técnico amplio, con:

- estrategia multinivel
- casos de prueba
- aplicación de los siete principios del testing
- mapeo al pipeline
- sección de registro HITL

No obstante, persisten dos problemas documentales:

- contiene un placeholder donde debería ir el enlace final al pipeline
- referencia una ruta de evidencia distinta a la que realmente existe en el repositorio

### 4.11 GitFlow y release no están cerrados como entregable verificable

La revisión local mostró:

- ausencia de tags semánticos locales
- ausencia de una rama `release/v1.0.0`
- job `release` del pipeline con una implementación mínima basada en `echo`
- existencia de una plantilla de PR en `docs/reports/PR_RELEASE_V1.0.0.md`, pero no de un release ejecutado verificable desde este repositorio local

Esto impide afirmar cumplimiento del punto de release formal, versionado y cierre GitFlow.

### 4.12 No se detectaron errores actuales del código en el editor

La validación de errores del workspace no devolvió errores activos al momento de la auditoría. Esto no reemplaza el CI remoto, pero sí indica que la copia local revisada está estable desde la perspectiva del editor.

## 5. Evaluación por criterio de la rúbrica

### 5.1 Infraestructura inmutable y CI/CD

**Estado:** Parcial

Puntos a favor:

- Dockerfiles multi-stage por servicio
- ejecución sin root en backend y frontend
- pipeline con jobs separados
- escaneo de imagen y workflow adicional de seguridad

Brechas:

- falta Dockerfile en raíz
- el escaneo no bloquea por vulnerabilidades altas o críticas
- branch protection no puede verificarse desde el repositorio local

Veredicto: no se puede considerar cumplimiento pleno del nivel experto ni cierre completo del entregable.

### 5.2 Testing multinivel y técnicas

**Estado:** Parcial

Puntos a favor:

- hay separación visual entre componente e integración en el pipeline
- existen suites de componente, integración, smoke, sanity, contract, validation, security y performance
- existen pruebas reales con PostgreSQL y pruebas de pipeline E2E de backend

Brechas:

- varias suites supuestamente Black Box usan `WaitingRoomApiFactory` con fakes
- la Caja Negra del pipeline principal no valida un flujo de negocio real
- persiste mezcla conceptual entre pruebas de componente y de integración bajo el mismo proyecto de tests

Veredicto: hay una base técnica fuerte, pero la defensa frente a la rúbrica sigue siendo vulnerable.

### 5.3 Plan de pruebas como informe

**Estado:** Cumple con reservas

Puntos a favor:

- el archivo existe
- tiene estructura formal
- discute teoría, principios, niveles y técnicas
- incluye casos y matrices útiles para defensa

Brechas:

- placeholder del enlace de ejecución
- referencia documental desalineada con la ubicación real de la evidencia
- algunas afirmaciones del documento son más fuertes que la evidencia ejecutable actual del pipeline principal

Veredicto: el documento es sólido y probablemente suficiente para nivel competente, pero no impecable.

### 5.4 GitFlow y estrategia de release

**Estado:** No cumple

Puntos observados:

- sí hay ramas de feature
- sí hay documentación de release propuesta
- no hay tag semántico local verificable
- no hay evidencia verificable de PR formal de release dentro del repositorio local
- el job `release` no materializa realmente un release

Veredicto: este criterio queda incompleto.

### 5.5 Human Check y validación HITL

**Estado:** Cumple con reservas

Puntos a favor:

- `docs/testing/TEST_PLAN.md` contiene una sección de registro HITL
- `docs/AI_WORKFLOW.md` conserva bastante trazabilidad de trabajo previo
- el repositorio contiene documentación amplia para explicar decisiones

Brechas:

- no existe el archivo específico `docs/HITL_LOG.md` que el plan de equipo proponía como evidencia más clara
- parte de la narrativa documental sobre testing multinivel y Caja Negra es más optimista que lo efectivamente automatizado en el pipeline principal

Veredicto: defendible, pero todavía mejorable.

## 6. Evidencias verificadas

### 6.1 Archivos y rutas clave revisadas

- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.github/workflows/e2e.yml`
- `apps/backend/Dockerfile`
- `apps/frontend/Dockerfile`
- `apps/frontend/package.json`
- `apps/backend/src/Tests/WaitingRoom.Tests.Integration/Infrastructure/WaitingRoomApiFactory.cs`
- `apps/backend/src/Tests/WaitingRoom.Tests.Integration/Infrastructure/PostgresIdempotencyStoreTests.cs`
- `apps/backend/src/Tests/WaitingRoom.Tests.Integration/EndToEnd/EventDrivenPipelineE2ETests.cs`
- `apps/backend/src/Tests/WaitingRoom.Tests.Integration/Functional/SmokeTests.cs`
- `apps/backend/src/Tests/WaitingRoom.Tests.Integration/Functional/SanityTests.cs`
- `apps/backend/src/Tests/WaitingRoom.Tests.Integration/Worker/OutboxDispatcherTests.cs`
- `docs/testing/TEST_PLAN.md`
- `docs/audits/evidencia/EVIDENCIA_PIPELINE.md`
- `docs/reports/PR_RELEASE_V1.0.0.md`

### 6.2 Evidencias Git verificadas localmente

- Rama actual: `develop`
- Existen múltiples ramas `feature/*` y `feat/*`
- No se encontraron tags locales
- No se observó una rama local `release/v1.0.0`

### 6.3 Estado del editor

- No se detectaron errores activos en el workspace durante la auditoría

## 7. Puntos que no pueden confirmarse solo desde esta copia local

Los siguientes aspectos requieren evidencia remota adicional o acceso a configuración del repositorio en GitHub:

- branch protection real sobre `main` o `develop`
- existencia exacta de Pull Requests de release si no quedaron archivados como evidencia completa
- publicación efectiva de un GitHub Release
- validación en vivo de checks remotos obligatorios en la configuración del repositorio

## 8. Conclusión final

El proyecto RLAPP sí demuestra trabajo serio en CI/CD, Docker, testing y documentación. No se trata de un repositorio incompleto ni improvisado. La base técnica es suficiente para sostener una defensa con argumentos sólidos en varios apartados.

Sin embargo, la rúbrica no puede darse por completamente cumplida en el estado actual del repositorio. Las brechas más importantes son concretas y verificables: falta el `Dockerfile` en la raíz, la Caja Negra del pipeline principal no prueba aún un flujo de negocio real, el escaneo de vulnerabilidades no bloquea, y el release formal con tag no está materializado como evidencia verificable.

Si la evaluación fuera estrictamente literal, el estado más preciso sería: cumplimiento parcial con fortalezas claras, pero sin cierre completo de la rúbrica.

## 9. Recomendaciones prioritarias

1. Crear un `Dockerfile` en la raíz o justificar formalmente su ausencia con aceptación explícita del evaluador.
2. Reemplazar el job `black-box-tests` por un flujo HTTP real de negocio contra la API levantada en contenedor.
3. Configurar Trivy para fallar el pipeline ante vulnerabilidades `HIGH` o `CRITICAL` cuando la política del curso lo permita.
4. Cerrar el flujo GitFlow con rama de release, tag semántico y evidencia versionada.
5. Alinear `docs/testing/TEST_PLAN.md` con la ubicación real de la evidencia y retirar placeholders.
