# Plan de trabajo equipo: Semana 3 - DevOps, testing multinivel y ecosistema

## 1. Objetivo general

Llevar el proyecto RLAPP desde su estado local funcional hasta un ecosistema profesional con infraestructura inmutable, pipeline CI/CD multinivel y estrategia de pruebas madura. Se debe demostrar dominio sobre los 7 principios del testing, diferenciacion entre niveles de prueba (componente e integracion), tecnicas de Caja Blanca y Caja Negra, seguridad de imagen Docker y flujo GitFlow con release formal.

## 2. Diagnostico del estado actual

### 2.1 Dockerfiles

| Aspecto | Backend (`rlapp-backend/Dockerfile`) | Frontend (`rlapp-frontend/Dockerfile`) |
| --- | --- | --- |
| Multi-stage | Si (build + runtime) | No (imagen unica `node:20-slim`) |
| Imagen base | `mcr.microsoft.com/dotnet/nightly/aspnet:10.0` | `node:20-slim` |
| Usuario no-root | No (corre como root) | No (corre como root) |
| Escaneo de vulnerabilidades | No existe | No existe |
| Optimizacion de capas | Aceptable (restore separado del publish) | Deficiente (copia todo sin separar dependencias de codigo) |
| Estado | Funcional pero inseguro | Solo modo desarrollo, sin build de produccion |

### 2.2 Tests existentes

| Capa | Proyecto/Carpeta | Archivos de test | Tipo actual | Cobertura |
| --- | --- | --- | --- | --- |
| Dominio backend | `WaitingRoom.Tests.Domain` | 5 | Caja Blanca (unitario) | Sin reporte |
| Aplicacion backend | `WaitingRoom.Tests.Application` | 2 | Caja Blanca (unitario) | Sin reporte |
| Proyecciones backend | `WaitingRoom.Tests.Projections` | 2 | Caja Blanca (unitario) | Sin reporte |
| Integracion backend | `WaitingRoom.Tests.Integration` | 13 | Mixto: usa `WaitingRoomApiFactory` con fakes in-memory (son componente, no integracion real) + E2E pipeline que requiere infra real | Sin reporte |
| Frontend componente | `rlapp-frontend/test/` | 71 archivos | Caja Blanca (unitario/componente) con Jest + RTL + MSW | Lines: 83.96%, Statements: 81.61%, Branches: 70.56% |
| Frontend E2E | `rlapp-frontend/test/e2e/` | 2 | Playwright (Caja Negra parcial) | Sin reporte separado |

### 2.3 Hallazgos criticos

1. **No existe directorio `.github/workflows/`**: no hay CI/CD alguno.
2. **No hay tags ni releases**: `git tag -l` vacio; no hay versionado semantico.
3. **Ambos Dockerfiles corren como root**: riesgo de seguridad critico.
4. **Frontend Dockerfile es solo de desarrollo**: no tiene build de produccion (multi-stage).
5. **Tests de integracion backend usan fakes in-memory**: `WaitingRoomApiFactory` reemplaza PostgreSQL y RabbitMQ con fakes, lo cual los convierte tecnicamente en pruebas de componente, no de integracion real.
6. **No hay prueba de Caja Negra ejecutable en contenedor**: la prueba E2E de Playwright requiere `RUN_LIVE_E2E` y no esta integrada en ningun pipeline.
7. **No hay escaneo de vulnerabilidades de imagen Docker** (ni Trivy, ni Docker Scout, ni Snyk).
8. **Convenciones de ramas inconsistentes**: mezcla de `feat/`, `feature/`, `fix/`, `refac/` sin estandar claro.

## 3. Entregables obligatorios y responsables

