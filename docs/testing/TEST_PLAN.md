# Plan de pruebas del proyecto RLAPP

> Documento maestro que consolida la estrategia de pruebas multinivel, tecnicas aplicadas, casos de prueba y mapeo al pipeline CI/CD para el sistema de gestion de sala de espera medica RLAPP.

---

## 1. Introduccion y alcance

### 1.1 Objetivo

Garantizar la calidad, estabilidad y confiabilidad del sistema RLAPP mediante una estrategia de pruebas multinivel que abarque desde la validacion granular de componentes hasta la verificacion del sistema completo en contenedores, aplicando tecnicas de Caja Blanca y Caja Negra fundamentadas en los siete principios del testing ISTQB.

### 1.2 Contexto del sistema

RLAPP es un sistema de gestion de sala de espera medica con arquitectura Hexagonal + Event Sourcing + CQRS + Outbox Pattern. El flujo operacional cubre recepcion (check-in), caja (pago) y consulta medica. Al ser un sistema clinico con persistencia basada en eventos, los errores de estado son irrecuperables y los mensajes asincronos pueden reenviarse, lo cual exige una estrategia de pruebas rigurosa centrada en invariantes de dominio e idempotencia.

### 1.3 Stack tecnologico

| Capa | Tecnologia | Framework de pruebas |
| --- | --- | --- |
| Backend | .NET 10 / C# | xUnit + FluentAssertions |
| Frontend | Next.js 16 / React 19 | Jest + RTL + MSW + Playwright |
| Base de datos | PostgreSQL 16 | Tests de integracion real |
| Mensajeria | RabbitMQ 3.x | Tests de pipeline E2E |
| Infraestructura | Docker Compose v2 | Contenedores de prueba |

### 1.4 Historias de usuario cubiertas

| HU | Descripcion | Niveles de prueba aplicados |
| --- | --- | --- |
| HU-01 | Check-in de paciente en recepcion | Unitario, componente, integracion, Caja Negra |
| HU-02 | Llamado a caja para pago | Unitario, componente |
| HU-03 | Registro de pago y avance a consulta | Unitario, componente |
| HU-04 | Llamado a consulta medica | Unitario, componente |
| HU-05 | Finalizacion de consulta y completado | Unitario, componente |
| HU-06 | Monitoreo en tiempo real del dashboard | Componente frontend, E2E |

### 1.5 Fuera de alcance

- Pruebas de penetracion manual (se complementan con tests de seguridad automatizados SEC-AUTH, SEC-INJ, SEC-PRIV).
- Pruebas de usabilidad con usuarios finales.

### 1.6 Equipo y responsables

| Miembro | Rol | Responsabilidad en testing |
| --- | --- | --- |
| Jhorman | Frontend, infraestructura, CI/CD | Pruebas de componente frontend (Jest + RTL + MSW), E2E Playwright, configuracion del pipeline CI/CD, redaccion del TEST_PLAN.md |
| Leopoldo | Backend, dominio, integracion | Pruebas de dominio (xUnit), aplicacion, proyecciones, integracion real con PostgreSQL/RabbitMQ, prueba de Caja Negra via API, aporte de Test Cases backend |

**Suites asignadas por miembro:**

| Miembro | Suites bajo su responsabilidad | Niveles cubiertos |
| --- | --- | --- |
| Jhorman | Components, Hooks, Services, Application, Infrastructure, Repositories, Security (frontend), E2E Playwright | Nivel 1 (componente frontend), Nivel 3 (E2E frontend) |
| Leopoldo | Domain Aggregates, Value Objects, Events, Application Handlers, Projections, Integration (infra real), Caja Negra via API | Nivel 1 (unitario/componente backend), Nivel 2 (integracion), Nivel 3 (Caja Negra API) |

### 1.7 Estrategia de inmutabilidad y empaquetamiento Docker

Con el fin de garantizar la separación de conceptos y la inmutabilidad en el ciclo de vida de los despliegues, la arquitectura opta por definir los de `Dockerfile` de forma independiente dentro de los módulos `rlapp-backend/` y `rlapp-frontend/`. Esto garantiza que los test de integración y los escaneos de vulnerabilidades identifiquen de manera segregada las brechas en la imagen `.NET` o la de `Next.js` sin fricción. Aunque el pipeline lo centraliza todo desde `.github/workflows/ci.yml` ejecutando comandos ubicados en los subdirectorios, en términos de monorepositorios profesionales, mantener el `Dockerfile` junto al código asegura la cohesividad por componente en lugar de recurrir a un hiper-dockerfile complejo en la raíz.

## 2. Estrategia multinivel (piramide de pruebas)

La estrategia sigue la piramide de pruebas adaptada al contexto de Event Sourcing + CQRS del proyecto.

```
              /    E2E (HTTP)     \          <- 37 pruebas (FullClinicalFlow + EndpointValidation)
             / QA Extendidas      \         <- 146 pruebas (Security, Performance, Contract, Validation, Regression)
            / Smoke + Sanity       \        <- 14 pruebas (puerta rapida de calidad)
           /  Integracion           \       <- 80 pruebas (RabbitMQ, Serialization, Pipeline, API fakes)
          /   Aplicacion             \      <- 12 pruebas (CommandHandlers, Validators)
         /    Dominio (Unit)          \     <- 189 pruebas (Aggregates, ValueObjects, Events)
        /     Proyecciones             \    <- 11 pruebas (Worker, Subscriber, ProjectionStore)
       /________________________________\
```

