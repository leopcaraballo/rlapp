# Explicación detallada de las pruebas del pipeline

> Documento de apoyo para entender, defender y explicar con precisión qué pruebas ejecuta el pipeline del proyecto RLAPP, qué valida cada una y cuáles son sus límites técnicos reales.

---

## 1. Propósito del documento

Este documento describe, con detalle técnico, las pruebas y validaciones que se ejecutan dentro de los workflows del repositorio. El objetivo es que el equipo pueda explicar con claridad:

- qué hace cada job del pipeline
- qué tipo de prueba representa
- qué evidencia entrega
- qué dependencias usa
- qué limitaciones tiene

La explicación está organizada por workflow, porque el proceso real de calidad del proyecto no vive en un solo archivo, sino en varios pipelines complementarios.

## 2. Workflows que forman el proceso de pruebas

El proceso de validación del proyecto se reparte principalmente en tres workflows:

| Workflow | Archivo | Función principal |
| --- | --- | --- |
| CI/CD Pipeline | `.github/workflows/ci.yml` | Compilación, pruebas por niveles, prueba Black Box y escaneo de imágenes |
| E2E - Integration Tests | `.github/workflows/e2e.yml` | Ejecución de integración E2E con PostgreSQL y RabbitMQ reales |
| Security - Dependency Audit & Secret Scan | `.github/workflows/security.yml` | Dependencias vulnerables, secretos, SAST y escaneo de contenedores |

## 3. Explicación del workflow principal `ci.yml`

El archivo `.github/workflows/ci.yml` es el núcleo del proceso CI/CD del repositorio. Allí se definen los jobs principales que preparan, validan y auditan la aplicación antes de una integración a `develop` o `main`.

### 3.1 Job `lint-and-build`

#### Objetivo

Este job no ejecuta pruebas funcionales de negocio, pero es la primera barrera de calidad del pipeline. Su propósito es garantizar que el proyecto compile y que el frontend pase las validaciones estáticas mínimas.

#### Qué hace

- hace checkout del repositorio
- instala el SDK de .NET
- instala Node.js
- restaura dependencias del backend
- compila la solución backend en modo Release
- instala dependencias del frontend con `npm ci`
- ejecuta `npm run lint`
- ejecuta `npm run build`

#### Qué valida realmente

Valida que:

- la solución .NET compile sin errores
- el frontend no tenga errores de lint reportados por ESLint
- el frontend pueda construirse correctamente en modo producción
- las dependencias y scripts base del proyecto sean coherentes

#### Tipo de validación

No es una prueba de Caja Blanca ni Caja Negra en sentido clásico. Es una validación técnica de compilación y análisis estático.

#### Por qué es importante

Si este job falla, no tiene sentido seguir con pruebas más caras o más lentas. En otras palabras, evita desperdiciar tiempo de CI cuando el código ni siquiera construye correctamente.

#### Limitaciones

No prueba lógica de negocio, integración, seguridad funcional ni experiencia de usuario. Solo asegura que el proyecto está en un estado mínimo ejecutable desde el punto de vista técnico.

### 3.2 Job `component-tests`

#### Objetivo

Ejecutar las pruebas aisladas de backend y frontend, es decir, aquellas que validan lógica interna, componentes y comportamiento de unidades o módulos sin depender de infraestructura real.

#### Qué hace en backend

Ejecuta `dotnet test` sobre la solución, con un filtro que excluye pruebas categorizadas como integración y E2E, y además excluye nombres totalmente calificados que pertenecen al proyecto de integración.

#### Qué valida en backend

Principalmente valida:

- reglas del dominio
- invariantes del agregado
- value objects
- handlers de aplicación
- comportamiento de proyecciones

Estas pruebas suelen ser rápidas porque no dependen de PostgreSQL ni RabbitMQ reales.

#### Qué hace en frontend

Ejecuta el script `npm run test:component`, definido en `apps/frontend/package.json` como una suite de Jest con cobertura que ignora explícitamente las pruebas E2E.

#### Qué valida en frontend

Valida:

- renderizado de componentes React
- hooks personalizados
- servicios y adaptadores con mocks
- flujos internos del frontend usando Jest, React Testing Library y MSW

#### Tipo de prueba

