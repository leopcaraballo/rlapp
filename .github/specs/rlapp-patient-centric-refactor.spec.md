---
id: SPEC-001
status: IN_PROGRESS
feature: rlapp-patient-centric-refactor
created: 2026-03-19
updated: 2026-03-19
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: RLAPP - Refactorización Integral de Sala de Espera Médica (Patient-Centric)

> **Estado:** `IN_PROGRESS` — Aprobado por el usuario. Iniciando Fase 2 (Implementación).  
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Rediseño arquitectónico completo de RLAPP (Sistema de Gestión de Sala de Espera Médica) para eliminar el concepto fuertemente acoplado de **Queues centralizadas** y reemplazarlo con una arquitectura **centrada en el Paciente** que permita flujos paralelos independientes en múltiples consultorios, garantizando escalabilidad, trazabilidad por paciente y mantenibilidad del código sin alterar la experiencia de usuario en pantallas existentes.

### Requerimiento de Negocio

**Contexto:**  
RLAPP actualmente gestiona el flujo de pacientes en una sala de espera médica como una cola secuencial única (agregado `WaitingQueue` con `queueId`), donde los pacientes transitan: Recepción → Consultorio → Caja. Este modelo impide:
- Atención paralela en múltiples consultorios simultáneamente
- Escalabilidad operativa (N recepcionistas, N médicos, N cajeros independientes)
- Trazabilidad clara por paciente (el estado está centralizado en la cola)
- Mantenimiento y testabilidad del código

**Objetivo:**  
Transformar RLAPP a una arquitectura **Patient-Centric** donde:
- ✅ El `patientId` es la identidad única e inmutable
- ✅ Múltiples consultorios atienden en paralelo (N flujos independientes simultáneamente)
- ✅ La trazabilidad es por paciente, no por cola
- ✅ Se implementa **Event Sourcing** + **CQRS** + **Outbox Pattern** para garantizar consistencia y observabilidad
- ✅ Se mantiene la interfaz operativa actual (sin nuevas pantallas disruptivas)
- ✅ Se soportan 5 proyecciones especializadas (estado del paciente, ocupancia de consultorios, display público, cola de caja, archivo histórico)

**Restricciones (NO se viola):**
- 🚫 NO crear nuevas pantallas en el frontend (reutilizar/adaptar existentes)
- 🚫 NO cambiar identidades públicas de APIs (mantener contratos existentes)
- 🚫 NO perder datos históricos del sistema actual
- 🚫 NO implementar cambios sin tests exhaustivos

---

### Historias de Usuario

#### HU-01: Registro y Trazabilidad Centrada en Paciente

```
Como:        Paciente
Quiero:      Registrarme en la sala de espera con mi cédula/ID único
Para:        Ser identificable e indivisible del sistema durante toda mi experiencia

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Backend + Frontend
```

**Criterios de Aceptación — HU-01**

**Happy Path**
```gherkin
CRITERIO-1.1: Registro exitoso de nuevo paciente
  Dado que:  Un paciente accede al formulario público de registro
  Cuando:    Ingresa cédula válida (6-20 caracteres), nombre y teléfono
  Entonces:  El sistema genera patientId (UUID), emite PatientRegistered, 
             retorna 201 con {patientId, message: "Patient registered successfully"}

CRITERIO-1.2: Idempotencia en registro
  Dado que:  Un paciente ya se registró hoy con la misma cédula
  Cuando:    Intenta registrarse nuevamente con idempoency key idéntica
  Entonces:  El sistema retorna 200 con el patientId existente, 
             sin crear duplicado
```

**Error Path**
```gherkin
CRITERIO-1.3: Cédula inválida o vacía
  Dado que:  Un paciente envía un registro con cédula vacía o fuera de rango
  Cuando:    POST /api/patients/register sin patientIdentity válida
  Entonces:  El sistema retorna 400 con {error: "Patient identity must be between 6 and 20 characters"}

CRITERIO-1.4: Cédula duplicada en el día
  Dado que:  Un paciente ya registrado intenta registrarse sin idempotency key
  Cuando:    POST /api/patients/register con patientIdentity duplicada
  Entonces:  El sistema retorna 409 con {error: "Patient with identity already registered today"}
```

**Edge Case**
```gherkin
CRITERIO-1.5: Nombres con caracteres especiales
  Dado que:  Un paciente ingresa nombre con tilde: "José María"
  Cuando:    POST /api/patients/register {patientName: "José María", ...}
  Entonces:  El sistema acepta, almacena y retorna con encoding UTF-8 correcto
```

---

#### HU-02: Asignación Paralela de Pacientes a Consultorios

```
Como:        Recepcionista
Quiero:      Asignar pacientes en espera a consultorios activos disponibles
Para:        Que múltiples médicos atiendan en paralelo sin bloqueos de cola

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Backend + Frontend
```

**Criterios de Aceptación — HU-02**

**Happy Path**
```gherkin
CRITERIO-2.1: Transición paciente WAITING → ASSIGNED
  Dado que:  Un paciente está en estado WAITING (marcado listo en recepción)
             y hay al menos un consultorio activo disponible
  Cuando:    Recepcionista ejecuta POST /api/patients/{patientId}/assign-room 
             con {consultingRoomId: "ROOM-001"}
  Entonces:  El sistema emite PatientConsultingRoomAssigned, 
             transiciona a ASSIGNED, retorna 200 {success: true}

CRITERIO-2.2: Ocupancia de consultorio se refleja en real-time
  Dado que:  Un paciente fue asignado a ROOM-001
  Cuando:    Otro recepcionista consulta GET /api/consulting-rooms/occupancy
  Entonces:  Retorna lista con ROOM-001 mostrando currentPatientId asignado
```

**Error Path**
```gherkin
CRITERIO-2.3: Consultorio inactivo
  Dado que:  Un consultorio está inactivo (isActive = false)
  Cuando:    Recepcionista intenta asignar un paciente a ese consultorio
  Entonces:  El sistema retorna 400 con {error: "Consulting room ROOM-001 is not active"}

CRITERIO-2.4: Paciente no en estado WAITING
  Dado que:  Un paciente está en estado REGISTERED (aún no marcado como waiting)
  Cuando:    Recepcionista intenta asignarlo a un consultorio
  Entonces:  El sistema retorna 409 con {error: "Patient state transition invalid: REGISTERED → ASSIGNED"}
```

**Edge Case**
```gherkin
CRITERIO-2.5: Paciente ya asignado a otro consultorio
  Dado que:  Un paciente está en estado ASSIGNED a ROOM-001
  Cuando:    Recepcionista intenta reasignarlo a ROOM-002
  Entonces:  El sistema retorna 409 con {error: "Patient already assigned to ROOM-001"}
```

---

#### HU-03: Flujo Consulta → Caja → Cierre (Descentralizado)

```
Como:        Doctor + Cajero
Quiero:      Ejecutar consultas y validaciones de pago de forma independiente
Para:        Que múltiples consultorios y cajas operen sin bloqueos

Prioridad:   Alta
Estimación:  XL
Dependencias: HU-02
Capa:        Backend + Frontend
```

**Criterios de Aceptación — HU-03**