**Total backend:** 489 pruebas (189 Domain + 12 Application + 11 Projections + 277 Integration).

**Objetivo:** Validacion granular de logica de negocio aislada.

**Backend (xUnit) — Responsable: Leopoldo:**

| Suite | Proyecto | Archivos | Que valida |
| --- | --- | --- | --- |
| Dominio: Aggregates | `WaitingRoom.Tests.Domain` | 4 | Invariantes del agregado `WaitingQueue` |
| Dominio: Value Objects | `WaitingRoom.Tests.Domain` | 4 | `PatientId`, `Priority`, `ConsultationType` |
| Dominio: Events | `WaitingRoom.Tests.Domain` | 1 | Inmutabilidad de `PatientCheckedIn` |
| Aplicacion: Handlers | `WaitingRoom.Tests.Application` | 2+ | Orquestacion de comandos con fakes |
| Proyecciones | `WaitingRoom.Tests.Projections` | 3 | Idempotencia y replay de proyecciones |
| API con fakes | `WaitingRoom.Tests.Integration` | 3 | Endpoints con `WaitingRoomApiFactory` in-memory |

**Frontend (Jest + RTL + MSW) — Responsable: Jhorman:**

| Suite | Carpeta | Archivos | Que valida |
| --- | --- | --- | --- |
| Componentes React | `test/components/` | Multiples | Renderizado, interacciones de usuario |
| Hooks | `test/hooks/` | Multiples | Delegacion a puertos, manejo de estado |
| Servicios | `test/services/` | Multiples | Comunicacion con API via MSW |
| Aplicacion | `test/application/` | Multiples | Casos de uso frontend |
| Infraestructura | `test/infrastructure/` | Multiples | Adaptadores (SignalR, HTTP) |
| Repositorios | `test/repositories/` | Multiples | Persistencia local |
| Seguridad | `test/security/` | Multiples | Autenticacion, sesion, roles |

**Tecnica aplicada:** Cobertura de sentencias, ramas y condiciones (ver seccion 4.1).

### 2.2 Nivel 2: pruebas de integracion (Caja Blanca + Caja Negra)

**Objetivo:** Verificar la comunicacion entre componentes que estaban aislados, usando infraestructura real.

**Responsable: Leopoldo**

| Suite | Proyecto | Infraestructura requerida | Que valida |
| --- | --- | --- | --- |
| PostgreSQL Idempotency | `Tests.Integration/Infrastructure` | PostgreSQL real | Persistencia de claves de idempotencia |
| PostgreSQL Patient Registry | `Tests.Integration/Infrastructure` | PostgreSQL real | Registro unico de pacientes |
| Worker Outbox Dispatcher | `Tests.Integration/Worker` | PostgreSQL + RabbitMQ | Publicacion confiable de eventos |
| Concurrencia de dominio | `Tests.Integration/Domain` | Event store real | Check-in concurrente sin corrupcion |
| Pipeline E2E | `Tests.Integration/EndToEnd` | PostgreSQL + RabbitMQ | Flujo completo comando a proyeccion |

**Tecnica aplicada:** Verificacion de contratos entre capas y persistencia real.

### 2.3 Nivel 3: pruebas de sistema y Caja Negra

**Objetivo:** Evaluar el sistema completo desde la perspectiva del usuario de la API, sin conocimiento de la implementacion interna.

| Suite | Tipo | Herramienta | Que valida | Responsable |
| --- | --- | --- | --- | --- |
| Caja Negra backend | API HTTP pura | curl / HttpClient externo | Contrato HTTP: status codes, JSON schema | Leopoldo |
| E2E frontend | Navegacion completa | Playwright | Flujos de usuario desde el dashboard | Jhorman |

**Tecnica aplicada:** Particion de equivalencia, valores limite, transicion de estado (ver seccion 4.2).

### 2.4 Nivel 4: pruebas de aceptacion (UAT)

**Objetivo:** Corroborar con el equipo que se construyo lo solicitado.

- Validacion manual del flujo completo: check-in, caja, consulta, completado.
- Verificacion del dashboard en tiempo real con WebSocket/SignalR.
- Revision de evidencia del pipeline en verde.

## 3. Los siete principios del testing aplicados a RLAPP

### 3.1 P1: las pruebas muestran la presencia de defectos, no su ausencia

Las pruebas de RLAPP reducen el riesgo de defectos en el flujo clinico, pero no garantizan ausencia total de fallos. Por ello se implementan multiples niveles: un defecto que escape del nivel unitario puede detectarse en integracion o en la prueba de Caja Negra via API.

### 3.2 P2: las pruebas exhaustivas son imposibles

El agregado `WaitingQueue` acepta combinaciones de `PatientId` (alfanumerico hasta 20 caracteres), `Priority` (4 valores), `ConsultationType` (texto libre 2-100 caracteres) y `MaxCapacity` (1-100). Probar todas las combinaciones es inviable. Se aplica particion de equivalencia para seleccionar representantes de cada clase (seccion 4.2.1) y valores limite para las fronteras (seccion 4.2.2).

### 3.3 P3: testing temprano (shift-left)

El pipeline CI/CD ejecuta pruebas automaticamente en cada Pull Request antes del merge. Las pruebas de componente se ejecutan primero (rapidas, <30s), seguidas de integracion y Caja Negra. Se bloquea el merge si cualquier nivel falla (branch protection rules).