Estas pruebas son de componente o Caja Blanca. El equipo conoce la implementación y controla el entorno con mocks y dobles de prueba.

#### Evidencias que genera

- cobertura backend en formato Cobertura XML
- cobertura frontend en `apps/frontend/test-results/coverage/`

#### Limitaciones

No validan comunicación real con base de datos, colas, red ni contenedores. Son excelentes para detectar errores lógicos rápidos, pero no sustituyen integración real.

### 3.3 Job `smoke-sanity-tests`

#### Objetivo

Proveer una puerta rápida de calidad que detecte errores visibles de comportamiento de API antes de lanzar pruebas más costosas.

Este job ejecuta dos subconjuntos de la suite backend: `Smoke` y `Sanity`.

#### Pruebas Smoke

Las Smoke están implementadas en `WaitingRoom.Tests.Integration/Functional/SmokeTests.cs`.

#### Qué validan las Smoke

Validan aspectos básicos como:

- que el endpoint de liveness responda `200`
- que el endpoint de readiness responda `200`
- que los endpoints principales existan y respondan sin errores `500`
- que OpenAPI esté disponible o, al menos, no rompa el servidor
- que endpoints inexistentes devuelvan `404`

#### Qué significan

Son pruebas de humo: confirman que el sistema levantó y que la API no está rota de forma evidente.

#### Pruebas Sanity

Las Sanity están implementadas en `WaitingRoom.Tests.Integration/Functional/SanityTests.cs`.

#### Qué validan las Sanity

Validan flujos funcionales cortos y representativos, por ejemplo:

- check-in exitoso
- llamada básica a caja
- validación de pago
- idempotencia básica
- rechazo de solicitudes no autenticadas
- presencia de `correlationId`

#### Tipo de prueba

Conceptualmente se presentan como pruebas funcionales del sistema. Sin embargo, técnicamente usan `WaitingRoomApiFactory`, que reemplaza infraestructura real por fakes in-memory.

#### Qué implica eso

Sirven para validar comportamiento HTTP y ciertos flujos de negocio, pero no deben defenderse como integración real con PostgreSQL y RabbitMQ.

#### Valor real de este job

Es útil como filtro rápido: detecta regresiones funcionales visibles sin necesidad de levantar infraestructura pesada.

#### Limitaciones

- no prueban infraestructura real
- no prueban contenedores reales
- no prueban base de datos real
- varias usan DTOs internos del backend, por lo que tampoco son Caja Negra pura

### 3.4 Job `integration-tests`

#### Objetivo

Ejecutar pruebas que sí requieren comunicación real con infraestructura externa, principalmente PostgreSQL y RabbitMQ.

#### Qué prepara

Levanta servicios efímeros dentro del runner de GitHub Actions:

- `postgres:16-alpine`
- `rabbitmq:3.12-management-alpine`

Luego instala `postgresql-client`, espera que la base de datos esté lista y aplica el esquema mediante `infrastructure/database/postgres/init.sql`.

#### Qué ejecuta

Corre `dotnet test` con variables de entorno que apuntan a la base de datos real de pruebas y al host local de RabbitMQ.

#### Qué valida realmente

Este job valida interacción real con infraestructura. Entre las pruebas relevantes del proyecto se encuentran:

- persistencia de idempotencia en PostgreSQL
- registro de identidad de pacientes sobre PostgreSQL
- almacenamiento y lectura del event store real
- consistencia del outbox
- parte del pipeline event-driven con recursos reales

#### Ejemplos importantes

`PostgresIdempotencyStoreTests.cs` valida que la capa de persistencia de idempotencia realmente grabe y recupere datos desde PostgreSQL.

`EventDrivenPipelineE2ETests.cs` valida una cadena más amplia: creación de eventos, escritura en event store, salida al outbox y procesamiento asociado.

#### Tipo de prueba

Estas sí son pruebas de integración reales, porque verifican comunicación con puertos y recursos externos verdaderos.

#### Valor real de este job

Es una de las partes más fuertes del pipeline porque demuestra que al menos una porción de la arquitectura funciona fuera del entorno in-memory.

#### Limitaciones