| ID | Entregable | Criterio de rubrica | Responsable | Apoyo | Prioridad |
| --- | --- | --- | --- | --- | --- |
| E0 | Dockerfile(s) optimizado(s) accesibles desde raiz | La rubrica pide "Dockerfile en la raiz del repositorio". Ver nota abajo. | Jhorman | Leopoldo | Alta |
| E1 | Dockerfile backend optimizado y seguro | Multi-stage, no-root, escaneo | Jhorman | Leopoldo | Alta |
| E2 | Dockerfile frontend optimizado y seguro | Multi-stage (build+prod), no-root, escaneo | Jhorman | Leopoldo | Alta |
| E3 | Pipeline CI/CD en `.github/workflows/ci.yml` | Jobs separados: component, integration, black-box, lint, scan | Jhorman | Leopoldo | Alta |
| E4 | Pruebas de componente backend (Caja Blanca) claramente separadas | xUnit con fakes, sin infra real | Leopoldo | Jhorman | Alta |
| E5 | Pruebas de integracion backend reales | Comunicacion real con PostgreSQL y/o RabbitMQ en CI (services de GitHub Actions) | Leopoldo | Jhorman | Alta |
| E6 | Prueba de Caja Negra backend via API | HTTP request contra API levantada en contenedor, sin conocer implementacion interna | Leopoldo | Jhorman | Alta |
| E7 | Pruebas de componente frontend (Caja Blanca) en CI | Jest + RTL corriendo en job separado del pipeline | Jhorman | Leopoldo | Media |
| E8 | `TEST_PLAN.md` como informe profesional | Test Suites, Test Cases, 7 principios, estrategia multinivel, tecnicas aplicadas | Jhorman (redaccion) | Leopoldo (casos backend) | Alta |
| E9 | Evidencia de ejecucion en verde | Enlace/captura del pipeline exitoso con todos los jobs visibles | Ambos | Ambos | Alta |
| E10 | GitFlow + Release formal | PR de develop a main, tag semantico, artefacto versionado | Ambos | Ambos | Alta |
| E11 | Registro de decisiones IA vs Humano | Documentar que genero la IA y que se audito/modifico (HITL) | Ambos | Ambos | Alta |

### 3.1 Nota sobre Dockerfile en la raiz (requisito 4.1 de la rubrica)

La rubrica pide "Archivo Dockerfile optimizado y seguro en la raiz del repositorio". Al ser un monorepo con backend (.NET) y frontend (Next.js), existen dos opciones:

- **Opcion A (recomendada)**: Crear un `Dockerfile` en la raiz que actue como multi-target build usando `--build-arg TARGET=api|frontend|worker`. De esta forma hay un unico Dockerfile en la raiz que cumple literalmente el requisito.
- **Opcion B**: Mantener los Dockerfiles en subdirectorios (`rlapp-backend/Dockerfile`, `rlapp-frontend/Dockerfile`) y justificar en la defensa que en un monorepo profesional cada servicio tiene su propio Dockerfile junto a su codigo fuente. Documentar esta decision en el `TEST_PLAN.md` como parte de la estrategia de inmutabilidad.

**Decision**: Evaluar con Leopoldo cual opcion tomar. Si se elige Opcion A, Jhorman crea el Dockerfile raiz. Si se elige Opcion B, preparar la justificacion tecnica para la defensa.

## 4. Plan detallado por responsable

### 4.1 Jhorman: frontend, infraestructura Docker, CI/CD, documentacion

#### Tarea J1: Endurecer Dockerfile backend

**Estado actual**: Multi-stage funcional pero corre como root, sin escaneo.

**Acciones**:
1. Agregar usuario no-root en la etapa `final`:
   - `RUN adduser --disabled-password --gecos '' --uid 1001 appuser`
   - `USER appuser`
2. Agregar metadata con `LABEL` (maintainer, version, description).
3. Agregar `.dockerignore` en `rlapp-backend/` para excluir `bin/`, `obj/`, `*.md`, `tests/`.
4. Verificar que el healthcheck (`curl`) sigue funcionando con usuario no-root.

**Archivos a modificar**: `rlapp-backend/Dockerfile`, crear `rlapp-backend/.dockerignore`.

#### Tarea J2: Reescribir Dockerfile frontend (multi-stage produccion)

**Estado actual**: Imagen unica de desarrollo (`node:20-slim`), no hay build de produccion.

**Acciones**:
1. Crear Dockerfile multi-stage:
   - Etapa 1 (`deps`): instalar dependencias con `npm ci`.
   - Etapa 2 (`builder`): ejecutar `next build` para generar el artefacto standalone.
   - Etapa 3 (`runner`): imagen minima `node:20-alpine`, copiar solo `.next/standalone` y `.next/static`, usuario no-root.