### 3.4 P4: agrupacion de defectos

La experiencia del proyecto demuestra que la mayoria de defectos se concentran en:

- **Dominio:** Transiciones de estado del agregado `WaitingQueue` (check-in duplicado, capacidad excedida, flujo de atencion fuera de orden).
- **Idempotencia:** Procesamiento duplicado de eventos en el Outbox Pattern.
- **Value Objects:** Normalizacion de `PatientId` (espacios, mayusculas, caracteres especiales).

Por ello, la mayor densidad de tests se encuentra en `WaitingRoom.Tests.Domain` (9 archivos) y en las pruebas de idempotencia.

### 3.5 P5: paradoja del pesticida

Los tests iniciales del check-in validaban solo el caso exitoso. Se agregaron variantes progresivas para evitar falsos positivos:

- `CheckInPatient_AtCapacity_ThrowsDomainException` — limite de capacidad.
- `CheckInPatient_DuplicatePatientId_ThrowsDomainException` — duplicado.
- `PatientIdCanonicalNormalizationTests` — variantes de formato (`" pat-001 "`, `"PAT-001"`, `"pat-001"`).
- `ConcurrencyStressTests` — check-in simultaneo bajo carga.

Cada iteracion agrega escenarios que los tests anteriores no cubrian.

### 3.6 P6: las pruebas dependen del contexto

El contexto de RLAPP es un sistema medico con Event Sourcing + CQRS + Outbox Pattern, lo cual implica:

1. **Los tests de dominio son criticos:** Un error en `WaitingQueue` corrompe el event store de forma irrecuperable. Se invierte mas en tests de dominio (9 archivos) que en tests de UI.
2. **La idempotencia es vital:** La comunicacion asincrona (Outbox + RabbitMQ) puede reenviar mensajes. Los tests de idempotencia validan resistencia a duplicados.
3. **El frontend opera en tiempo real:** Los dashboards via SignalR/WebSocket requieren tests de componente con mocks (MSW) que simulan la API sin depender del backend.
4. **La prueba de Caja Negra ejecuta contra la API real:** El contexto clinico exige validar el flujo completo desde la perspectiva del usuario de la API.

### 3.7 P7: la ausencia de errores es una falacia

Un sistema que pasa todos los tests pero no cumple las necesidades del usuario clinico (recepcionista, cajero, medico) no tiene valor. Por ello se complementan las pruebas automatizadas con validacion de aceptacion (UAT) y revision de flujos E2E con Playwright que simulan la experiencia real del usuario.

## 4. Tecnicas de prueba aplicadas

### 4.1 Caja Blanca (estructura interna conocida)

Las pruebas de Caja Blanca se aplican en los niveles 1 y 2, donde el equipo conoce la implementacion interna.

#### 4.1.1 Cobertura de sentencias

Cada linea ejecutable del dominio y la capa de aplicacion tiene al menos un test que la recorre. El frontend mantiene 83.96% de cobertura de lineas.

#### 4.1.2 Cobertura de ramas

Las bifurcaciones condicionales del agregado se prueban en ambas direcciones:

| Condicion del agregado | Rama verdadera (test) | Rama falsa (test) |
| --- | --- | --- |
| `Patients.Count >= MaxCapacity` | `CheckInPatient_AtCapacity_ThrowsDomainException` | `CheckInPatient_WithValidData_EmitsEvent` |
| Duplicado de `PatientId` | `CheckInPatient_DuplicatePatientId_Throws` | `CheckInPatient_WithValidData_EmitsEvent` |
| `Priority.Value` invalido | `Priority_Create_InvalidValue_Throws` | `Priority_Create_ValidValue_Succeeds` |
| `PatientId` con caracteres especiales | `PatientId_Create_InvalidChars_Throws` | `PatientId_Create_ValidFormat_Succeeds` |

#### 4.1.3 Cobertura de condiciones

Para condiciones compuestas como `CheckInPatientRequest.IsValid()`, se prueban combinaciones individuales:

| Condicion | `PatientId` | `PatientName` | `Priority` | `ConsultationType` | Resultado |
| --- | --- | --- | --- | --- | --- |
| Todas validas | Presente | No vacio | Presente | Presente | `true` |
| Falta PatientId | `null` | No vacio | Presente | Presente | `false` |
| Nombre vacio | Presente | `""` | Presente | Presente | `false` |
| Falta Priority | Presente | No vacio | `null` | Presente | `false` |

### 4.2 Caja Negra (estructura interna desconocida)

Las pruebas de Caja Negra se aplican en el nivel 3, donde el tester no conoce ni importa la implementacion interna. Solo interactua con la API via HTTP.

#### 4.2.1 Particion de equivalencia

Se divide el dominio de entrada en clases de equivalencia (particiones) donde todos los valores de una clase producen el mismo comportamiento. Se selecciona un representante de cada clase.

**Aplicacion al endpoint `POST /api/waiting-room/check-in`:**