El filtro usado en el job incluye también nombres totalmente calificados del proyecto de integración, por lo que existe riesgo de mezclar algunas pruebas con distinto nivel de fidelidad bajo un mismo job. Aun así, sí hay integración real aquí.

### 3.5 Job `qa-extended-tests`

#### Objetivo

Ejecutar una capa extendida de aseguramiento de calidad sobre el backend, cubriendo seguridad, contrato, validación, rendimiento y regresión.

#### Subgrupo `Security`

Ejecuta pruebas orientadas a seguridad funcional y de autorización.

Entre ellas se encuentran suites como:

- `AuthenticationBypassTests.cs`
- `InputInjectionTests.cs`
- `PrivilegeEscalationTests.cs`

#### Qué validan

Buscan detectar:

- bypass de autenticación
- manipulación de roles
- escalación de privilegios
- inyección de payloads maliciosos
- respuestas inseguras o permisivas

#### Subgrupo `Contract`

Ejecuta `ApiContractTests.cs`.

#### Qué valida

Comprueba que la API responda con estructuras JSON coherentes, campos obligatorios y convenciones estables del contrato HTTP.

#### Subgrupo `Validation`

Ejecuta `DataValidationTests.cs`.

#### Qué valida

Prueba entradas inválidas, vacías, fuera de rango o fuera de catálogo. Es la parte más cercana a partición de equivalencia y análisis de valores límite dentro del pipeline.

#### Subgrupo `Performance`

Ejecuta `ApiResponseTimeTests.cs`.

#### Qué valida

Mide tiempos de respuesta y comportamiento bajo carga acotada. No es una prueba de carga intensiva tipo benchmark industrial, pero sí un control de latencia y estabilidad básica.

#### Subgrupo `Regression`

Ejecuta `RegressionTests.cs`.

#### Qué valida

Confirma que defectos ya conocidos y corregidos no reaparezcan tras nuevos cambios.

#### Tipo de prueba

Este job mezcla varias técnicas:

- funcionales
- de seguridad
- de contrato
- de validación
- de rendimiento
- de regresión

#### Limitación importante

Muchas de estas suites también dependen de `WaitingRoomApiFactory`, por lo que, aunque son útiles, no todas deben presentarse como integración real. Varias son mejor interpretadas como pruebas de sistema simulado o pruebas funcionales sobre entorno fake.

### 3.6 Job `black-box-tests`

#### Objetivo

Ejecutar una validación externa contra la API levantada con Docker Compose, sin usar la fábrica de pruebas interna del backend.

#### Qué hace

- levanta `postgres`, `rabbitmq` y `api` con `docker compose up -d`
- espera a que `/health/ready` responda `200`
- ejecuta dos `curl`
- apaga el stack al terminar

#### Qué valida realmente

Valida que:

- la API arranque en un entorno containerizado
- el endpoint de readiness responda correctamente
- el esquema OpenAPI esté expuesto

#### Por qué se considera Black Box

Porque se consume el sistema desde fuera, por HTTP, una vez levantado como contenedor, sin usar `WebApplicationFactory` ni inyección de fakes.

#### Limitación crítica

Aunque es una prueba externa, actualmente no valida un flujo de negocio real. No hace, por ejemplo:

- un check-in válido
- un caso de validación inválida
- un caso duplicado o de idempotencia

Por eso, este job hoy demuestra disponibilidad externa del sistema, pero no una Caja Negra funcional robusta de negocio.

### 3.7 Job `image-scan`

#### Objetivo

Escanear las imágenes Docker construidas del backend y frontend para detectar vulnerabilidades del sistema base y bibliotecas instaladas.

#### Qué hace

- construye la imagen backend
- construye la imagen frontend
- ejecuta Trivy sobre ambas imágenes

#### Qué valida

No valida lógica de negocio. Lo que valida es el artefacto de despliegue:

- paquetes vulnerables del sistema operativo
- librerías vulnerables incluidas en la imagen
- exposición de riesgos conocidos en el contenedor final

#### Tipo de validación

Es una prueba no funcional de seguridad del artefacto Docker.

#### Limitación actual

El workflow usa `exit-code: "0"`, por lo tanto el pipeline no falla automáticamente aunque se detecten vulnerabilidades de severidad alta o crítica.

### 3.8 Job `release`