2. Agregar `.dockerignore` en `rlapp-frontend/` para excluir `node_modules/`, `.next/`, `coverage/`, `test/`.
3. Mantener el Dockerfile de desarrollo actual renombrado como `Dockerfile.dev` si se requiere hot-reload local.

**Archivos a crear/modificar**: `rlapp-frontend/Dockerfile`, crear `rlapp-frontend/.dockerignore`, opcionalmente `rlapp-frontend/Dockerfile.dev`.

#### Tarea J3: Crear pipeline CI/CD (`.github/workflows/ci.yml`)

**Estado actual**: No existe ningun workflow.

**Estructura propuesta del YAML con jobs separados y visibles**:

```
Trigger: push a develop, PR a develop y main.

Jobs (en orden de dependencia):

1. lint-and-build
   - Checkout
   - Setup .NET 10 + Node 20
   - Backend: dotnet build
   - Frontend: npm ci && npm run lint && npm run build
   - Artefacto: subir build frontend como artifact

2. component-tests (depende de lint-and-build)
   - Backend: dotnet test --filter "Category!=Integration&Category!=E2E"
     (proyectos Domain, Application, Projections + tests de API con fakes)
   - Frontend: npm run test:ci (Jest con cobertura)
   - Publicar reportes de cobertura como artifacts

3. integration-tests (depende de lint-and-build)
   - services: postgres:16-alpine + rabbitmq:3.12-management-alpine
   - Backend: dotnet test --filter "Category=Integration"
     (tests que requieren DB/broker reales)
   - Publicar reporte como artifact

4. black-box-tests (depende de integration-tests)
   - Levantar API en contenedor con docker compose (solo postgres + rabbitmq + api)
   - Ejecutar requests HTTP contra API real (sin conocer internos)
   - Puede usar curl/httpie o un script de test dedicado
   - Publicar resultados

5. image-scan (depende de lint-and-build)
   - docker build de backend y frontend
   - Ejecutar Trivy o Docker Scout contra ambas imagenes
   - Fallar si hay vulnerabilidades criticas/altas
   - Publicar reporte SARIF como artifact

6. release (solo en merge a main, depende de todos los anteriores)
   - Crear tag semantico
   - Generar GitHub Release con changelog
```

**Reportes visibles en el PR (rubrica: "reportes detallados")**:
- Usar `actions/upload-artifact` para subir reportes de cobertura (HTML/JSON) y SARIF de escaneo.
- Configurar `dorny/test-reporter` o `EnricoMi/publish-unit-test-result-action` para que los resultados de tests aparezcan como checks comentados directamente en el PR (no solo como artifacts descargables).
- En el job `image-scan`, usar `github/codeql-action/upload-sarif` para que las vulnerabilidades aparezcan en la pestana Security del repositorio.

**Shift-Left: Bloqueo de merges defectuosos (rubrica: "bloquea merges")**:
- En Settings > Branches > Branch protection rules para `main`:
  - Require a pull request before merging.
  - Require status checks to pass: `lint-and-build`, `component-tests`, `integration-tests`, `black-box-tests`, `image-scan`.
  - Require branches to be up to date before merging.
  - Dismiss stale pull request approvals when new commits are pushed.
  - Require at least 1 approval.
- En `develop` (opcional): Require status checks `lint-and-build` y `component-tests`.

**Archivos a crear**: `.github/workflows/ci.yml`.

#### Tarea J4: Pruebas de componente frontend en CI

**Estado actual**: 71 archivos de test con 81.6% cobertura de statements; ya funciona localmente.

**Acciones**:
1. Verificar que `npm run test:ci` genera reportes en `test-results/` y `coverage/`.
2. Confirmar que no hay tests que dependan implicitamente de infraestructura real (todos usan MSW/mocks).
3. Agregar un script `test:component` en `package.json` que excluya explicitamente E2E:
   - `"test:component": "jest --ci --coverage --testPathIgnorePatterns='e2e'"`.
4. Asegurar que el job `component-tests` del pipeline ejecute este script.

**Archivos a modificar**: `rlapp-frontend/package.json`.

#### Tarea J5: Redactar `TEST_PLAN.md`

**Estado actual**: No existe.

**Estructura del informe**:

```
1. Introduccion y alcance
2. Estrategia multinivel
   - Nivel 1: Pruebas unitarias/componente (Caja Blanca)
   - Nivel 2: Pruebas de integracion (Caja Blanca + Negra)
   - Nivel 3: Pruebas E2E/Black-box (Caja Negra)
3. Aplicacion de los 7 principios del testing
   - P1: Las pruebas muestran la presencia de defectos
   - P2: Las pruebas exhaustivas son imposibles
   - P3: Testing temprano (shift-left)
   - P4: Agrupacion de defectos
   - P5: Paradoja del pesticida
   - P6: Las pruebas dependen del contexto
   - P7: La ausencia de errores es una falacia
4. Tecnicas de prueba aplicadas
   - Caja Blanca: cobertura de flujo, condiciones, ramas
   - Caja Negra: particion de equivalencia, valores limite, flujo API
5. Test Suites y Test Cases (tabla detallada)
   - Backend: Domain, Application, Projections, Integration, E2E
   - Frontend: Components, Hooks, Services, Pages, E2E
6. Mapeo al pipeline CI/CD
   - Que se ejecuta en cada job
7. Criterios de entrada y salida
8. Metricas objetivo
```

**Archivos a crear**: `TEST_PLAN.md` (raiz del repositorio).

#### Tarea J6: Configurar GitFlow y release

**Acciones**:
1. Limpiar ramas locales obsoletas; estandarizar prefijos (`feature/`, `fix/`, `release/`, `hotfix/`).
2. Mergear trabajo actual a `develop`.
3. Crear rama `release/v1.0.0` desde `develop`.
4. Crear PR formal de `release/v1.0.0` a `main` con descripcion detallada (ver plantilla abajo).
5. Al mergear, crear tag `v1.0.0` y GitHub Release con changelog.
6. Configurar branch protection en `main`: required status checks + require PR + dismiss stale reviews.

**Plantilla del PR de Release (rubrica: "agrupa features, dispara pipeline, versiona")**:

```markdown
## Release v1.0.0

### Features incluidas
- feature/hardened-dockerfiles: Dockerfiles multi-stage, no-root, escaneo
- feature/ci-pipeline: Pipeline CI/CD multinivel con 6 jobs
- feature/test-classification: Tests clasificados componente vs integracion
- feature/black-box-test: Prueba de Caja Negra via API en contenedor
- feature/test-plan: TEST_PLAN.md con informe profesional

### Evidencia de pipeline
- [Enlace a la ejecucion en verde del pipeline]
- Todos los jobs: lint-and-build, component-tests, integration-tests,
  black-box-tests, image-scan pasaron exitosamente.

### Versionado
- Tag: v1.0.0
- Imagenes: rlapp-api:v1.0.0, rlapp-frontend:v1.0.0
```

#### Tarea J7: Capturar y almacenar evidencia de ejecucion (requisito 4.4)

**Rubrica**: "Enlace directo o captura del pipeline en verde, demostrando la ejecucion exitosa de pruebas (Caja Negra y Caja Blanca), linter, analisis de vulnerabilidades de imagen y build."

**Acciones**:
1. Una vez el pipeline pase en verde, copiar la URL directa de la ejecucion (ejemplo: `https://github.com/<org>/rlapp/actions/runs/<id>`).
2. Tomar capturas de pantalla de:
   - Vista general con todos los jobs en verde.
   - Detalle del job `component-tests` mostrando tests de Caja Blanca.
   - Detalle del job `black-box-tests` mostrando la prueba de Caja Negra.
   - Detalle del job `image-scan` mostrando resultado de Trivy/Scout.
3. Almacenar capturas en `docs/evidencia/` y referenciarlas en el PR de release.
4. Incluir enlace en `TEST_PLAN.md` seccion de mapeo al pipeline.

### 4.2 Leopoldo: backend, tests de componente e integracion, Caja Negra

#### Tarea L1: Clasificar y separar tests backend existentes

**Estado actual**: 4 proyectos de test, pero `WaitingRoom.Tests.Integration` mezcla tests con fakes in-memory (son componente) y tests que requieren infra real.