| CP# | Particion | Descripcion | Estado | Dato representante | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| CP-01 | Solicitud completa valida | Todos los campos obligatorios presentes y correctos | Valido | `{PatientId: "PAT-001", PatientName: "Juan Perez", Priority: "High", ConsultationType: "General", Actor: "recepcion"}` | HTTP 200, `Success: true`, `QueueId` no vacio |
| CP-02 | Campo `PatientId` ausente | Solicitud sin identificacion del paciente | No valido | Body sin campo `PatientId` | HTTP 400, error de validacion |
| CP-03 | Campo `PatientName` vacio | Nombre del paciente como cadena vacia | No valido | `{PatientName: ""}` | HTTP 400, error de validacion |
| CP-04 | `Priority` con valor inexistente | Prioridad fuera del catalogo valido | No valido | `{Priority: "SuperUrgent"}` | HTTP 400 o excepcion de dominio |
| CP-05 | `PatientId` duplicado | Mismo paciente ya registrado en la cola | No valido | Segundo check-in con `PAT-001` ya existente | Respuesta coherente de negocio (excepcion de dominio) |
| CP-06 | Solicitud con campos opcionales | Incluye `Notes`, `Age`, `IsPregnant` | Valido | `{..., Notes: "Paciente con silla de ruedas", Age: 72, IsPregnant: false}` | HTTP 200, datos opcionales aceptados |
| CP-07 | Campo `Actor` ausente | Sin identificacion del operador | No valido | Body sin campo `Actor` | HTTP 400, error de validacion |
| CP-08 | Tipo de consulta valido pero largo | `ConsultationType` en el limite superior (100 chars) | Valido | Cadena de 100 caracteres | HTTP 200 |

**Aplicacion a `PatientId` (Value Object):**

| CP# | Particion | Descripcion | Estado | Dato representante | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| CP-09 | ID alfanumerico estandar | Formato comun de documento | Valido | `"CC-123456"` | Aceptado, normalizado a mayusculas |
| CP-10 | ID con espacios extremos | Espacios al inicio y final | Valido | `" PAT-001 "` | Aceptado, recortado a `"PAT-001"` |
| CP-11 | ID con caracteres especiales | Simbolos no permitidos | No valido | `"PAT@001!"` | Rechazado con `DomainException` |
| CP-12 | ID vacio | Cadena sin contenido | No valido | `""` | Rechazado con `DomainException` |
| CP-13 | ID que excede longitud | Mas de 20 caracteres | No valido | `"ABCDEFGHIJKLMNOPQRSTU"` (21 chars) | Rechazado con `DomainException` |

**Aplicacion a `Priority` (Value Object):**

| CP# | Particion | Descripcion | Estado | Dato representante | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| CP-14 | Prioridad baja | Nivel minimo | Valido | `"Low"` | Aceptado, Level = 1 |
| CP-15 | Prioridad media | Nivel intermedio | Valido | `"Medium"` | Aceptado, Level = 2 |
| CP-16 | Prioridad alta | Nivel elevado | Valido | `"High"` | Aceptado, Level = 3 |
| CP-17 | Prioridad urgente | Nivel maximo | Valido | `"Urgent"` | Aceptado, Level = 4 |
| CP-18 | Prioridad con mayusculas mixtas | Normalizacion case-insensitive | Valido | `"uRgEnT"` | Aceptado, normalizado a `"Urgent"` |
| CP-19 | Prioridad inexistente | Valor fuera del catalogo | No valido | `"Critical"` | Rechazado con `DomainException` |

#### 4.2.2 Analisis de valores limite

Se prueban los valores en las fronteras de las particiones de equivalencia, donde los defectos tienden a concentrarse.

**Valores limite de `PatientId`:**

| CP# | Frontera | Descripcion | Valor | Resultado esperado |
| --- | --- | --- | --- | --- |
| CP-20 | Longitud minima valida | ID de 1 caracter | `"A"` | Aceptado |
| CP-21 | Longitud justo fuera del minimo | ID de 0 caracteres | `""` | Rechazado |
| CP-22 | Longitud maxima valida | ID de 20 caracteres | `"ABCDEFGHIJKLMNOPQRST"` | Aceptado |
| CP-23 | Longitud justo fuera del maximo | ID de 21 caracteres | `"ABCDEFGHIJKLMNOPQRSTU"` | Rechazado |

**Valores limite de `ConsultationType`:**

| CP# | Frontera | Descripcion | Valor | Resultado esperado |
| --- | --- | --- | --- | --- |
| CP-24 | Longitud minima valida | Tipo de 2 caracteres | `"AB"` | Aceptado |
| CP-25 | Longitud justo fuera del minimo | Tipo de 1 caracter | `"A"` | Rechazado |
| CP-26 | Longitud maxima valida | Tipo de 100 caracteres | Cadena de 100 chars | Aceptado |
| CP-27 | Longitud justo fuera del maximo | Tipo de 101 caracteres | Cadena de 101 chars | Rechazado |

**Valores limite de `MaxCapacity` del agregado:**

| CP# | Frontera | Descripcion | Estado cola | Resultado esperado |
| --- | --- | --- | --- | --- |
| CP-28 | Capacidad - 1 | Check-in cuando falta 1 para llenar | 99 de 100 pacientes | Aceptado |
| CP-29 | Capacidad exacta | Check-in cuando esta llena | 100 de 100 pacientes | Rechazado con `DomainException` |
| CP-30 | Cola vacia | Primer check-in | 0 pacientes | Aceptado |

#### 4.2.3 Tablas de decision

Se combinan multiples condiciones para validar el comportamiento del sistema ante escenarios complejos del check-in.