#### Objetivo

Representar el paso de liberación cuando se haga un push a `main`.

#### Qué hace hoy

Actualmente solo imprime un mensaje de log simulando una liberación semántica.

#### Qué significa

No ejecuta pruebas, no crea tag real y no materializa un release completo por sí mismo. Funciona como placeholder o stub de un proceso de release futuro.

## 4. Explicación del workflow `e2e.yml`

Este workflow separa la ejecución de integración E2E del resto del pipeline principal.

### 4.1 Job `e2e-tests`

#### Objetivo

Levantar infraestructura real y ejecutar una validación más cercana a integración end-to-end del backend.

#### Qué prepara

- PostgreSQL real en contenedor
- RabbitMQ real en contenedor
- restauración y compilación del backend
- aplicación del script SQL de inicialización

#### Qué ejecuta

Corre `dotnet test` sobre la solución backend con variables de entorno que apuntan a esa infraestructura levantada dentro del runner.

#### Qué valida realmente

Valida que el backend pueda ejecutarse y probarse en un entorno con recursos reales de persistencia y mensajería, sin depender del entorno local del desarrollador.

#### Valor de este workflow

Es una evidencia importante contra la excusa “en mi máquina funciona”, porque mueve el backend a un contexto CI controlado y reproducible.

#### Limitación

El workflow ejecuta la solución de pruebas y no una lista extremadamente selectiva de suites. Eso puede mezclar pruebas de distinta naturaleza bajo el mismo job, aunque el entorno sí es real.

## 5. Explicación del workflow `security.yml`

Este workflow no ejecuta pruebas funcionales del sistema médico como tal. Su misión es revisar la seguridad técnica del código, dependencias, historial e imágenes.

### 5.1 Job `dotnet-audit`

#### Objetivo

Detectar paquetes NuGet vulnerables o deprecados dentro del backend.

#### Qué hace

- restaura dependencias
- ejecuta `dotnet list package --vulnerable --include-transitive`
- ejecuta `dotnet list package --deprecated`
- publica reportes como artefactos

#### Qué valida

No prueba funcionalidad de negocio. Evalúa riesgo de seguridad y mantenimiento sobre dependencias .NET.

#### Limitación

Actualmente emite advertencias, pero no necesariamente bloquea el pipeline por vulnerabilidades encontradas.

### 5.2 Job `npm-audit`

#### Objetivo

Detectar dependencias vulnerables del frontend y revisar licencias instaladas.

#### Qué hace

- instala dependencias con `npm ci`
- ejecuta `npm audit`
- ejecuta `license-checker`
- publica reportes

#### Qué valida

Riesgos de seguridad y gobernanza del frontend desde la perspectiva de paquetes npm.

#### Limitación

El comando está preparado con tolerancia para no romper automáticamente el job en todos los casos.

### 5.3 Job `secret-scan`

#### Objetivo

Buscar secretos expuestos en el historial del repositorio.

#### Qué hace

- hace checkout con historial completo
- ejecuta Gitleaks

#### Qué valida

Busca credenciales, tokens o secretos que pudieron haberse comprometido en commits previos.

#### Tipo de validación

Es una prueba no funcional de seguridad del historial Git.

### 5.4 Job `codeql-analysis`

#### Objetivo

Realizar análisis estático de seguridad sobre C# y JavaScript.

#### Qué hace

- inicializa CodeQL
- compila el backend
- ejecuta el análisis estático

#### Qué valida

Busca patrones de código potencialmente inseguros, vulnerabilidades estáticas y problemas de seguridad detectables sin ejecución.

#### Tipo de validación

SAST, es decir, Static Application Security Testing.

### 5.5 Job `docker-scan`

#### Objetivo

Escanear las imágenes construidas del backend y frontend con Trivy, pero dentro del workflow de seguridad.

#### Qué hace

- construye ambas imágenes
- ejecuta Trivy sobre cada una
- publica los reportes generados

#### Qué valida

Seguridad de las imágenes Docker, igual que `image-scan` en el pipeline principal, pero aquí con foco más explícito de seguridad continua.

#### Limitación

También usa `exit-code: "0"`, por lo que el hallazgo no necesariamente se traduce en bloqueo del flujo.