**Acciones**:
1. En `WaitingRoom.Tests.Integration`, agregar atributos `[Trait("Category", "Integration")]` a los tests que requieren DB/broker reales (carpetas `Infrastructure/`, `EndToEnd/`).
2. Agregar `[Trait("Category", "Component")]` a los tests en `API/` que usan `WaitingRoomApiFactory` con fakes.
3. Verificar que los proyectos `Domain`, `Application` y `Projections` no necesitan infraestructura externa (ya son componente puros).
4. Crear un script o filtro para que el CI pueda ejecutar `dotnet test --filter "Category!=Integration"` (solo componente) y `dotnet test --filter "Category=Integration"` (solo integracion).

**Archivos a modificar**: archivos `*Tests.cs` en `WaitingRoom.Tests.Integration/API/` y `WaitingRoom.Tests.Integration/EndToEnd/`.

#### Tarea L2: Implementar pruebas de integracion reales

**Estado actual**: `EventDrivenPipelineE2ETests` ya tiene logica para infra real pero necesita conexion a PostgreSQL/RabbitMQ reales.

**Acciones**:
1. Asegurar que los tests E2E y de `Infrastructure/` (PostgresIdempotencyStoreTests, PostgresPatientIdentityRegistryTests) lean la cadena de conexion desde variable de entorno para que funcionen en CI con services de GitHub Actions.
2. Agregar seed/migracion automatica que cree las tablas necesarias en la DB de test (`rlapp_waitingroom_test`).
3. Verificar que los tests de `Worker/OutboxDispatcherTests` realmente publican a RabbitMQ o marcar claramente como componente si usan fakes.
4. Ejecutar localmente con `docker compose` levantando solo postgres + rabbitmq para validar.

**Archivos a modificar**: `WaitingRoom.Tests.Integration/EndToEnd/`, `WaitingRoom.Tests.Integration/Infrastructure/`, posiblemente `TestCollectionSettings.cs`.

#### Tarea L3: Crear prueba de Caja Negra via API

**Estado actual**: No existe una prueba que trate la API como caja negra pura.

**Acciones**:
1. Crear un nuevo archivo de test o script que:
   - Envie un POST HTTP con JSON de check-in a `http://localhost:5000/api/v1/waiting-room/check-in`.
   - Solo valide: codigo HTTP 200, que el body tenga `queueId` no vacio, que la respuesta sea JSON valido.
   - No conozca ni importe ningun tipo interno del backend (.NET classes, DTOs, etc.).
2. Opciones de implementacion:
   - **Opcion A**: Script bash/curl que se ejecute en el job `black-box-tests` del pipeline contra la API levantada en contenedor.
   - **Opcion B**: Archivo de test xUnit con `HttpClient` puro (sin `WaitingRoomApiFactory`) que apunte a URL externa configurable.
3. Agregar al menos 3 escenarios:
   - Caso exitoso: check-in con datos validos retorna 200.
   - Caso de error: check-in con datos faltantes retorna 400.
   - Caso de negocio: check-in duplicado (mismo paciente) retorna respuesta coherente.

**Archivos a crear**: `rlapp-backend/src/Tests/WaitingRoom.Tests.Integration/BlackBox/` o `scripts/black-box-test.sh`.

#### Tarea L4: Aportar Test Cases backend para `TEST_PLAN.md`

**Acciones**:
1. Documentar cada Test Suite backend con: nombre, nivel, tecnica (Caja Blanca o Negra), cantidad de casos, objetivo.
2. Para cada Test Case relevante, describir en formato Given-When-Then.
3. Indicar que principio del testing se evidencia (ejemplo: "los tests de idempotencia reflejan el Principio 5: paradoja del pesticida, ya que agregamos variantes para evitar que los mismos inputs siempre pasen").

**Entrega**: Texto en formato Markdown que Jhorman integrara en `TEST_PLAN.md`.

## 5. Defensa y Human Check: preparacion por tema

### 5.1 Matriz de defensa por tema