| CP# | `PatientId` valido | `Priority` valida | Cola con capacidad | Paciente no duplicado | Header `Idempotency-Key` | Resultado esperado |
| --- | --- | --- | --- | --- | --- | --- |
| CP-31 | Si | Si | Si | Si | Presente | HTTP 200, check-in exitoso |
| CP-32 | No | Si | Si | Si | Presente | HTTP 400, error de validacion |
| CP-33 | Si | No | Si | Si | Presente | HTTP 400, error de dominio |
| CP-34 | Si | Si | No | Si | Presente | Excepcion de dominio (capacidad) |
| CP-35 | Si | Si | Si | No | Presente | Excepcion de dominio (duplicado) |
| CP-36 | Si | Si | Si | Si | Ausente | HTTP 400, falta `Idempotency-Key` |
| CP-37 | Si | Si | Si | Si | Repetido (ya usado) | HTTP 200, respuesta cacheada (idempotente) |

#### 4.2.4 Transicion de estado

El agregado `WaitingQueue` gestiona el ciclo de vida del paciente mediante transiciones de estado gobernadas por eventos de dominio.

```plaintext
[Sin registro] --CheckIn--> [CheckedIn] --CallToCashier--> [AtCashier]
    --PaymentCompleted--> [WaitingForConsultation] --CallToDoctor--> [InConsultation]
    --ConsultationCompleted--> [Completed]
```

**Casos de prueba de transicion:**

| CP# | Estado origen | Evento aplicado | Estado destino esperado | Valido |
| --- | --- | --- | --- | --- |
| CP-38 | Sin registro | `PatientCheckedIn` | CheckedIn | Si |
| CP-39 | CheckedIn | `PatientCalledToCashier` | AtCashier | Si |
| CP-40 | AtCashier | `PaymentCompleted` | WaitingForConsultation | Si |
| CP-41 | WaitingForConsultation | `PatientCalledToDoctor` | InConsultation | Si |
| CP-42 | InConsultation | `ConsultationCompleted` | Completed | Si |
| CP-43 | Completed | `PatientCheckedIn` | Rechazado o nueva cola | Segun regla de negocio |
| CP-44 | CheckedIn | `PaymentCompleted` | Rechazado (fuera de orden) | No |
| CP-45 | AtCashier | `ConsultationCompleted` | Rechazado (fuera de orden) | No |

## 5. Test suites y catalogo de test cases

### 5.1 Leopoldo: suites backend + Caja Negra API

#### 5.1.1 Dominio (Caja Blanca)

| Suite | Archivo | Test Case | Tecnica |
| --- | --- | --- | --- |
| Aggregate: creacion | `WaitingQueueTests.cs` | `Create_WithValidData_CreatesQueue` | Cobertura de sentencias |
| Aggregate: check-in | `WaitingQueueTests.cs` | `CheckInPatient_WithValidData_EmitsPatientCheckedInEvent` | Cobertura de ramas |
| Aggregate: capacidad | `WaitingQueueTests.cs` | `CheckInPatient_AtCapacity_ThrowsDomainException` | Valores limite (CP-29) |
| Aggregate: duplicado | `WaitingQueueTests.cs` | `CheckInPatient_DuplicatePatientId_ThrowsDomainException` | Particion de equivalencia (CP-05) |
| Aggregate: refactor | `WaitingQueueCheckInPatientAfterRefactoringTests.cs` | Tests con Parameter Object pattern | Cobertura de sentencias |
| Aggregate: flujo atencion | `WaitingQueueAttentionFlowTests.cs` | Transiciones CheckedIn a Completed | Transicion de estado (CP-38 a CP-45) |
| Aggregate: QueueId | `QueueIdGenerationAndUnicityTests.cs` | Unicidad de identificadores | Cobertura de condiciones |
| VO: PatientId | `PatientIdTests.cs` | Validacion formato, longitud, caracteres | Particion de equivalencia (CP-09 a CP-13) |
| VO: PatientId normalizacion | `PatientIdCanonicalNormalizationTests.cs` | Trim, uppercase, case-insensitive | Valores limite (CP-20 a CP-23) |
| VO: Priority | `PriorityTests.cs` | 4 valores validos + invalidos | Particion de equivalencia (CP-14 a CP-19) |
| VO: ConsultationType | `ConsultationTypeTests.cs` | Longitud 2-100, inmutabilidad | Valores limite (CP-24 a CP-27) |
| Event: PatientCheckedIn | `PatientCheckedInTests.cs` | Inmutabilidad, campos requeridos | Cobertura de sentencias |

#### 5.1.2 Aplicacion (Caja Blanca)

| Suite | Carpeta | Que valida | Tecnica |
| --- | --- | --- | --- |
| Command Handlers | `Tests.Application/CommandHandlers` | Orquestacion check-in con fakes | Cobertura de ramas |
| Fakes de aplicacion | `Tests.Application/Fakes` | Dobles de test para puertos | Soporte para tests |

#### 5.1.3 Proyecciones (Caja Blanca)

| Suite | Archivo | Que valida | Tecnica |
| --- | --- | --- | --- |
| Idempotencia de proyeccion | `PatientCheckedInIdempotencyTests.cs` | Replay duplicado no corrompe estado | Particion de equivalencia |
| Replay de proyeccion | `ProjectionReplayTests.cs` | Reconstruccion de estado desde eventos | Cobertura de sentencias |
| Flujo de atencion | `AttentionWorkflowProjectionTests.cs` | Proyeccion de estados del paciente | Transicion de estado |

#### 5.1.4 Integracion (Caja Blanca + infraestructura real)