**Happy Path**
```gherkin
CRITERIO-3.1: Doctor inicia consulta
  Dado que:  Un paciente está en estado ASSIGNED a un consultorio
  Cuando:    Doctor ejecuta POST /api/patients/{patientId}/start-consultation
  Entonces:  El sistema emite PatientConsultationStarted, 
             transiciona a IN_CONSULTATION, retorna 200 {success: true}

CRITERIO-3.2: Doctor finaliza consulta
  Dado que:  Un paciente está en IN_CONSULTATION
  Cuando:    Doctor ejecuta POST /api/patients/{patientId}/finish-consultation 
             con {notes: "Tensión normal, reposar..."}
  Entonces:  El sistema emite PatientConsultationFinished, 
             transiciona a FINISHED_CONSULTATION, libera consultorio

CRITERIO-3.3: Paciente llega a caja
  Dado que:  Un paciente está en FINISHED_CONSULTATION
  Cuando:    Paciente llega a caja y ejecuta 
             POST /api/patients/{patientId}/arrive-cashier
  Entonces:  El sistema genera montoAleatorio [100-500], 
             emite PatientArrivedAtCashier, transiciona a AT_CASHIER, 
             retorna 200 {paymentAmount: X}

CRITERIO-3.4: Cajero valida pago
  Dado que:  Un paciente está en AT_CASHIER con monto generado
  Cuando:    Cajero ejecuta POST /api/patients/{patientId}/validate-payment
  Entonces:  El sistema emite PatientPaymentValidated, 
             transiciona a PAYMENT_VALIDATED, retorna 200

CRITERIO-3.5: Paciente completado
  Dado que:  Un paciente está en PAYMENT_VALIDATED
  Cuando:    Sistema ejecuta POST /api/patients/{patientId}/complete
  Entonces:  El sistema emite PatientCompleted, transiciona a COMPLETED, 
             archiva en histórico, retorna 200 {completedAt: timestamp}
```

**Error Path**
```gherkin
CRITERIO-3.6: Transición de estado inválida
  Dado que:  Un paciente está en WAITING
  Cuando:    Doctor intenta iniciar consulta directamente sin asignarlo primero
  Entonces:  El sistema retorna 409 con {error: "Patient state transition invalid: WAITING → IN_CONSULTATION"}

CRITERIO-3.7: Consultorio sin paciente asignado
  Dado que:  Un consultorio no tiene paciente asignado
  Cuando:    Doctor intenta finalizar una consulta inexistente
  Entonces:  El sistema retorna 400 con {error: "No patient currently in consultation"}
```

**Edge Case**
```gherkin
CRITERIO-3.8: Paciente ausente en consulta
  Dado que:  Un paciente fue asignado pero no se presentó a la consulta
  Cuando:    Doctor marca POST /api/patients/{patientId}/mark-absent-consultation 
             con {reason: "No show"}
  Entonces:  El sistema emite PatientMarkedAbsentAtConsultation, 
             transiciona a ABSENT_AT_CONSULTATION (terminal), retorna 200
```

---

#### HU-04: Visualización Operativa en Frontend (Sin Nuevas Pantallas Disruptivas)

```
Como:        Recepcionista + Doctor + Cajero + Administrador
Quiero:      Ver el estado en tiempo real de pacientes, consultorios y cola de caja
Para:        Tomar decisiones operativas sin dejar la interfaz actual

Prioridad:   Alta
Estimación:  L
Dependencias: HU-02, HU-03
Capa:        Frontend (React/Next.js)
```

**Criterios de Aceptación — HU-04**

**Happy Path**
```gherkin
CRITERIO-4.1: Recepcionista ve lista de pacientes en espera
  Dado que:  Hay 5 pacientes en estado WAITING
  Cuando:    Recepcionista carga /atencion/[serviceId]
  Entonces:  Ve lista de pacientes esperando, ordenados por waitingStartedAt, 
             puede seleccionar y asignar a consultorio

CRITERIO-4.2: Doctor ve paciente asignado automáticamente
  Dado que:  Un paciente fue asignado a su consultorio (ROOM-001)
  Cuando:    Doctor accede a /atencion/[serviceId]
  Entonces:  Ve paciente asignado con nombre, cédula, y botones 
             "Iniciar", "Marcar ausente"

CRITERIO-4.3: Cashier ve cola de pago en tiempo real
  Dado que:  Hay 3 pacientes en AT_CASHIER
  Cuando:    Cajero accede a /payment
  Entonces:  Ve cola ordenada, muestra montos, tiempo esperado, 
             puede validar pagos sin salir de pantalla

CRITERIO-4.4: Admin ve dashboard con métricas
  Dado que:  El sistema lleva 2 horas operando
  Cuando:    Admin accede a /monitor/[serviceId]
  Entonces:  Ve: consultorios activos, pacientes en proceso, tiempo promedio, 
             pagos validados
```

**Error Path**
```gherkin
CRITERIO-4.5: Sin conexión SignalR/polling cae a modo lectura
  Dado que:  Conexión SignalR se pierde temporalmente
  Cuando:    Frontend detecta desconexión
  Entonces:  Muestra "Reconectando..." y reintenta polling cada 2s, 
             sin mostrar error bloqueante
```

**Edge Case**
```gherkin
CRITERIO-4.6: Actualización de estado mientras usuario ve pantalla
  Dado que:  Recepcionista ve lista de esperando
  Cuando:    Recepcionista #2 asigna a paciente X a consultorio
  Entonces:  Pantalla de #1 se actualiza en <1s via SignalR 
             (o polling cuando SignalR no está disponible)
```

---

#### HU-05: Observabilidad, Proyecciones y Resiliencia Operativa

```
Como:        Arquitecto + Operador de Sistema
Quiero:      Garantizar Event Sourcing, proyecciones especializadas y observabilidad end-to-end
Para:        Que el sistema sea resiliente, auditable y mantenible

Prioridad:   Alta
Estimación:  XL
Dependencias: HU-01 a HU-04
Capa:        Backend + Infrastructure
```

**Criterios de Aceptación — HU-05**

**Happy Path**
```gherkin
CRITERIO-5.1: Event Store persiste todos los eventos
  Dado que:  Un paciente transita por múltiples estados
  Cuando:    Cada cambio de estado ocurre (MarkAsWaiting, AssignRoom, etc.)
  Entonces:  Cada evento se persiste en waiting_room_events con 
             {aggregateId, aggregateType, eventName, payload}

CRITERIO-5.2: Outbox Pattern garantiza entrega
  Dado que:  Un evento se persiste en el Event Store
  Cuando:    Simultáneamente se inserta en waiting_room_outbox con status=PENDING
  Entonces:  Worker async publica a RabbitMQ, actualiza status=PUBLISHED, 
             sin riesgo de duplicados (via idempotencyKey)

CRITERIO-5.3: Proyecciones se reconstruyen desde eventos
  Dado que:  El sistema fue reiniciado
  Cuando:    Se ejecuta replay del Event Store
  Entonces:  Todas las proyecciones (patientState, occupancy, cashierQueue, etc.) 
             se reconstruyen con consistencia eventual garantizada

CRITERIO-5.4: Trazabilidad completa por paciente
  Dado que:  Requiero auditar todo lo que pasó con un paciente
  Cuando:    Consulto GET /api/audit/{patientId}
  Entonces:  Retorna timeline completa de eventos ordenados por timestamp, 
             incluyendo actor, correlationId, cambios de estado
```

**Error Path**
```gherkin
CRITERIO-5.5: Fallo de proyección genera alerta sin bloquear
  Dado que:  La proyección de cashierQueue falla al procesar un evento
  Cuando:    El worker detecta excepción en handler
  Entonces:  Registra en logs, incrementa retry counter, 
             reintenta en siguiente ciclo, NO bloquea otros eventos

CRITERIO-5.6: Idempotencia previene duplicados
  Dado que:  El mismo evento se procesa dos veces (ej: retry fallido)
  Cuando:    Se intenta procesar con idempotencyKey duplicada
  Entonces:  Sistema detecta duplicado, ignora sin error, retorna 200 ok
```

**Edge Case**
```gherkin
CRITERIO-5.7: Reconstrucción de estado tras corrupción
  Dado que:  Una proyección quedó inconsistente accidentalmente
  Cuando:    DBA ejecuta reseteo manual de proyección específica
  Entonces:  Sistema replayed eventos desde checkpoint previo, 
             reconstruye estado, resincroniza con Event Store
```

---