| Tema de la defensa | Jhorman responde | Leopoldo responde |
| --- | --- | --- |
| Estructura del pipeline y por que tiene jobs separados | Explicar YAML, dependencias entre jobs, artefactos publicados | Apoyar con como los tests backend se filtran por categoria |
| Diferenciar prueba de integracion real vs componente con fakes | Por que los tests de frontend con MSW son componente y no integracion | Por que `WaitingRoomApiFactory` con fakes es componente; por que `PostgresIdempotencyStoreTests` con DB real es integracion |
| Identificar la prueba de Caja Negra y justificarla | Mostrar que el script/test no importa tipos internos del backend | Explicar el escenario: solo HTTP request y validacion de contrato |
| Deteccion de vulnerabilidades en imagen Docker | Mostrar salida de Trivy/Scout en el pipeline, explicar severidades | Confirmar que la imagen backend no expone secretos ni corre como root |
| 7 principios del testing | Argumentar P2 (imposibilidad de exhaustividad: 71 tests frontend priorizan rutas criticas), P6 (contexto: event sourcing requiere tests de idempotencia y replay) | Argumentar P4 (agrupacion: la mayoria de bugs se concentran en el dominio/eventos), P5 (pesticida: se agregan variantes a tests de check-in para evitar falsos positivos) |
| Validacion HITL: explicar linea a linea lo que genero la IA | Explicar decisiones de Dockerfile y pipeline; que se audito vs que se acepto directo | Explicar decisiones de fakes vs infra real; que pruebas fueron generadas y como se validaron |

### 5.2 Guion preparado para Principio 6 (pregunta obligatoria del instructor)

El instructor preguntara: "Expliquen como es el diseno actual de su pipeline y su plan de pruebas, y como justifican sus decisiones bajo el Principio 6 (Contexto)."

**Respuesta sugerida (ambos)**:

> Nuestro contexto es un sistema de gestion de sala de espera medica con Event Sourcing + CQRS + Outbox Pattern. Esto implica que:
>
> 1. **Los tests de dominio son criticos**: El agregado `WaitingQueue` maneja transiciones de estado del paciente (check-in, llamado a caja, pago, consulta, completado). Un error aqui corrompe el event store de forma irrecuperable. Por eso tenemos 5 archivos de tests de dominio con cobertura exhaustiva de Value Objects y transiciones.
>
> 2. **La idempotencia es vital**: Al ser un sistema medico con comunicacion asincrona (Outbox + RabbitMQ), los mensajes pueden reenviarse. Nuestros tests de idempotencia (`CheckInIdempotencyTests`, `PatientCheckedInIdempotencyTests`) son pruebas de componente e integracion que validan que el sistema es resistente a duplicados.
>
> 3. **El frontend opera en tiempo real**: Los dashboards muestran turnos via SignalR/WebSocket. Los tests de componente con MSW simulan la respuesta de la API sin depender del backend real, lo cual es apropiado para este nivel porque validamos la logica de renderizado y estado, no la comunicacion de red.
>
> 4. **La prueba de Caja Negra ejecuta contra la API real en contenedor**: El contexto clinico exige que validemos el flujo completo desde la perspectiva del usuario de la API (recepcionista registrando un paciente), sin asumir nada sobre la implementacion interna.
>
> En resumen, el Principio 6 nos llevo a invertir mas en tests de dominio e idempotencia que en tests de UI triviales, porque nuestro contexto (Event Sourcing + sistema medico) penaliza mucho mas un error de estado que un error visual.

### 5.3 Guia de estudio linea-a-linea (requisito 6.3 del formato: "explicar linea a linea")

Cada miembro debe poder explicar bloque por bloque los artefactos generados con apoyo de IA:

**Jhorman debe dominar**:

| Bloque del Dockerfile backend | Que explicar |
| --- | --- |
| `FROM mcr.microsoft.com/dotnet/nightly/sdk:10.0 AS build` | Por que SDK solo en build y no en runtime; por que nightly (NET 10 preview). |
| `RUN dotnet restore ${PROJECT}` | Caching de capas: restore separado de publish para que las dependencias se cacheen. |
| `FROM mcr.microsoft.com/dotnet/nightly/aspnet:10.0 AS final` | Imagen runtime mas ligera; no incluye SDK. |
| `RUN adduser ... && USER appuser` | Principio de minimo privilegio; por que UID 1001; que pasa si se omite. |
| `ENTRYPOINT ["sh", "-c", "dotnet /app/$APP_DLL"]` | Por que shell form con `sh -c` (expansion de variables); riesgo vs exec form. |