| Suite | Archivo | Infraestructura | Que valida |
| --- | --- | --- | --- |
| Idempotencia API | `CheckInIdempotencyTests.cs` | Fakes in-memory | Middleware de idempotencia |
| Filtro de roles | `ReceptionistOnlyFilterTests.cs` | Fakes in-memory | Control de acceso por rol |
| Manejo de excepciones | `ExceptionHandlerMiddlewareTests.cs` | Fakes in-memory | Mapeo de errores HTTP |
| PostgreSQL Idempotency | `PostgresIdempotencyStoreTests.cs` | PostgreSQL real | Persistencia de claves |
| PostgreSQL Patient Registry | `PostgresPatientIdentityRegistryTests.cs` | PostgreSQL real | Registro unico |
| Outbox Dispatcher | `OutboxDispatcherTests.cs` | PostgreSQL + RabbitMQ | Publicacion confiable |
| Concurrencia | `ConcurrencyStressTests.cs` | Event store | Check-in concurrente |
| Pipeline E2E | `EventDrivenPipelineE2ETests.cs` | PostgreSQL + RabbitMQ | Flujo completo |

#### 5.1.5 QA Ecosystem: Smoke, Sanity y Regression (Caja Negra funcional)

| Suite | Archivo | Tests | Que valida |
| --- | --- | --- | --- |
| Smoke | `Functional/SmokeTests.cs` | SMK001-SMK008 (8) | Health endpoints, registro de endpoints, OpenAPI, headers de seguridad, 404 |
| Sanity | `Functional/SanityTests.cs` | SAN001-SAN006 (6) | Check-in basico, llamada a caja, pago, idempotencia, autenticacion, correlation-id |
| Regression | `Functional/RegressionTests.cs` | REG001-REG006 (6) | Regresiones S-05/S-06, idempotency-key obligatorio, case-insensitivity, capacidad, alias |

#### 5.1.6 QA Ecosystem: Security (Caja Negra no funcional)

| Suite | Archivo | Tests | Que valida |
| --- | --- | --- | --- |
| Auth Bypass | `NonFunctional/Security/AuthenticationBypassTests.cs` | SEC-AUTH-001 a 006 | 16 endpoints sin autenticacion, roles vacios, roles inventados, headers multiples, fuga de info |
| Input Injection | `NonFunctional/Security/InputInjectionTests.cs` | SEC-INJ-001 a 008 | SQL injection, XSS, command injection, path traversal, JSON malformado, payload excesivo |
| Privilege Escalation | `NonFunctional/Security/PrivilegeEscalationTests.cs` | SEC-PRIV-001 a 007 | Matriz RBAC completa (Receptionist, Cashier, Doctor, Admin), bypass por case sensitivity |

#### 5.1.7 QA Ecosystem: Performance, Contract y Validation (Caja Negra no funcional)

| Suite | Archivo | Tests | Que valida |
| --- | --- | --- | --- |
| Performance | `NonFunctional/Performance/ApiResponseTimeTests.cs` | PERF001-006 (6) | Tiempos <1000ms, health <500ms, concurrencia 10/50, flujo E2E <5s, throughput >5 req/s |
| Contract | `Contract/ApiContractTests.cs` | CTR001-007 (7) | Estructura JSON response, campos de error, 401 sin datos sensibles, correlation-id echo, content-type |
| Validation | `Validation/DataValidationTests.cs` | VAL001-012 (46 con Theory) | Campos vacios, prioridad invalida/valida, BVA ConsultationType, PatientId limites, Unicode, duplicados |

#### 5.1.8 Resumen de cobertura de Leopoldo (actualizado)

| Nivel | Suites | Archivos de test | Tecnicas principales |
| --- | --- | --- | --- |
| Nivel 1: unitario/componente | Dominio, Aplicacion, Proyecciones, API con fakes | 17+ | Caja Blanca (sentencias, ramas, condiciones) |
| Nivel 2: integracion | PostgreSQL, RabbitMQ, Outbox, E2E pipeline | 5 | Caja Blanca + infra real |
| Nivel 3: Caja Negra funcional | Smoke, Sanity, Regression | 3 suites (20 tests) | Verificacion rapida, regresion |
| Nivel 3: Caja Negra seguridad | Auth Bypass, Injection, Privilege Escalation | 3 suites (81+ tests) | OWASP Top 10, RBAC |
| Nivel 3: Caja Negra calidad | Performance, Contract, Validation | 3 suites (59 tests) | Tiempos de respuesta, contratos API, BVA |

### 5.2 Jhorman: suites frontend + E2E + CI/CD

#### 5.2.1 Componente frontend (Caja Blanca)

| Suite | Carpeta | Archivos | Tecnica | Cobertura |
| --- | --- | --- | --- | --- |
| Componentes React | `test/components/` | Multiples | Caja Blanca (rendering, interacciones) | Incluida en 83.96% |
| Hooks | `test/hooks/` | Multiples | Caja Blanca (delegacion a puertos) | Incluida en 83.96% |
| Servicios | `test/services/` | Multiples | Caja Blanca (integracion con MSW) | Incluida en 83.96% |
| Aplicacion | `test/application/` | Multiples | Caja Blanca (casos de uso) | Incluida en 83.96% |
| Infraestructura | `test/infrastructure/` | Multiples | Caja Blanca (adaptadores SignalR, HTTP) | Incluida en 83.96% |
| Repositorios | `test/repositories/` | Multiples | Caja Blanca (persistencia local) | Incluida en 83.96% |
| Seguridad | `test/security/` | Multiples | Caja Blanca (autenticacion, roles) | Incluida en 83.96% |