### Reglas de Negocio

1. **Identidad de Paciente**: Cada paciente tiene un `patientId` (UUID) único e inmutable asignado al registrarse. El `patientIdentity` (cédula/ID legal) es único por día y no puede repetirse en el mismo día.

2. **Máquina de Estados**: Un paciente SOLO transita por estados válidos: `REGISTERED → WAITING → ASSIGNED → IN_CONSULTATION → FINISHED_CONSULTATION → AT_CASHIER → PAYMENT_VALIDATED → COMPLETED` o hacia estados terminales (ABSENT_AT_CONSULTATION, ABSENT_AT_CASHIER, CANCELLED_BY_PAYMENT).

3. **Consulting Rooms**: Un consultorio (`ROOM-XXX`) solo puede estar activo si fue creado por Administrador. Un consultorio solo puede atender a UN paciente a la vez.

4. **Pago**: El monto de pago se generaaleatoriamente cuando el paciente llega a caja [100-500], es inmutable, y debe ser > 0 y ≤ 1.000.000.

5. **Autorización por Rol**: 
   - Recepcionista: marca waiting, asigna consultorios, ve pacientes esperando
   - Doctor: inicia y finaliza consultas, marca ausentes
   - Cajero: valida pagos, ve cola de caja
   - Administrador: activa/desactiva consultorios, crea reportes

6. **Event Sourcing**: Cada cambio de estado emite un evento. El Event Store es la fuente de verdad. Las proyecciones son read models derivadas.

7. **Outbox Pattern**: Todo evento publicado USA el patrón outbox: evento → outbox (PENDING) → RabbitMQ → proyecciones, garantizando At-Least-Once delivery.

8. **Idempotencia**: Toda solicitud DEBE incluir `idempotencyKey`. Si se repite, retorna mismo resultado sin efecto secundario.

9. **Consultorios Paralelos**: N consultorios pueden atender simultáneamente sin bloqueos. El estado de cada paciente es completamente independiente.

10. **Compatibilidad Temporal**: Durante transición, el sistema debe soportar coexistencia temporal de lógica legada y nueva arquitectura (si aplica), con plan posterior de eliminación.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades Afectadas

| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Patient` | Event Store + `patients_state_view` (projection) | Nueva | Agregado raíz Patient centrado en flujo individuo |
| `ConsultingRoom` | Event Store + `consulting_rooms` (tabla ref) | Nueva | Agregado secundario para gestionar consultorios paralelos |
| `waiting_room_events` | PostgreSQL (Event Store) | Refactorizada | Ahora: aggregateId = patientId \| roomId, aggregateType = Patient \| ConsultingRoom |
| `waiting_room_patients` | PostgreSQL | Expandida | Almacena identidad de paciente para trazabilidad (patientId, patientIdentity, patientName, phoneNumber) |
| `waiting_room_outbox` | PostgreSQL | Sin cambios | Patrón outbox para garantía entrega de eventos a RabbitMQ |
| `projection_checkpoints` | PostgreSQL | Sin cambios | Checkpoints para reconstrucción incremental de proyecciones |

#### Campos del Modelo de Agregado Patient

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `patientId` | UUID string | sí | Única en Event Store | Identificador único del paciente |
| `patientIdentity` | string | sí | 6-20 chars, único/día | Cédula o ID legal (PatientIdentity value object) |
| `patientName` | string | sí | max 255 chars | Nombre del paciente |
| `phoneNumber` | string | no | max 20 chars | Teléfono de contacto |
| `currentState` | enum | sí | Estados válidos | REGISTERED, WAITING, ASSIGNED, IN_CONSULTATION, etc. |
| `createdAt` | datetime (UTC) | sí | auto en evento PatientRegistered | Timestamp de creación |
| `lastModifiedAt` | datetime (UTC) | sí | auto en cada evento aplicado | Timestamp última modificación |
| `waitingStartedAt` | datetime (UTC) | no | si state >= WAITING | Cuando recepcionista marcó como waiting |
| `assignedConsultingRoomId` | string | no | ROOM-XXX format | Consultorio asignado (nullable) |
| `consultationStartedAt` | datetime (UTC) | no | si state IN_CONSULTATION, FINISHED_CONSULTATION | Cuando doctor inició consulta |
| `consultationFinishedAt` | datetime (UTC) | no | si state >= FINISHED_CONSULTATION | Cuando doctor finalizó |
| `paymentAmount` | decimal | no | > 0 && <= 1M si state >= AT_CASHIER | Monto generado al llegar a caja |
| `paymentAttempts` | int | no | >= 0 | Cantidad intentos validación pago |
| `paymentValidatedAt` | datetime (UTC) | no | si state PAYMENT_VALIDATED | Timestamp validación pago |
| `completedAt` | datetime (UTC) | no | si state COMPLETED | Timestamp proceso completado |
| `leaveReason` | string | no | max 255 chars | Razón de salida (ABSENT_AT_CONSULTATION, etc.) |

#### Campos del Modelo de Agregado ConsultingRoom

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `roomId` | string | sí | ROOM-XXX, única | Identificador único del consultorio |
| `roomName` | string | sí | max 255 chars | Nombre/descripción (ej. "Dr. García - Box 1") |
| `isActive` | bool | sí | default: FALSE | Consultorio habilitado por admin |
| `currentPatientId` | string | no | nullable | Paciente actualmente siendo atendido |
| `attentionStartedAt` | datetime (UTC) | no | si currentPatientId != null | Timestamp inicio atención en consultorio |
| `createdAt` | datetime (UTC) | sí | auto | Timestamp creación consultorio |
| `lastModifiedAt` | datetime (UTC) | sí | auto | Timestamp última modificación |

#### Índices / Constraints

- `waiting_room_events`: UNIQUE(`aggregateId`, `version`) + INDEX(`aggregateType`, `eventName`)
- `waiting_room_patients`: UNIQUE(`patientIdentity`)
- `consulting_rooms`: PRIMARY KEY(`roomId`), INDEX(`isActive`)
- `patients_state_view`: PRIMARY KEY(`patientId`), UNIQUE(`patientIdentity`), INDEX(`currentState`, `assignedRoomId`)
- `consulting_room_occupancy_view`: PRIMARY KEY(`roomId`), INDEX(`isActive`, `currentPatientId`)
- `cashier_queue_view`: PRIMARY KEY(`patientId`), INDEX(`arrivedAtCashierAt`)

---

### API Endpoints

#### POST /api/patients/register
- **Descripción**: Registra un nuevo paciente (público, SIN autenticación)
- **Auth requerida**: NO
- **Request Body**:
  ```json
  {
    "patientIdentity": "12345678",
    "patientName": "Carlos López",
    "phoneNumber": "+56912345678",
    "idempotencyKey": "uuid-v4-unique-per-request"
  }
  ```
- **Response 201**:
  ```json
  {
    "patientId": "uuid",
    "patientIdentity": "12345678",
    "patientName": "Carlos López",
    "message": "Patient registered successfully"
  }
  ```
- **Response 200** (idempotent):
  ```json
  {
    "patientId": "uuid-existing",
    "message": "Patient already registered today"
  }
  ```
- **Response 400**: Validación fallida (identidad inválida, campos vacíos)
- **Response 409**: Identidad duplicada (sin idempotencyKey)

#### POST /api/patients/{patientId}/mark-waiting
- **Descripción**: Recepcionista marca paciente como en espera (REGISTERED → WAITING)
- **Auth requerida**: SÍ (rol: Receptionist)
- **Request Body**:
  ```json
  {
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**: `{ "success": true }`
- **Response 400**: PatientId no encontrado
- **Response 409**: Transición de estado inválida

#### POST /api/patients/{patientId}/assign-room
- **Descripción**: Recepcionista asigna consultorio (WAITING → ASSIGNED)
- **Auth requerida**: SÍ (rol: Receptionist)
- **Request Body**:
  ```json
  {
    "consultingRoomId": "ROOM-001",
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**: `{ "success": true }`
- **Response 400**: Consultorio inactivo o no encontrado
- **Response 409**: Consultorio ocupado o transición inválida

#### POST /api/patients/{patientId}/start-consultation
- **Descripción**: Doctor inicia consulta (ASSIGNED → IN_CONSULTATION)
- **Auth requerida**: SÍ (rol: Doctor)
- **Request Body**:
  ```json
  {
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**: `{ "success": true }`
- **Response 409**: Paciente no asignado o estado inválido

#### POST /api/patients/{patientId}/finish-consultation
- **Descripción**: Doctor finaliza consulta (IN_CONSULTATION → FINISHED_CONSULTATION)
- **Auth requerida**: SÍ (rol: Doctor)
- **Request Body**:
  ```json
  {
    "notes": "Presión normal, reposo recomendado",
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**: `{ "success": true }`
- **Response 400**: Sin notas (requeridas) o paciente no en consulta

#### POST /api/patients/{patientId}/arrive-cashier
- **Descripción**: Paciente llega a caja (FINISHED_CONSULTATION → AT_CASHIER)
- **Auth requerida**: NO (paciente llega por cuenta propia)
- **Request Body**:
  ```json
  {
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**:
  ```json
  {
    "success": true,
    "paymentAmount": 245.50
  }
  ```
- **Response 409**: Paciente no finalizó consulta

#### POST /api/patients/{patientId}/validate-payment
- **Descripción**: Cajero valida pago (AT_CASHIER → PAYMENT_VALIDATED)
- **Auth requerida**: SÍ (rol: Cashier)
- **Request Body**:
  ```json
  {
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**: `{ "success": true }`
- **Response 409**: Paciente no en caja o pago inválido

#### POST /api/patients/{patientId}/complete
- **Descripción**: Sistema marca proceso completado (PAYMENT_VALIDATED → COMPLETED)
- **Auth requerida**: SÍ (rol: Admin o System)
- **Request Body**:
  ```json
  {
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**:
  ```json
  {
    "success": true,
    "completedAt": "2026-03-19T14:35:22Z"
  }
  ```

#### GET /api/patients/{patientId}/state
- **Descripción**: Obtiene estado actual del paciente (read model)
- **Auth requerida**: SÍ (o público con limitaciones)
- **Response 200**:
  ```json
  {
    "patientId": "uuid",
    "patientName": "Carlos López",
    "currentState": "IN_CONSULTATION",
    "assignedRoomId": "ROOM-001",
    "waitingStartedAt": "2026-03-19T13:45:00Z",
    "consultationStartedAt": "2026-03-19T14:00:00Z",
    "paymentAmount": null,
    "completedAt": null
  }
  ```
- **Response 404**: Paciente no encontrado

#### GET /api/patients/waiting
- **Descripción**: Lista pacientes en espera (estado = WAITING), ordenados por tiempo
- **Auth requerida**: SÍ (rol: Receptionist, Doctor, Admin)
- **Response 200**:
  ```json
  [
    {
      "patientId": "uuid-1",
      "patientIdentity": "12345678",
      "patientName": "Carlos López",
      "waitingTime": "00:15:30",
      "waitingStartedAt": "2026-03-19T13:45:00Z"
    }
  ]
  ```

#### GET /api/consulting-rooms/occupancy
- **Descripción**: Obtiene ocupancia actual de consultorios (read model)
- **Auth requerida**: SÍ (rol: Receptionist, Doctor, Admin)
- **Response 200**:
  ```json
  [
    {
      "roomId": "ROOM-001",
      "roomName": "Dr. García",
      "isActive": true,
      "currentPatientId": "uuid",
      "patientName": "Carlos López",
      "attentionStartedAt": "2026-03-19T14:00:00Z",
      "attentionDurationSeconds": 425
    },
    {
      "roomId": "ROOM-002",
      "roomName": "Dr. Martínez",
      "isActive": true,
      "currentPatientId": null,
      "patientName": null,
      "attentionStartedAt": null
    }
  ]
  ```

#### GET /api/patients/cashier-queue
- **Descripción**: Cola de pacientes en caja esperando validación de pago
- **Auth requerida**: SÍ (rol: Cashier, Admin)
- **Response 200**:
  ```json
  [
    {
      "patientId": "uuid",
      "patientIdentity": "12345678",
      "patientName": "Carlos López",
      "paymentAmount": 245.50,
      "arrivedAtCashierAt": "2026-03-19T14:25:00Z",
      "waitingTimeCashier": "00:10:15"
    }
  ]
  ```

#### POST /api/consulting-rooms/{roomId}/activate
- **Descripción**: Administrador activa un consultorio
- **Auth requerida**: SÍ (rol: Admin ONLY)
- **Request Body**:
  ```json
  {
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**: `{ "success": true }`

#### POST /api/consulting-rooms/{roomId}/deactivate
- **Descripción**: Administrador desactiva un consultorio
- **Auth requerida**: SÍ (rol: Admin ONLY)
- **Request Body**:
  ```json
  {
    "correlationId": "uuid",
    "idempotencyKey": "uuid"
  }
  ```
- **Response 200**: `{ "success": true }`

#### GET /api/audit/{patientId}
- **Descripción**: Timeline completa de eventos de un paciente (trazabilidad)
- **Auth requerida**: SÍ (rol: Admin ONLY)
- **Response 200**:
  ```json
  {
    "patientId": "uuid",
    "events": [
      {
        "eventId": "uuid",
        "eventName": "PatientRegistered",
        "occurredAt": "2026-03-19T13:30:00Z",
        "actor": "Patient",
        "correlationId": "uuid",
        "payload": { ... }
      },
      { "eventName": "PatientMarkedAsWaiting", ... },
      { "eventName": "PatientConsultingRoomAssigned", ... }
    ]
  }
  ```

---

### Diseño Frontend

#### Componentes Nuevos / Refactorizados

| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `PatientRegistrationForm` | `components/PatientRegistrationForm` | `onSuccess`, `onError` | Formulario registro paciente (público) |
| `WaitingPatientsList` | `components/WaitingPatientsList` | `patients`, `onAssign`, `loading` | Lista pacientes esperando asignación |
| `ConsultingRoomCard` | `components/ConsultingRoomCard` | `room`, `onStartConsultation`, `onFinishConsultation` | Tarjeta estado consultorio |
| `PaymentQueue` | `components/PaymentQueue` | `patients`, `onValidatePayment`, `loading` | Cola de pago interactiva |
| `PatientStateIndicator` | `components/PatientStateIndicator` | `state`, `timestamp` | Indicador estado actual |
| `AuditTimeline` | `components/AuditTimeline` | `patientId`, `events` | Timeline de eventos (admin) |

#### Páginas Nuevas / Refactorizadas

| Página | Archivo | Ruta | Protegida | Descripción |
|--------|---------|------|-----------|-------------|
| `RegistrationPage` | `app/register/page.tsx` | `/register` | NO | Formulario público registro |
| `AtencionPage` | `app/atencion/[serviceId]/page.tsx` | `/atencion/[serviceId]` | SÍ (Doctor, Receptionist, Admin) | Gestor flujo consultas |
| `PaymentPage` | `app/payment/page.tsx` | `/payment` | SÍ (Cashier, Admin) | Gestor caja y pagos |
| `StationsPage` | `app/stations/page.tsx` | `/stations` | SÍ (Admin) | Gestor consultorios |
| `MonitorPage` | `app/monitor/[serviceId]/page.tsx` | `/monitor/[serviceId]` | SÍ (Admin) | Dashboard métricas |

#### Hooks y State Management

| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useAtencion` | `hooks/useAtencion.ts` | `{ patients, rooms, markWaiting, assignRoom, startConsultation, finishConsultation, loading, error }` | CRUD flujo consultas |
| `usePayment` | `hooks/usePayment.ts` | `{ queue, validatePayment, loading }` | Gestión caja |
| `useConsultingRooms` | `hooks/useConsultingRooms.ts` | `{ rooms, activate, deactivate, loading }` | Gestión consultorios |
| `usePatientState` | `hooks/usePatientState.ts` | `{ patient, state, refresh, loading }` | Estado paciente actualizado |
| `usePatientsSubscription` | `hooks/usePatientsSubscription.ts` | `{ patients, subscribe, unsubscribe }` | Suscripción cambios pacientes via SignalR/polling |

#### Services (Llamadas API)

| Función | Archivo | Endpoint | Descripción |
|---------|---------|---------|-------------|
| `registerPatient(data, idempotencyKey)` | `services/patientService.ts` | POST /api/patients/register | Registra paciente |
| `markPatientAsWaiting(patientId, ...)` | `services/patientService.ts` | POST /api/patients/{id}/mark-waiting | Marca como waiting |
| `assignConsultingRoom(patientId, roomId, ...)` | `services/patientService.ts` | POST /api/patients/{id}/assign-room | Asigna consultorio |
| `startConsultation(patientId, ...)` | `services/patientService.ts` | POST /api/patients/{id}/start-consultation | Inicia consulta |
| `finishConsultation(patientId, notes, ...)` | `services/patientService.ts` | POST /api/patients/{id}/finish-consultation | Finaliza consulta |
| `arriveCashier(patientId, ...)` | `services/patientService.ts` | POST /api/patients/{id}/arrive-cashier | Llega a caja |
| `validatePayment(patientId, ...)` | `services/patientService.ts` | POST /api/patients/{id}/validate-payment | Valida pago |
| `getWaitingPatients(token)` | `services/patientService.ts` | GET /api/patients/waiting | Lista en espera |
| `getPatientState(patientId, token)` | `services/patientService.ts` | GET /api/patients/{id}/state | Estado paciente |
| `getConsultingRoomOccupancy(token)` | `services/consultingRoomService.ts` | GET /api/consulting-rooms/occupancy | Ocupancia consultorios |
| `getCashierQueue(token)` | `services/paymentService.ts` | GET /api/patients/cashier-queue | Cola caja |

#### Context y Providers

- **`DependencyContext`**: Inyecta servicios HTTP y SignalR (existente, reutilizar)
- **`PatientSubscriptionProvider`**: Mantiene suscripción a cambios de pacientes via SignalR/polling

---

### Arquitectura y Dependencias

#### Stack Backend (.NET 10)

- **Framework**: ASP.NET Minimal API
- **Event Sourcing**: `BuildingBlocks.EventSourcing` (custom)
- **CQRS**: MediatR 12+
- **ORM**: EF Core 10+
- **Messaging**: RabbitMQ 3.12+ (Outbox Pattern)
- **Real-time**: SignalR (.NET 10)
- **Database**: PostgreSQL 15+
- **Testing**: xUnit + Moq

#### Stack Frontend (Next.js)

- **Framework**: Next.js 16 (App Router)
- **React**: 19+
- **TypeScript**: 5.5+
- **HTTP Client**: fetch (con HttpCommandAdapter existente)
- **Real-time**: SignalR JS client + descenso a polling
- **CSS**: CSS Modules + Tailwind (si ya existe)
- **Testing**: Jest + React Testing Library + Cypress (E2E)

#### Servicios Externos / Integraciones

- **RabbitMQ**: Message broker para Outbox → Events
- **PostgreSQL**: Persistencia Event Store + Proyecciones + Checkpoints
- **SignalR Hub**: Broadcast cambios en tiempo real a clientes (fallback: polling GET cada 2s)

#### Punto de Entrada Backend

- **`WaitingRoom.API/Program.cs`**: Registra MediatR handlers, repositorios, adaptadores SignalR, middleware de correlación e idempotencia, wiring DI

---

### Notas de Implementación

1. **Event Sourcing + CQRS Aplicados**:
   - Command Side (Write): Los comandos (RegisterPatient, MarkAsWaiting, etc.) crean eventos, persisten en Event Store, publican via Outbox.
   - Query Side (Read): Proyecciones especializadas leen desde tablas read models (`patients_state_view`, `consulting_room_occupancy_view`, etc.).

2. **Outbox Pattern**:
   - Evento se escribe + Outbox se inserta en transacción DB.
   - Worker async monitorea Outbox (status = PENDING).
   - Publica a RabbitMQ, cambia status a PUBLISHED.
   - Reintenta hasta 3 veces si falla.

3. **Idempotencia**:
   - Todo endpoint CQRS recibe `idempotencyKey` (UUID único por request).
   - Index UNIQUE sobre `(idempotencyKey)` en Event Store.
   - Si duplicada, retorna 200 con resultado previo sin efecto.

4. **Proyecciones Especializadas** (5 total):
   - `patients_state_view`: Estado actual cada paciente (lectura rápida)
   - `waiting_room_display_view`: Pacientes esperando + posición (display público)
   - `consulting_room_occupancy_view`: Ocupancia consultorios en tiempo real
   - `cashier_queue_view`: Pacientes en caja ordenados por llegada
   - `completed_patients_view`: Histórico de procesos completados (archivado)

5. **Coexistencia Temporal Legado ↔ Nuevo**:
   - Si la migración es gradual, registros del sistema antiguo vivirán paralelos durante transición.
   - La aplicación debe mantenener ambos agregados (`WaitingQueue` + `Patient`) mientras dura la migración.
   - Plan posterior: Eliminar `WaitingQueue` una vez TODOS los pacientes migren a `Patient`.

6. **Resiliencia**:
   - Fallos en proyecciones retentarán sin bloquear Event Store.
   - Fallos en SignalR caerán a polling (GET /api/patients/waiting cada 2s).
   - Fallos en Outbox reintentarán hasta 3 veces con backoff exponencial.

7. **Trazabilidad Completa**:
   - Cada evento lleva: `correlationId` (rastrear request), `causationId` (rastrear cadena causal), `actor` (quién ejecutó), `idempotencyKey`.
   - Endpoint GET /api/audit/{patientId} retorna timeline de eventos ordenados.

8. **Validaciones en Capas**:
   - **DTO**: Validaciones básicas (formato, rango).
   - **Invariantes de Dominio**: Reglas complejas en `PatientInvariants`, `ConsultingRoomInvariants`.
   - **Repository**: Validaciones de estado antes de persistencia.

---

## 3. LISTA DE TAREAS

> Checklist accionable para Backend, Frontend y QA. Marcar (`[x]`) al completar.
> El Orchestrator monitorea este checklist.

### Backend

#### Domain Models & Aggregates
- [ ] Crear `Patient` aggregate root en `WaitingRoom.Domain/Aggregates/Patient.cs`
  - [ ] Factory method `Patient.Create()` para REGISTERED
  - [ ] Command handlers: `MarkAsWaiting`, `AssignConsultingRoom`, `StartConsultation`, `FinishConsultation`, `ArriveCashier`, `ValidatePayment`, `Complete`
  - [ ] Event handlers: Apply methods para todos los eventos domain
  - [ ] Invariantes en `PatientInvariants.cs`

- [ ] Crear `ConsultingRoom` aggregate root en `WaitingRoom.Domain/Aggregates/ConsultingRoom.cs`
  - [ ] Factory method `ConsultingRoom.Create()`
  - [ ] Commands: `Activate`, `Deactivate`, `StudentBeingServed`, `PatientLeftConsultation`
  - [ ] Invariantes en `ConsultingRoomInvariants.cs`

- [ ] Value Objects en `WaitingRoom.Domain/ValueObjects/`:
  - [ ] `PatientIdentity.cs` (6-20 chars, immutable)
  - [ ] `ConsultingRoomId.cs` (ROOM-XXX format, immutable)
  - [ ] `PaymentAmount.cs` (> 0 && <= 1M, immutable)

#### Domain Events
- [ ] Crear interfaces y clases en `WaitingRoom.Domain/Events/`:
  - [ ] `PatientRegistered`
  - [ ] `PatientMarkedAsWaiting`
  - [ ] `PatientConsultingRoomAssigned`
  - [ ] `PatientConsultationStarted`
  - [ ] `PatientConsultationFinished`
  - [ ] `PatientArrivedAtCashier`
  - [ ] `PatientPaymentValidated`
  - [ ] `PatientCompleted`
  - [ ] `PatientMarkedAbsentAtConsultation`
  - [ ] `PatientMarkedAbsentAtCashier`
  - [ ] `ConsultingRoomCreated`
  - [ ] `ConsultingRoomActivated`
  - [ ] `ConsultingRoomDeactivated`
  - [ ] `ConsultingRoomPatientAssigned`
  - [ ] `ConsultingRoomPatientLeft`

#### Application Layer
- [ ] Crear Command DTOs en `WaitingRoom.Application/Commands/`:
  - [ ] `RegisterPatientCommand` + `RegisterPatientResponse`
  - [ ] `MarkPatientAsWaitingCommand` + `MarkPatientAsWaitingResponse`
  - [ ] `AssignConsultingRoomCommand` + `AssignConsultingRoomResponse`
  - [ ] `StartConsultationCommand` + `StartConsultationResponse`
  - [ ] `FinishConsultationCommand` + `FinishConsultationResponse`
  - [ ] `ArriveCashierCommand` + `ArriveCashierResponse`
  - [ ] `ValidatePaymentCommand` + `ValidatePaymentResponse`
  - [ ] `CompletePatientCommand` + `CompletePatientResponse`

- [ ] Crear Command Handlers en `WaitingRoom.Application/CommandHandlers/`:
  - [ ] `RegisterPatientCommandHandler`
  - [ ] `MarkPatientAsWaitingCommandHandler`
  - [ ] `AssignConsultingRoomCommandHandler`
  - [ ] `StartConsultationCommandHandler`
  - [ ] `FinishConsultationCommandHandler`
  - [ ] `ArriveCashierCommandHandler`
  - [ ] `ValidatePaymentCommandHandler`
  - [ ] `CompletePatientCommandHandler`

- [ ] Crear Query DTOs y Handlers en `WaitingRoom.Application/Queries/`:
  - [ ] `GetPatientStateQuery` + `GetPatientStateQueryHandler`
  - [ ] `GetWaitingPatientsQuery` + `GetWaitingPatientsQueryHandler`
  - [ ] `GetConsultingRoomOccupancyQuery` + `GetConsultingRoomOccupancyQueryHandler`
  - [ ] `GetCashierQueueQuery` + `GetCashierQueueQueryHandler`
  - [ ] `GetPatientAuditQuery` + `GetPatientAuditQueryHandler`

- [ ] Crear DTOs en `WaitingRoom.Application/DTOs/`:
  - [ ] `PatientStateDto`
  - [ ] `PatientSummaryDto`
  - [ ] `ConsultingRoomOccupancyDto`
  - [ ] `CashierQueueItemDto`
  - [ ] `PatientAuditEventDto`

#### Infrastructure & Persistence
- [ ] Crear Repositories en `WaitingRoom.Infrastructure/Persistence/`:
  - [ ] `IPatientRepository` interface + `PatientRepository` implementation
  - [ ] `IConsultingRoomRepository` interface + `ConsultingRoomRepository` implementation
  - [ ] `IPatientStateRepository` interface (read model)
  - [ ] `ICashierQueueRepository` interface (read model)

- [ ] Migración DB:
  - [ ] Crear script SQL con Event Store (waiting_room_events)
  - [ ] Crear tabla Outbox (waiting_room_outbox)
  - [ ] Crear tabla Pacientes (waiting_room_patients)
  - [ ] Crear tabla Consultorios (consulting_rooms)
  - [ ] Crear 5 proyecciones (patients_state_view, waiting_room_display_view, consulting_room_occupancy_view, cashier_queue_view, completed_patients_view)
  - [ ] Crear indexes y constraints según FASE-1 spec
  - [ ] Registrar migración en EF Core DbContext

- [ ] Event Store Handler:
  - [ ] Implementar `IEventStore` para persistir eventos en waiting_room_events
  - [ ] Implementar `IEventPublisher` para publicar a Outbox

- [ ] Projection Handlers:
  - [ ] Crear handler para `PatientRegistered` → inserta en patients_state_view
  - [ ] Crear handler para `PatientMarkedAsWaiting` → actualiza patients_state_view
  - [ ] Crear handler para `PatientConsultingRoomAssigned` → actualiza patients_state_view + consulting_room_occupancy_view
  - [ ] Crear handler para `PatientConsultationStarted` → actualiza patients_state_view
  - [ ] Crear handler para `PatientConsultationFinished` → actualiza patients_state_view
  - [ ] Crear handler para `PatientArrivedAtCashier` → inserta en cashier_queue_view
  - [ ] Crear handler para `PatientPaymentValidated` → actualiza cashier_queue_view
  - [ ] Crear handler para `PatientCompleted` → inserta en completed_patients_view
  - [ ] Implementar projection checkpoint mechanism

#### API Endpoints
- [ ] Endpoints en `WaitingRoom.API/Program.cs`:
  - [ ] POST /api/patients/register
  - [ ] POST /api/patients/{patientId}/mark-waiting
  - [ ] POST /api/patients/{patientId}/assign-room
  - [ ] POST /api/patients/{patientId}/start-consultation
  - [ ] POST /api/patients/{patientId}/finish-consultation
  - [ ] POST /api/patients/{patientId}/arrive-cashier
  - [ ] POST /api/patients/{patientId}/validate-payment
  - [ ] POST /api/patients/{patientId}/complete
  - [ ] GET /api/patients/{patientId}/state
  - [ ] GET /api/patients/waiting
  - [ ] GET /api/consulting-rooms/occupancy
  - [ ] GET /api/patients/cashier-queue
  - [ ] POST /api/consulting-rooms/{roomId}/activate
  - [ ] POST /api/consulting-rooms/{roomId}/deactivate
  - [ ] GET /api/audit/{patientId}

- [ ] Middleware y Filtros:
  - [ ] Filtro correlationId (generar si no existe)
  - [ ] Filtro idempotencyKey (validar presencia si requerido)
  - [ ] Filtro autorización por rol (Receptionist, Doctor, Cashier, Admin)
  - [ ] Error handler centralizado

#### SignalR Hub
- [ ] Crear `WaitingRoomHub.cs`:
  - [ ] Grupo "reception" → notificaciones pacientes nuevos, cambios de espera
  - [ ] Grupo "doctors" → notificaciones asignación consultorio, cambios ocupancia
  - [ ] Grupo "cashiers" → notificaciones llegada a caja, cambios cola pago
  - [ ] Grupo "admin-monitor" → broadcast de métricas cada 5s
  - [ ] Métodos: `SendPatientStateUpdate`, `SendRoomOccupancyUpdate`, `SendCashierQueueUpdate`

#### Outbox Worker
- [ ] Crear background service en `WaitingRoom.Infrastructure/Messaging/`:
  - [ ] `OutboxPublisher` que monitorea waiting_room_outbox
  - [ ] Publica a RabbitMQ con retry logic (3 intentos, backoff exponencial)
  - [ ] Actualiza status a PUBLISHED al éxito
  - [ ] Log completo de intentos y errores

---

### Frontend

#### Components (React/Next.js)
- [ ] Crear `components/PatientRegistrationForm.tsx`:
  - [ ] Form con campos: patientIdentity, patientName, phoneNumber
  - [ ] Validación client-side
  - [ ] Llamada HTTP a POST /api/patients/register
  - [ ] Manejo de idempotencyKey
  - [ ] UX: spinner de carga, mensajes de éxito/error

- [ ] Crear `components/WaitingPatientsList.tsx`:
  - [ ] Listado de pacientes en estado WAITING (GET /api/patients/waiting)
  - [ ] Ordenados por waitingTime ascendente
  - [ ] Botón para cada paciente: "Asignar a consultorio"
  - [ ] Modal/dropdown para seleccionar consultorio disponible
  - [ ] Llamada a POST /api/patients/{id}/assign-room

- [ ] Crear `components/ConsultingRoomCard.tsx`:
  - [ ] Tarjeta por consultorio con: roomId, roomName, isActive, currentPatient
  - [ ] Si ocupado: muestra paciente, tiempo atención, botones "Finalizar consulta", "Marcar ausente"
  - [ ] Si libre: muestra "Disponible"
  -actualización automática via SignalR

- [ ] Crear `components/PaymentQueue.tsx`:
  - [ ] Cola de pacientes en AT_CASHIER (GET /api/patients/cashier-queue)
  - [ ] Por cada paciente: identity, name, paymentAmount, timeWaitingCashier
  - [ ] Botón "Validar pago" → POST /api/patients/{id}/validate-payment
  - [ ] Refresco automático

- [ ] Crear `components/PatientStateIndicator.tsx`:
  - [ ] Badge con estado actual del paciente (color-coded)
  - [ ] Muestra también: waitingTime, assignedRoom, etc.

- [ ] Crear `components/AuditTimeline.tsx` (Admin):
  - [ ] Timeline vertical de eventos para un paciente
  - [ ] Cada evento: timestamp, eventName, actor, cambios de estado
  - [ ] GET /api/audit/{patientId}

#### Pages (Next.js App Router)
- [ ] Crear `app/register/page.tsx`:
  - [ ] Ruta pública (sin autenticación)
  - [ ] Renderiza `PatientRegistrationForm`

- [ ] Crear `app/atencion/[serviceId]/page.tsx`:
  - [ ] Protegida: roles Doctor, Receptionist, Admin
  - [ ] Layout: Lado izquierdo = lista pacientes waiting, lado derecho = tarjetas consultorios
  - [ ] Usa `useAtencion` hook

- [ ] Crear `app/payment/page.tsx`:
  - [ ] Protegida: roles Cashier, Admin
  - [ ] Renderiza `PaymentQueue`
  - [ ] Usa `usePayment` hook

- [ ] Crear `app/stations/page.tsx`:
  - [ ] Protegida: rol Admin
  - [ ] Lista de consultorios con botones activate/deactivate
  - [ ] Usa `useConsultingRooms` hook

- [ ] Crear `app/monitor/[serviceId]/page.tsx`:
  - [ ] Protegida: rol Admin
  - [ ] Dashboard con métricas: consultorios activos, pacientes total, tiempo promedio, pagos validados
  - [ ] Gráfico de ocupancia a lo largo del tiempo (polling cada 30s)

#### Hooks
- [ ] Crear `hooks/useAtencion.ts`:
  - [ ] Fetch waiting patients, room occupancy
  - [ ] Comandos: markWaiting, assignRoom, startConsultation, finishConsultation
  - [ ] Suscripción a cambios via usePatientsSubscription

- [ ] Crear `hooks/usePayment.ts`:
  - [ ] Fetch cashier queue
  - [ ] Comando: validatePayment
  - [ ] Refresh automático cada 3s

- [ ] Crear `hooks/useConsultingRooms.ts`:
  - [ ] Fetch rooms
  - [ ] Comandos: activate, deactivate
  - [ ] Suscripción a cambios de ocupancia

- [ ] Crear `hooks/usePatientState.ts`:
  - [ ] Fetch estado actual de paciente (GET /api/patients/{id}/state)
  - [ ] Trigger refresh manual
  - [ ] Caché local con TTL de 5s

- [ ] Crear `hooks/usePatientsSubscription.ts`:
  - [ ] Suscripción a SignalR groups (reception, doctors, cashiers)
  - [ ] Fallback a polling si SignalR desconecta
  - [ ] Notificaciones de cambios a componentes suscritos

#### Services (API Client)
- [ ] Crear `services/patientService.ts`:
  - [ ] Todas las funciones según spec de endpoints
  - [ ] Incluir idempotencyKey, correlationId
  - [ ] Manejo de errores centralizado

- [ ] Crear `services/consultingRoomService.ts`:
  - [ ] Funciones para consultorios

- [ ] Crear `services/paymentService.ts`:
  - [ ] Funciones para pagos y caja

#### Context & Providers
- [ ] Crear `context/PatientSubscriptionProvider.tsx`:
  - [ ] Mantiene estado de suscripciones SignalR
  - [ ] Expone hooks para componentes

---

### Tests Backend

#### Unit Tests Domain
- [ ] `tests/WaitingRoom.Domain.Tests/Aggregates/PatientTests.cs`:
  - [ ] `TestCreate_ValidInput_CreatesPatientInRegisteredState`
  - [ ] `TestMarkAsWaiting_ValidState_TransitionsToWaiting`
  - [ ] `TestAssignConsultingRoom_ValidInput_TransitionsToAssigned`
  - [ ] `TestAssignConsultingRoom_InactiveRoom_ThrowsDomainException`
  - [ ] `TestStartConsultation_NotAssigned_ThrowsInvalidStateException`
  - [ ] `TestFinishConsultation_InConsultation_TransitionsToFinished`
  - [ ] `TestArriveCashier_FinishedConsultation_GeneratesPaymentAndTransitions`
  - [ ] `TestValidatePayment_AtCashier_TransitionsToPaymentValidated`
  - [ ] `TestComplete_PaymentValidated_TransitionsToCompleted`
  - [ ] `TestMarkAbsentAtConsultation_Assigned_TransitionsToAbsentTerminal`

- [ ] `tests/WaitingRoom.Domain.Tests/Aggregates/ConsultingRoomTests.cs`:
  - [ ] `TestCreate_ValidInput_CreatesInactiveRoom`
  - [ ] `TestActivate_Inactive_BecomesActive`
  - [ ] `TestDeactivate_Active_BecomesInactive`
  - [ ] `TestStudentBeingServed_Active_AssignsPatient`
  - [ ] `TestStudentBeingServed_AlreadyOccupied_ThrowsException`
  - [ ] `TestPatientLeftConsultation_CurrentPatient_ClearsRoom`

- [ ] `tests/WaitingRoom.Domain.Tests/ValueObjects/PatientIdentityTests.cs`:
  - [ ] `TestCreate_ValidCedula_Succeeds`
  - [ ] `TestCreate_TooShort_ThrowsException`
  - [ ] `TestCreate_TooLong_ThrowsException`
  - [ ] `TestCreate_Empty_ThrowsException`

- [ ] `tests/WaitingRoom.Domain.Tests/ValueObjects/PaymentAmountTests.cs`:
  - [ ] `TestCreate_ZeroOrNegative_ThrowsException`
  - [ ] `TestCreate_ValidAmount_Succeeds`
  - [ ] `TestCreate_ExceedsMax_ThrowsException`

#### Integration Tests Application Layer
- [ ] `tests/WaitingRoom.Application.Tests/CommandHandlers/RegisterPatientCommandHandlerTests.cs`:
  - [ ] `TestHandle_ValidInput_CreatesPatientAndPublishesEvent`
  - [ ] `TestHandle_DuplicateIdentity_ReturnsExistingPatientIdempotent`
  - [ ] `TestHandle_InvalidIdentity_ThrowsValidationException`

- [ ] `tests/WaitingRoom.Application.Tests/CommandHandlers/AssignConsultingRoomCommandHandlerTests.cs`:
  - [ ] `TestHandle_ValidAssignment_SucceedsAndPublishesEventt`
  - [ ] `TestHandle_PatientNotFound_ThrowsNotFoundException`
  - [ ] `TestHandle_RoomNotActive_ThrowsDomainException`

- [ ] `tests/WaitingRoom.Application.Tests/QueryHandlers/GetWaitingPatientsQueryHandlerTests.cs`:
  - [ ] `TestHandle_MultipleWaitingPatients_ReturnsSortedByWaitTime`
  - [ ] `TestHandle_EmptyQueue_ReturnsEmptyList`

#### Integration Tests API
- [ ] `tests/WaitingRoom.API.Tests/IntegrationTests/PatientRegistrationEndpointTests.cs`:
  - [ ] `TestPostRegister_ValidInput_Returns201WithPatientId`
  - [ ] `TestPostRegister_InvalidIdentity_Returns400`
  - [ ] `TestPostRegister_Idempotent_Returns200OnDuplicate`

- [ ] `tests/WaitingRoom.API.Tests/IntegrationTests/PatientAssignmentEndpointTests.cs`:
  - [ ] `TestPostAssignRoom_ValidInput_Returns200`
  - [ ] `TestPostAssignRoom_PatientNotFound_Returns404`
  - [ ] `TestPostAssignRoom_RoomInactive_Returns400`
  - [ ] `TestPostAssignRoom_Unauthorized_Returns401`

- [ ] `tests/WaitingRoom.API.Tests/IntegrationTests/ConsultationEndpointTests.cs`:
  - [ ] `TestPostStartConsultation_ValidInput_Returns200`
  - [ ] `TestPostFinishConsultation_ValidInput_Returns200AndFreesRoom`

- [ ] `tests/WaitingRoom.API.Tests/IntegrationTests/PaymentEndpointTests.cs`:
  - [ ] `TestPostArriveCashier_ValidInput_Returns200WithPaymentAmount`
  - [ ] `TestPostValidatePayment_ValidInput_Returns200`

#### Event Sourcing & Projection Tests
- [ ] `tests/WaitingRoom.Infrastructure.Tests/EventStore/EventStoreTests.cs`:
  - [ ] `TestAppend_ValidEvent_PersistsSuccessfully`
  - [ ] `TestAppend_DuplicateIdempotencyKey_IgnoresDuplicate`
  - [ ] `TestGetEventsByAggregateId_ReturnsChronologicalEvents`

- [ ] `tests/WaitingRoom.Infrastructure.Tests/Projections/PatientStateProjectionTests.cs`:
  - [ ] `TestHandle_PatientRegistered_InsertsIntoView`
  - [ ] `TestHandle_StateTransition_UpdatesCurrentState`
  - [ ] `TestReplay_FromCheckpoint_ReconstructsCorrectly`

---

### Tests Frontend

#### Unit Tests Components
- [ ] `test/components/PatientRegistrationForm.test.tsx`:
  - [ ] Renders form with all fields
  - [ ] Validates on submit
  - [ ] Calls API on valid submission
  - [ ] Shows error message on API failure
  - [ ] Handles idempotencyKey

- [ ] `test/components/WaitingPatientsList.test.tsx`:
  - [ ] Renders list of patients
  - [ ] Orders by waitingTime
  - [ ] Shows assign button per patient
  - [ ] Opens room selector on assign click
  - [ ] Calls API on room selection

- [ ] `test/components/PaymentQueue.test.tsx`:
  - [ ] Renders queue of cashier patients
  - [ ] Shows validate button per patient
  - [ ] Calls API on validation
  - [ ] Updates list after validation

#### Hook Tests
- [ ] `test/hooks/useAtencion.test.ts`:
  - [ ] Returns waiting patients and rooms on mount
  - [ ] `assignRoom` calls API with correct params
  - [ ] `startConsultation` calls API
  - [ ] `finishConsultation` calls API

- [ ] `test/hooks/usePatientsSubscription.test.ts`:
  - [ ] Connects to SignalR on mount
  - [ ] Updates state on SignalR event
  - [ ] Falls back to polling if SignalR fails
  - [ ] Cleans up on unmount

#### Integration Tests (E2E with Cypress)
- [ ] `test/e2e/patient-registration.cy.ts`:
  - [ ] User navigates to /register
  - [ ] Fills form and submits
  - [ ] Sees success message
  - [ ] Can proceed to waiting list

- [ ] `test/e2e/consultation-flow.cy.ts`:
  - [ ] Receptionist sees waiting patients
  - [ ] Receptionist assigns to room
  - [ ] Doctor sees patient assigned
  - [ ] Doctor starts and finishes consultation
  - [ ] Patient sees state updated to FINISHED_CONSULTATION

- [ ] `test/e2e/payment-flow.cy.ts`:
  - [ ] Patient arrives at cashier
  - [ ] Cashier sees in queue
  - [ ] Cashier validates payment
  - [ ] Patient completed

---

### QA & Documentation

#### QA Strategy
- [ ] ✅ Spec DRAFT completada
- [ ] Generar Gherkin scenarios desde HUs (via /gherkin-case-generator skill)
- [ ] Ejecutar risk analysis (via /risk-identifier skill)
- [ ] Identificar smoke tests críticos
- [ ] Ejecutar test plan paralelo Backend + Frontend

#### Documentation
- [ ] Crear ADR (Architecture Decision Record) en `.github/decisions/`:
  - [ ] `0001-event-sourcing-adoption.md`
  - [ ] `0002-patient-centric-over-queue-centric.md`
  - [ ] `0003-cqrs-pattern-implementation.md`

- [ ] Actualizar `README.md` principal con:
  - [ ] Nueva arquitectura (diagrama antes/después)
  - [ ] Glossary de términos (Patient, ConsultingRoom, Event Store, Projection)
  - [ ] Links a `.github/specs/rlapp-patient-centric-refactor.spec.md`

- [ ] Createar `MIGRATION_GUIDE.md`:
  - [ ] Pasos para migrar datos desde sistema antiguo (WaitingQueue → Patient)
  - [ ] Coexistencia temporal
  - [ ] Rollout plan (fases)

- [ ] Actualizar `apps/backend/README.md`:
  - [ ] Nuevos agregados (Patient, ConsultingRoom)
  - [ ] Eventos emitidos y proyecciones
  - [ ] Wiring del DI en Program.cs
  - [ ] Ejemplos de uso de handlers

- [ ] Actualizar `apps/frontend/README.md`:
  - [ ] Nuevas páginas (/register, /atencion, /payment, /stations, /monitor)
  - [ ] Nuevos hooks (useAtencion, usePayment, etc.)
  - [ ] Ejemplos de componentes

- [ ] Crear `PERFORMANCE_ANALYSIS.md` (via /performance-analyzer skill):
  - [ ] SLA objetivos: latencia endpoints, throughput consultorios/hora
  - [ ] Test plan (Load, Stress, Spike)
  - [ ] Umbrales de alerta

---

## 4. Checklist de Aprobación

Para transicionar de `DRAFT` a `APPROVED`, validar:

- [ ] Spec revisada por Senior Architect
- [ ] Spec revisada por Backend Lead
- [ ] Spec revisada por Frontend Lead
- [ ] Spec revisada por QA Lead
- [ ] No conflictos con requerimientos de negocio
- [ ] Alcance claro y sin ambigüedades
- [ ] Timeline estimado factible
- [ ] Dependencias y bloqueadores identificados
- [ ] Riesgos documentados en risk analysis

---

**FIN DE SPEC**

> Fecha de generación: 2026-03-19  
> Status: DRAFT — Requiere aprobación antes de ejecutar  
> Autor: spec-generator (ASDD Workflow)