| Bloque del Dockerfile frontend | Que explicar |
| --- | --- |
| Etapa `deps`: `npm ci` | Diferencia entre `npm ci` y `npm install`; por que `ci` en CI/CD. |
| Etapa `builder`: `next build` | Que genera la carpeta `.next/standalone`; por que standalone reduce imagen. |
| Etapa `runner`: `node:20-alpine` | Por que alpine en runtime; que se pierde (glibc vs musl). |
| `COPY --from=builder` | Solo copiar artefactos necesarios; no incluir devDependencies ni source. |

| Bloque del YAML pipeline | Que explicar |
| --- | --- |
| `on: pull_request: branches: [main, develop]` | Shift-Left: se ejecuta en cada PR, no solo en merge. |
| `services: postgres:` en integration-tests | GitHub Actions levanta un contenedor de PostgreSQL real como servicio. |
| `needs: [lint-and-build]` | Dependencia entre jobs; por que no correr todo en paralelo desde el inicio. |
| `dorny/test-reporter` o similar | Publica resultados visibles en el PR como checks, no solo artifacts descargables. |
| Trivy `--exit-code 1 --severity CRITICAL,HIGH` | Falla el pipeline si hay vulnerabilidades criticas; Shift-Left en seguridad. |

**Leopoldo debe dominar**:

| Bloque del test | Que explicar |
| --- | --- |
| `[Trait("Category", "Integration")]` | Mecanismo de filtrado de xUnit; como el CI lo usa con `--filter`. |
| `WaitingRoomApiFactory` con fakes | Por que esto es componente y NO integracion: reemplaza toda la infra con in-memory. |
| `PostgresIdempotencyStoreTests` | Por que esto SI es integracion: se conecta a PostgreSQL real via connection string. |
| Prueba de Caja Negra (curl/HttpClient) | No importa ningun namespace del backend; solo valida contrato HTTP (status + JSON). |
| `InMemoryEventStore` vs `EventStore` real | Diferencia entre fake (para componente) e infra real (para integracion). |

### 5.4 Registro de decisiones IA vs Humano (requisito HITL rubrica 5.0)

Cada miembro debe mantener un registro breve de que delego a la IA y que audito/modifico. Formato sugerido:

```markdown
| Artefacto | Genero la IA | Audite/Modifique el humano | Alucinacion detectada |
| --- | --- | --- | --- |
| Dockerfile backend (no-root) | Si, primera version | Corregi UID y verifique permisos de curl | IA sugirio `useradd` que no existe en Debian slim; corregi a `adduser` |
| Pipeline YAML | Si, esqueleto inicial | Ajuste nombres de services, versiones de actions, filtro de tests | IA puso `postgres:latest` en vez de `postgres:16-alpine`; corregi |
| Prueba Caja Negra | Si, 3 escenarios | Valide que no importa tipos internos; ajuste URL | Ninguna |
| TEST_PLAN.md | Si, estructura | Reescribi argumentacion de Principio 6 con contexto real del proyecto | IA genero argumentacion generica; reescribi con datos del event store |
```

Este registro se incluye como anexo en `TEST_PLAN.md` o como archivo separado `docs/HITL_LOG.md`.

## 6. Orden de ejecucion recomendado

| Paso | Tarea | Responsable | Bloquea a |
| --- | --- | --- | --- |
| 1 | L1: Clasificar tests backend con `Trait` | Leopoldo | Paso 5 (pipeline) |
| 2 | J1: Endurecer Dockerfile backend (no-root, metadata) | Jhorman | Paso 5 (pipeline) |
| 3 | J2: Reescribir Dockerfile frontend (multi-stage) | Jhorman | Paso 5 (pipeline) |
| 4 | L2: Implementar integracion real con DB/Rabbit | Leopoldo | Paso 5 (pipeline) |
| 5 | J3: Crear pipeline CI/CD | Jhorman | Paso 9 (evidencia) |
| 6 | L3: Crear prueba de Caja Negra via API | Leopoldo | Paso 5 (pipeline) |
| 7 | J4: Pruebas frontend en CI | Jhorman | Paso 9 (evidencia) |
| 8 | J5 + L4: Redactar TEST_PLAN.md | Jhorman + Leopoldo | Paso 10 (defensa) |
| 9 | J6: GitFlow + Release + tag v1.0.0 | Ambos | Paso 10 (defensa) |
| 10 | Defensa: preparar argumentacion | Ambos | Entrega final |