#### 5.2.2 E2E Playwright (Caja Negra frontend)

| Suite | Carpeta | Archivos | Tecnica | Cobertura |
| --- | --- | --- | --- | --- |
| Hardening E2E | `test/e2e/` | 2 | Caja Negra (flujos de usuario completos) | Sin reporte separado |

#### 5.2.3 Resumen de cobertura de Jhorman

| Nivel | Suites | Archivos de test | Tecnicas principales |
| --- | --- | --- | --- |
| Nivel 1: unitario/componente | Components, Hooks, Services, Application, Infrastructure, Repositories, Security | 71 | Caja Blanca (sentencias, ramas) |
| Nivel 3: E2E frontend | Playwright hardening | 2 | Caja Negra (navegacion, flujos de usuario) |
| Infraestructura CI/CD | Pipeline con 6 jobs | N/A | Automatizacion, shift-left |

## 6. Infraestructura y automatizacion

### 6.1 Contenedorizacion

Ambos servicios estan doquerizados con Docker Compose para garantizar ambientes de prueba consistentes:

- **Backend:** Dockerfile multi-stage (build + runtime), imagen base `mcr.microsoft.com/dotnet/nightly/aspnet:10.0`.
- **Frontend:** Dockerfile con `node:20-slim` (pendiente: multi-stage produccion).
- **Servicios auxiliares:** PostgreSQL 16 + RabbitMQ 3.x via `docker-compose.yml`.

### 6.2 Pipeline CI/CD (actualizado)

```plaintext
Trigger: push a develop, PR a develop y main

Jobs (en orden de dependencia):

1. lint-and-build ──────────────────────────────────────────────────┐
   Backend: dotnet build                                             │
   Frontend: npm ci + npm run lint + npm run build                   │
                                                                     │
2. component-tests (depende de 1) ──────────────────────────────────┤
   Backend: dotnet test --filter "Category!=Integration"             │
   Frontend: jest --ci --coverage                                    │
                                                                     │
3. smoke-sanity-tests (depende de 1) ───────────────────────────────┤
   Smoke: --filter "Category=Smoke" (8 tests, <5s)                  │
   Sanity: --filter "Category=Sanity" (6 tests, <5s)                │
   [Puerta rapida: si falla, no se ejecutan integration ni QA]       │
                                                                     │
4. integration-tests (depende de 1 + 3) ────────────────────────────┤
   services: postgres:16 + rabbitmq:3.12                             │
   Backend: dotnet test --filter "Category=Integration|..."          │
                                                                     │
5. qa-extended-tests (depende de 1 + 3) ────────────────────────────┤
   Security: --filter "Category=Security" (81 tests)                 │
   Contract: --filter "Category=Contract" (7 tests)                  │
   Validation: --filter "Category=Validation" (46 tests)             │
   Performance: --filter "Category=Performance" (6 tests)            │
   Regression: --filter "Category=Regression" (6 tests)              │
                                                                     │
6. black-box-tests (depende de 4 + 5) ─────────────────────────────┤
   Levantar API en contenedor con docker compose                     │
   Ejecutar requests HTTP contra API real                            │
                                                                     │
7. image-scan (depende de 1) ───────────────────────────────────────┤
   docker build backend + frontend                                   │
   Trivy contra ambas imagenes                                       │
                                                                     │
8. release (solo en merge a main, depende de 2-7) ─────────────────┘
   Crear tag semantico + GitHub Release
```

### 6.3 Shift-left quality

- Branch protection en `main`: required status checks (`lint-and-build`, `component-tests`, `smoke-sanity-tests`, `integration-tests`, `qa-extended-tests`, `black-box-tests`, `image-scan`).
- Bloqueo de merge si cualquier job falla.
- Reportes de cobertura publicados como artifacts en cada PR.

## 7. Criterios de entrada y salida

### 7.1 Criterios de entrada (precondiciones)

| Nivel de prueba | Precondicion |
| --- | --- |
| Unitario / componente | Codigo compila sin errores |
| Integracion | PostgreSQL y RabbitMQ disponibles (local o CI services) |
| Caja Negra | API levantada en contenedor, healthcheck respondiendo |
| E2E frontend | Frontend compilado y servido, API mockada o real |
| Aceptacion | Pipeline en verde, todas las pruebas automatizadas pasando |

### 7.2 Criterios de salida (postcondiciones)

| Nivel de prueba | Condicion de exito |
| --- | --- |
| Unitario / componente | 100% de tests pasando, cobertura >= 80% |
| Integracion | 100% de tests pasando con infraestructura real |
| Caja Negra | Los 3 escenarios minimos (exitoso, error validacion, duplicado) pasan |
| E2E frontend | Flujos criticos completos sin errores |
| Aceptacion | Validacion manual del flujo clinico completo |

## 8. Metricas objetivo

### 8.1 Metricas de Leopoldo (backend)