### 5.6 Job `security-summary`

#### Objetivo

Consolidar el resultado de todos los jobs de seguridad y emitir un resumen final.

#### Qué hace

Lee el resultado de:

- `dotnet-audit`
- `npm-audit`
- `secret-scan`
- `codeql-analysis`
- `docker-scan`

#### Qué valida

No ejecuta nuevas pruebas. Resume el estado agregado de seguridad del workflow.

## 6. Clasificación práctica de todas las pruebas del pipeline

Para defensa oral, conviene agrupar todo el proceso en cuatro bloques conceptuales.

### 6.1 Pruebas de componente

Aquí entran principalmente las de `component-tests`:

- dominio backend
- aplicación backend
- proyecciones backend
- componentes frontend
- hooks frontend
- servicios frontend

Son rápidas, aisladas y se apoyan en mocks, fakes o utilidades de test.

### 6.2 Pruebas funcionales rápidas sobre entorno simulado

Aquí entran `smoke-sanity-tests` y varias suites del job `qa-extended-tests` cuando se ejecutan usando `WaitingRoomApiFactory`.

Estas pruebas validan comportamiento HTTP y reglas funcionales, pero no deben venderse como integración real con infraestructura externa.

### 6.3 Pruebas de integración reales

Aquí entran principalmente:

- `integration-tests` de `ci.yml`
- `e2e-tests` de `e2e.yml`
- suites que se conectan a PostgreSQL y RabbitMQ reales

Estas son las más importantes para demostrar comunicación real entre aplicación e infraestructura.

### 6.4 Pruebas y validaciones de seguridad

Aquí entran:

- auditoría de dependencias .NET
- auditoría de dependencias npm
- escaneo de secretos
- análisis estático CodeQL
- escaneo Trivy de imágenes

No prueban casos clínicos ni reglas del dominio, pero sí la seguridad técnica del ecosistema.

## 7. Qué sí y qué no demuestra hoy el pipeline

### 7.1 Qué sí demuestra

- que el proyecto compila
- que el frontend pasa lint y build
- que existen pruebas de componente backend y frontend
- que existen pruebas funcionales rápidas de API
- que sí hay al menos una parte de integración real con PostgreSQL y RabbitMQ
- que se escanean dependencias, historial, código e imágenes desde la perspectiva de seguridad

### 7.2 Qué no demuestra todavía de forma fuerte

- una Caja Negra de negocio completa dentro del job `black-box-tests`
- que toda la suite llamada “integration” sea realmente de integración real
- bloqueo efectivo del pipeline por vulnerabilidades altas o críticas en imágenes
- release real automatizado con versionado semántico y publicación efectiva

## 8. Guía corta para exponerlo oralmente

Si el instructor pregunta “qué pruebas se hacen en el pipeline”, la explicación más precisa y defendible es esta:

Primero el pipeline verifica que backend y frontend compilen, que el frontend pase lint y que ambos artefactos puedan construirse. Después ejecuta pruebas de componente para backend y frontend, orientadas a lógica aislada. Luego corre smoke y sanity como puerta rápida funcional sobre la API. Después levanta PostgreSQL y RabbitMQ reales para ejecutar integración real. Además corre una capa ampliada de seguridad, contrato, validación, rendimiento y regresión. Finalmente levanta la API en contenedor para comprobarla externamente y escanea las imágenes Docker.

La precisión técnica importante es esta: no todas las pruebas del proyecto que parecen integración lo son realmente, porque varias usan `WaitingRoomApiFactory` con fakes. Las integraciones reales son las que sí se conectan a PostgreSQL y RabbitMQ levantados en CI.

## 9. Conclusión

El pipeline de RLAPP no es una sola prueba, sino un ecosistema de validaciones encadenadas. Combina compilación, componente, pruebas funcionales rápidas, integración real, seguridad y una validación externa del sistema levantado en contenedor.

La fortaleza principal del pipeline está en la variedad de capas que cubre. Su punto más débil, desde el punto de vista de la rúbrica, es que la Caja Negra del job principal todavía valida disponibilidad más que negocio, y que parte de la narrativa de integración debe explicarse con cuidado para no confundir pruebas con fakes y pruebas con infraestructura real.