## 7. Mapeo rubrica a entregables (verificacion cruzada)

| Criterio rubrica | Nivel Senior (5.0) requerido | Entregable que lo cubre | Tarea |
| --- | --- | --- | --- |
| Infraestructura Inmutable: Dockerfile impecable | Multi-stage, ligero, no-root, escaneo de vulnerabilidades | E0, E1, E2 | J1, J2 |
| Infraestructura Inmutable: Pipeline modular | Jobs separados Componente vs Integracion, reportes detallados | E3 | J3 |
| Infraestructura Inmutable: Bloquea merges | Branch Protection con required status checks | E3 (config) | J6 |
| Testing Multinivel: Caja Blanca | Tests unitarios/componente ejecutandose en CI | E4, E7 | L1, J4 |
| Testing Multinivel: Caja Negra (flujo API real) | Al menos 1 prueba HTTP contra API en contenedor sin conocer internos | E6 | L3 |
| Testing Multinivel: Diferencia fisica Component vs Integration | Jobs separados en el pipeline + filtros `Trait` en backend | E3, E4, E5 | J3, L1, L2 |
| TEST_PLAN.md: Informe impecable | Test Suites, Test Plan, Test Cases claros | E8 | J5, L4 |
| TEST_PLAN.md: 7 Principios justificados | Argumentacion profunda aplicada al proyecto | E8 | J5, L4 |
| TEST_PLAN.md: Estrategia Multinivel y Tipos de Pruebas | Describir cada nivel y tecnica (Caja Blanca/Negra) con ejemplos | E8 | J5, L4 |
| GitFlow: PR formal develop a main | PR con features agrupadas, dispara pipeline, tag, release | E10 | J6 |
| GitFlow: Versionado semantico | Tag v1.0.0 + GitHub Release | E10 | J6 |
| Human Check: Argumentacion tecnica profunda | Explicar decisiones, diferenciar integracion real vs mock | E11, sec. 5 | L4, todos |
| Human Check: Identificar alucinaciones IA | Registro HITL_LOG.md con correcciones | E11 | Ambos |
| Human Check: Explicar linea a linea | Guia de estudio por bloques (sec. 5.3) | Defensa | Ambos |

## 8. Checklist de entrega final

### 8.1 Entregables obligatorios (seccion 4 de la rubrica)

- [ ] **4.1** Dockerfile(s) optimizado(s) y seguro(s): multi-stage, usuario no-root, `.dockerignore`, `LABEL`, accesible(s) desde raiz.
- [ ] **4.2** `.github/workflows/ci.yml` con jobs visualmente separados: `lint-and-build`, `component-tests`, `integration-tests`, `black-box-tests`, `image-scan`, `release`.
- [ ] **4.3** `TEST_PLAN.md` como informe profesional: Test Suites, Test Cases (GWT), 7 Principios argumentados, Estrategia Multinivel, Tipos de Pruebas.
- [ ] **4.4** Evidencia de ejecucion: URL del pipeline en verde + capturas en `docs/evidencia/` mostrando Caja Negra, Caja Blanca, linter, scan y build.
- [ ] **4.5** GitFlow: PR formal `develop` a `main` con release, tag `v1.0.0`, features agrupadas, pipeline disparado.

### 8.2 Criterios de calidad para nivel 5.0

- [ ] Ambos Dockerfiles corren con usuario no-root (verificar con `docker exec <container> whoami`).
- [ ] Imagen frontend pesa menos de 200MB (verificar con `docker images`).
- [ ] Escaneo de imagen con Trivy/Scout integrado en pipeline y publicado como SARIF.
- [ ] Tests backend clasificados con `[Trait("Category", "...")]` y filtrados separadamente.
- [ ] Al menos 1 prueba de Caja Negra que no importe NINGUN tipo del backend.
- [ ] Reportes de tests visibles como checks en el PR (no solo artifacts descargables).
- [ ] Branch protection en `main` con required status checks activos.
- [ ] Registro `docs/HITL_LOG.md` con al menos 4 entradas de auditoria IA vs humano.
- [ ] Cada miembro puede explicar linea a linea su Dockerfile y los bloques del YAML.
- [ ] Argumentacion preparada para los 7 principios, especialmente P5 y P6.