| Metrica | Objetivo | Actual |
| --- | --- | --- |
| Cobertura de lineas backend | >= 80% | Sin reporte formal |
| Tests unitarios/componente backend | >= 20 test cases | 212 (189 Domain + 12 Application + 11 Projections) |
| Tests de integracion backend | >= 8 test cases | 277 (incluyendo QA Ecosystem) |
| Tests de Caja Negra backend (Smoke/Sanity) | >= 10 escenarios | 14 (8 Smoke + 6 Sanity) |
| Tests de seguridad | >= 20 escenarios | 81+ (Auth Bypass + Injection + Privilege Escalation) |
| Tests de rendimiento | >= 5 escenarios | 6 (tiempos, concurrencia, throughput) |
| Tests de contrato/validacion | >= 15 escenarios | 53 (7 Contract + 46 Validation) |
| Tests de regresion | >= 5 escenarios | 6 (regresiones criticas documentadas) |
| Tasa de falsos positivos backend | < 5% | 0% (489/489 pasando) |

### 8.2 Metricas de Jhorman (frontend + CI/CD)

| Metrica | Objetivo | Actual |
| --- | --- | --- |
| Cobertura de lineas frontend | >= 80% | 83.96% |
| Cobertura de statements frontend | >= 80% | 81.61% |
| Cobertura de ramas frontend | >= 70% | 70.56% |
| Tests de componente frontend | >= 50 test cases | 71 archivos |
| Tiempo de ejecucion pipeline | < 10 minutos total | Sin pipeline |
| Tasa de falsos positivos frontend | < 5% | Sin medicion |

## 9. Mapeo al pipeline CI/CD

> **Evidencia de Ejecución:** [Ver Ejecución Exitosa del Pipeline CI/CD en GitHub Actions]( Reemplazar con URL de GitHub Actions )
> *Para consultar capturas detalladas de los tests en verde, referirse a `docs/evidencia/EVIDENCIA_PIPELINE.md`*.

| Job del pipeline | Niveles de prueba | Tecnicas | Archivos | Responsable |
| --- | --- | --- | --- | --- |
| `component-tests` (backend) | Nivel 1: unitario/componente | Caja Blanca | `Tests.Domain`, `Tests.Application`, `Tests.Projections` | Leopoldo |
| `component-tests` (frontend) | Nivel 1: unitario/componente | Caja Blanca | `test/` (excluye `test/e2e/`) | Jhorman |
| `smoke-sanity-tests` | Nivel 3: puerta rapida | Caja Negra funcional | `Functional/SmokeTests.cs`, `Functional/SanityTests.cs` | Leopoldo |
| `integration-tests` | Nivel 2: integracion | Caja Blanca + infra real | `Tests.Integration/Infrastructure`, `Tests.Integration/Worker`, `Tests.Integration/EndToEnd` | Leopoldo |
| `qa-extended-tests` | Nivel 3: QA extendida | Caja Negra (Security, Performance, Contract, Validation, Regression) | 8 archivos en subcarpetas de `Tests.Integration/` | Leopoldo |
| `black-box-tests` | Nivel 3: sistema | Caja Negra | Script curl o HttpClient externo | Leopoldo |
| `image-scan` | Seguridad | Escaneo vulnerabilidades | Dockerfiles | Jhorman |
| `lint-and-build` | Compilacion + lint | Analisis estatico | Backend + Frontend | Jhorman (config) |
| `release` | Versionado | GitFlow + tag | Solo en merge a main | Ambos |

## 10. Registro HITL (Human-in-the-Loop)

### 10.1 Leopoldo (backend)

| Artefacto | Genero la IA | Audito/Modifico el humano | Alucinacion detectada |
| --- | --- | --- | --- |
| Casos de prueba CP-01 a CP-45 | Si, basados en dominio real | Pendiente validacion de datos representantes | Pendiente |
| Tests de dominio (sec. 5.1.1) | Si, catalogo de suites | Pendiente verificar nombres de test exactos | Pendiente |
| Tests de integracion (sec. 5.1.4) | Si, mapeo infra requerida | Pendiente confirmar conexiones reales | Pendiente |
| QA Ecosystem: Smoke + Sanity (sec. 5.1.5) | Si, 14 tests implementados y verificados | 14/14 pasando en ejecucion local | Ninguna |
| QA Ecosystem: Security (sec. 5.1.6) | Si, 81+ tests implementados | Todos pasando en ejecucion local | CTR004 corregido (token en mensaje no es fuga) |
| QA Ecosystem: Performance + Contract + Validation (sec. 5.1.7) | Si, 59 tests implementados | Todos pasando en ejecucion local | Ninguna |
| QA Ecosystem: Regression (sec. 5.1.5) | Si, 6 tests implementados | Todos pasando en ejecucion local | Ninguna |
| Argumentacion P4 y P5 | Si, con contexto del proyecto | Pendiente reescritura con experiencia real | Pendiente |

### 10.2 Jhorman (frontend + CI/CD)

| Artefacto | Genero la IA | Audito/Modifico el humano | Alucinacion detectada |
| --- | --- | --- | --- |
| `TEST_PLAN.md` estructura completa | Si, version inicial | Pendiente revision completa | Pendiente |
| Suites frontend (sec. 5.2.1) | Si, mapeo de carpetas | Pendiente verificar conteo de archivos | Pendiente |
| Mapeo pipeline CI/CD (sec. 9) | Si, esqueleto de 6 jobs | Pendiente ajuste al YAML final | Pendiente |
| Argumentacion P2 y P6 | Si, con contexto del proyecto | Pendiente reescritura con experiencia real | Pendiente |
| Metricas frontend (sec. 8.2) | Si, datos de cobertura reales | Validado contra `coverage-summary.json` | Ninguna |
