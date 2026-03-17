---
id: SPEC-001
status: DRAFT
feature: rlapp-queue-flow-refactor
created: 2026-03-16
updated: 2026-03-16
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: RLAPP Queue Flow & UX Refactor

> **Estado:** `DRAFT` → será aprobado con `status: APPROVED` antes de iniciar implementación.
> **Objetivo:** Corregir flujos de cola, clarificar UX y eliminar deuda técnica en 5 refactores incrementales.

---

## 1. REQUERIMIENTOS

### Descripción Ejecutiva

El análisis de cobertura backend/frontend del sistema RLAPP identificó 6 problemas críticos que impiden que los flujos de caja (`HU-002`) y atención médica (`HU-003`) funcionen correctamente. Este refactor corrige la lógica de negocio (bugs de validación de estado), mejora UX (mostrar turnos, búsqueda de pacientes) y moderniza la arquitectura (eliminar código legacy, paralelizar consultorios). El refactor se ejecuta en 5 fases incrementales, priorizando bugs críticos antes de mejoras de UX.

### Requerimiento de Negocio

**Problema 1: `ValidatePayment()` rechaza flujo legítimo de caja**
- **Síntoma:** Si un cajero marca el pago como pendiente (estado `PagoPendiente`), no puede validar el pago después. La validación solo acepta estado `EnTaquilla`.
- **Impacto:** El paciente queda en limbo indefinidamente. **El flujo de caja está roto.** 
- **Ejemplos de casos bloqueados:**
  - Pacientemente llega a caja → se marca como pendiente (necesita traer comprobante) → cuando regresa con comprobante por validación → API rechaza porque estado es `PagoPendiente`, no `EnTaquilla`.

**Problema 2: Números de turno no se muestran a operadores**
- **Síntoma:** Las pantallas de caja y médico muestran nombre y cédula del paciente, pero NO el número de turno (ej. "Turno #5").
- **Impacto:** Operadores no pueden referirse a pacientes por turno; dificulta comunicación, traceabilidad e identificación rápida.
- **El display público SÍ muestra turnos**, pero operadores en backend NO.

**Problema 3: Falta búsqueda de pacientes**
- **Síntoma:** No hay forma de buscar paciente por número de turno o documento de identidad en ninguna pantalla.
- **Impacto:** Si un paciente pregunta "¿dónde estoy?", el operador debe escanear visual la lista. Sin búsqueda, esto es lento y error-prone.

**Problema 4: Solo 1 médico puede atender simultáneamente (debería ser 4)**
- **Síntoma:** El backend define 4 consultorios (CONS-01 a CONS-04) pero el modelo de dominio solo permite `CurrentAttentionPatientId` (una sola variable). Esto permite solo 1 doctor en atención a la vez.
- **Impacto:** El sistema no soporta paralelismo de consultorios. Si hay 2+ doctores, uno está ocioso esperando a que el primero termine.
- **Root cause:** Diseño de agregado asume 1 cola, 1 médico. Necesita cambiar a diccionario por consultorio.

**Problema 5: Consultorios no cargan estado inicial del backend**
- **Síntoma:** La página `/consulting-rooms/` siempre muestra todas las salas como inactivas al cargar, sin consultar el estado real del servidor.
- **Impacto:** El admin no ve el estado actual de las salas; puede intentar activar una que ya está activa (incoherencia).

**Problema 6: Deuda técnica y código muerto**
- **Síntoma:** Existen 4 estados de dominio nunca usados (`Registrado`, `PagoValidado`, `AusenteTaquilla`, `AusenteConsulta`), dos sistemas real-time coexisten sin coordinación (SignalR + Socket.IO legacy), y un componente de demo UI visible en producción.
- **Impacto:** Mantenimiento confuso, incertidumbre sobre intención del código, posibles bugs silenciosos.

### Historias de Usuario

#### HU-R1: Corregir validación de pago pendiente

```
Como:        Cajero o Administrador
Quiero:      Poder validar el pago de un paciente que previamente marcué como pendiente
Para:        Finalizar el proceso de caja incluso si el paciente regresa después de una ausencia inicial

Prioridad:   CRÍTICA
Estimación:  S (Small)
Dependencias: Ninguna
Capa:        Backend (dominio)
```

**Criterios de Aceptación — HU-R1**

```gherkin
CRITERIO-R1.1: Validar pago desde estado EnTaquilla (flujo original)
  Dado que:   el paciente está en estado EnTaquilla (recién llamado a caja)
  Cuando:     el cajero ejecuta ValidatePayment con referencia válida
  Entonces:   el paciente transiciona a EnEsperaConsulta y se emite PatientPaymentValidated

CRITERIO-R1.2: Validar pago desde estado PagoPendiente (flujo corregido)
  Dado que:   el paciente está en estado PagoPendiente (pendiente de comprobante)
  Cuando:     el cajero ejecuta ValidatePayment con referencia válida
  Entonces:   el paciente transiciona a EnEsperaConsulta y se emite PatientPaymentValidated

CRITERIO-R1.3: Marcar pendiente, luego validar (flujo completo)
  Dado que:   el paciente fue llamado a caja (EnTaquilla)
  Cuando:     cajero marca pendiente → paciente regresa → cajero valida pago
  Entonces:   el paciente completa caja y avanza a EnEsperaConsulta sin errores
```

#### HU-R2: Mostrar números de turno en pantallas operativas

```
Como:        Cajero, Médico o Administrador
Quiero:      Ver el número de turno (Turno #N) junto a cada paciente en las columnas de caja y médico
Para:        Identificar rápidamente al paciente y comunicarme por turno en lugar de por nombre

Prioridad:   ALTA
Estimación:  M (Medium)
Dependencias: HU-R1 (para consistencia, aunque es independiente en la mayoría de casos)
Capa:        Frontend + Backend (ya está en API, solo falta mostrar)
```

**Criterios de Aceptación — HU-R2**

```gherkin
CRITERIO-R2.1: Mostrar turno en lista de caja
  Dado que:   hay pacientes en la lista de espera de caja en /cashier
  Cuando:     cargo la página o se actualiza la proyección
  Entonces:   cada paciente muestra "Turno #5" junto a su nombre y prioridad

CRITERIO-R2.2: Mostrar turno en pantalla de médico
  Dado que:   hay pacientes en la lista de espera de consulta en /medical
  Cuando:     cargo la página o se actualiza la proyección
  Entonces:   cada paciente muestra "Turno #7" junto a su nombre y prioridad

CRITERIO-R2.3: Mostrar turno en tarjeta de paciente activo
  Dado que:   un paciente es llamado a caja o reclamado para consulta
  Cuando:     se actualiza la pantalla o recibo un evento SignalR
  Entonces:   la tarjeta del paciente activo muestra "Turno #N" prominentemente
```

#### HU-R3: Permitir búsqueda de paciente por turno o documento

```
Como:        Cajero, Médico, Recepcionista o Paciente
Quiero:      Buscar un paciente por su número de turno o número de documento
Para:        Encontrar rápidamente dónde está el paciente en la cola sin escanear visualmente

Prioridad:   ALTA
Estimación:  M (Medium)
Dependencias: HU-R2 (números de turno deben estar visibles), HU-R1 (debe funcionar el flujo)
Capa:        Frontend (aplicación) + Backend (nueva query si no existe)
```

**Criterios de Aceptación — HU-R3**

```gherkin
CRITERIO-R3.1: Buscar por número de turno en recepción
  Dado que:   soy recepcionista en /reception viendo la lista de cola
  Cuando:     ingreso "5" en un campo de búsqueda
  Entonces:   la lista se filtra para mostrar solo "Turno #5" si existe

CRITERIO-R3.2: Buscar por número de documento
  Dado que:   soy cajero en /cashier
  Cuando:     ingreso "1234567890" (número de documento) en el campo de búsqueda
  Entonces:   la lista se filtra para mostrar el paciente (si está en la cola) con ese documento

CRITERIO-R3.3: Búsqueda sin resultados
  Dado que:   soy operario buscando un paciente
  Cuando:     ingreso un número que no existe en la cola
  Entonces:   veo el mensaje "No se encontraron resultados" y la lista se vacía

CRITERIO-R3.4: Búsqueda es insensible a mayúsculas
  Dado que:   soy operario buscando por documento
  Cuando:     ingreso "ABC-123" o "abc-123"
  Entonces:   ambas búsquedas retornan el mismo resultado
```

#### HU-R4: Paralelizar atención médica en múltiples consultorios

```
Como:        Doctor o Administrador
Quiero:      Que 4 doctores puedan atender pacientes simultáneamente en sus respectivos consultorios (CONS-01, CONS-02, CONS-03, CONS-04)
Para:        Maximizar la capacidad de atención y reducir tiempos de espera

Prioridad:   ALTA
Estimación:  L (Large)
Dependencias: HU-R1, HU-R2 (para claridad durante testing)
Capa:        Backend (dominio) + Frontend (minimal change)
```

**Criterios de Aceptación — HU-R4**

```gherkin
CRITERIO-R4.1: Doctor A atiende en CONS-01, Doctor B en CONS-02 simultáneamente
  Dado que:   hay 2 pacientes en espera de consulta
  Cuando:     Doctor A reclama siguiente paciente en CONS-01 Y Doctor B reclama siguiente en CONS-02 (paralelo)
  Entonces:   ambos reclamos son exitosos; cada paciente está en su consultorio sin conflicto

CRITERIO-R4.2: No se puede tener 2 pacientes en el mismo consultorio
  Dado que:   Doctor A tiene un paciente activo en CONS-01 (estado EnConsulta)
  Cuando:     otro operario intenta reclamar otro paciente también para CONS-01
  Entonces:   la operación es rechazada con HTTP 409 indicando "Consultorio ocupado"

CRITERIO-R4.3: Completar atención libera solo ese consultorio
  Dado que:   Doctor A completa la atención en CONS-01 Y Doctor B sigue atendiendo en CONS-02
  Cuando:     Doctor A cierra la sesión
  Entonces:   CONS-01 queda libre para un nuevo paciente; CONS-02 sigue ocupado con el paciente actual
```

#### HU-R5: Cargar estado inicial de consultorios desde backend

```
Como:        Administrador
Quiero:      Que la página /consulting-rooms/ cargue el estado real (activo/inactivo) de cada consultorio desde el servidor
Para:        Ver correctamente qué consultorios ya están activos sin disparar acciones duplicadas

Prioridad:   MEDIA
Estimación:  S (Small)
Dependencias: HU-R4 (cambios en el modelo de consultorios)
Capa:        Frontend + Backend (query)
```

**Criterios de Aceptación — HU-R5**

```gherkin
CRITERIO-R5.1: Estado inicial se consulta al backend
  Dado que:   cargo la página /consulting-rooms/
  Cuando:     la página realiza su efecto inicial
  Entonces:   ejecuta GET /api/v1/waiting-room/QUEUE-01/consulting-rooms (o endpoint similar) para obtener estado

CRITERIO-R5.2: Se muestran correctamente los estados
  Dado que:   CONS-01 está activo en el backend, CONS-02 inactivo
  Cuando:     la página carga y obtiene respuesta del servidor
  Entonces:   CONS-01 muestra toggle en posición "ON", CONS-02 en "OFF"

CRITERIO-R5.3: Toggle refleja cambio inmediato en UI
  Dado que:   veo CONS-01 inactivo
  Cuando:     hago clic en el toggle de CONS-01
  Entonces:   el toggle se mueve a "ON" inmediatamente, el estado local se actualiza, y se envía POST /api/.../activate
```

#### HU-R6: Limpiar código legacy y deuda técnica

```
Como:        Desarrollador o Maintainer
Quiero:      Eliminar estados muertos, código duplicado y sistemas real-time no usados
Para:        Reducir complejidad y evitar bugs causados por código ambiguo

Prioridad:   BAJA
Estimación:  S–M (Small to Medium)
Dependencias: Ninguna (es cleanup)
Capa:        Frontend + Backend (varios módulos)
```

**Criterios de Aceptación — HU-R6**

```gherkin
CRITERIO-R6.1: Eliminar 4 estados no usados del dominio
  Dado que:   existen constantes Registrado, PagoValidado, AusenteTaquilla, AusenteConsulta nunca asignadas
  Cuando:     audito el código de dominio en WaitingQueue.cs
  Entonces:   esas 4 constantes están removidas y no hay transiciones que las referencien

CRITERIO-R6.2: Consolidar sistema real-time único
  Dado que:   coexisten useWaitingRoom (SignalR) y useAppointmentsWebSocket (Socket.IO legacy)
  Cuando:     reviso los hooks del frontend
  Entonces:   useAppointmentsWebSocket está marcado como @deprecated o removido; todo usa useWaitingRoom

CRITERIO-R6.3: Remover componente WaitingRoomDemo de producción
  Dado que:   hay un componente <WaitingRoomDemo> visible en /dashboard
  Cuando:     reviso dashboard/page.tsx
  Entonces:   ese componente está removido o gate'ado detrás de NEXT_PUBLIC_DEMO=true
```

### Reglas de Negocio

1. **Transiciones de estado estrictas:** Un paciente solo puede transicionar entre estados permitidos. No hay atajos.
2. **Un paciente por estación:** Solo 1 paciente puede estar activo a la vez en la estación de caja. Pero **múltiples pacientes en consultorios simultáneamente** (1 por consultorio).
3. **Reintentos límitados:** Caja permite 2 ausencias + 3 intentos de pago pendiente. Consulta permite 1 ausencia. Tras exceder, cancelación.
4. **Turnos automáticos:** El backend asigna turnos incrementales. Usuario no elige el turno.
5. **Prioridad ordenada:** Pacientes se seleccionan por prioridad descendente (Urgent > High > Medium > Low) y hora de check-in ascendente (FIFO interno).
6. **Consultorios independientes:** Cada consultorio es una "pista" independiente. Un doctor ocupa 1 consultorio; otros pueden usar los demás.
7. **Búsqueda sin paginación inicial:** La búsqueda es un filtro client-side sobre la lista. Si la lista crece, considerar paginación en futuro.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas — Backend

| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `WaitingQueue` (Aggreg. Root) | Event Store (`events` tabla) | Modificar validación en `ValidatePayment()` + cambiar `CurrentAttentionPatientId` a diccionario | Agregate que maneja la máquina de estados |
| `PatientInQueueDto` | Proyección → API | Ya incluye `TurnNumber`, solo necesita mostrarse en frontend | DTO con turnNumber (ya existe en backend) |
| `consulting_rooms` (config) | Nueva tabla (o usar eventos) | Persistir estado activo/inactivo de 4 consultorios | Tabla de configuración de salas |

#### Cambios en el diagrama de estados del dominio

**Antes (HU-R1 bug):**
```
EnTaquilla → ValidatePayment() → EnEsperaConsulta  [ERROR: no acepta PagoPendiente]
PagoPendiente → [sin transición de validación]     [DEAD END]
```

**Después (HU-R1 fix):**
```
EnTaquilla → ValidatePayment() → EnEsperaConsulta  ✓
PagoPendiente → ValidatePayment() → EnEsperaConsulta  ✓ (nueva ruta)
```

**Antes (HU-R4):**
```
CurrentAttentionPatientId: string?  // Solo 1 paciente en atención en toda la cola
```

**Después (HU-R4):**
```
Dictionary<string, string> ActiveAttentionsByRoom  // {consultingRoomId → patientId}
// Permite 4 pacientes simultáneamente (1 por room)
```

#### Campos del modelo — TurnNumber (ya existe)

| Campo | Tipo | Donde se genera | Descripción |
|-------|------|-----------------|-------------|
| `turnNumber` | int (incrementado) | Backend en `CheckInPatient()` | Número único asignado al paciente cuando se registra; nunca cambia |
| `_nextTurnNumber` | int (privado en WaitingQueue) | Event Source reconstruye desde eventos | Contador para generar próximo turno |

### Cambios en Event Store

**Eventos sin cambios** (por compatibilidad):
- `PatientCheckedIn` — ya incluye `TurnNumber` (agregado en refactor anterior)

**Eventos modificados**:
- `PatientPaymentValidated` — sin cambios funcionales, pero ahora acepta venir de `PagoPendiente`

**Eventos nuevos** (HU-R4):
- `ConsultingRoomStateChanged` — registra cuando un consultorio se activa/desactiva
- Alternativa: reutilizar `ConsultingRoomActivated` / `ConsultingRoomDeactivated` si ya existen

### API Endpoints — Nuevos o Modificados

#### Backend: GET /api/v1/waiting-room/{queueId}/consulting-rooms (HU-R5)

- **Descripción:** Obtiene estado de los 4 consultorios (HU-R5)
- **Auth requerida:** No
- **Query params:** `queueId` (requerido)
- **Response 200:**
  ```json
  {
    "consultingRooms": [
      { "consultingRoomId": "CONS-01", "isActive": true, "lastUpdated": "2026-03-16T10:00:00Z" },
      { "consultingRoomId": "CONS-02", "isActive": false, "lastUpdated": "2026-03-16T09:30:00Z" },
      { "consultingRoomId": "CONS-03", "isActive": true, "lastUpdated": "2026-03-16T10:00:00Z" },
      { "consultingRoomId": "CONS-04", "isActive": false, "lastUpdated": "2026-03-16T09:50:00Z" }
    ],
    "projectedAt": "2026-03-16T10:05:00Z"
  }
  ```
- **Response 404:** Queue no encontrada

#### Backend: POST /api/v1/waiting-room/{queueId}/search (HU-R3 — opcional backend)

> Nota: La búsqueda puede ser 100% client-side (filtro de array local). Solo se proporciona este endpoint si se quiere server-side search para escalabilidad futura.

- **Descripción:** Busca un paciente por turno o documento
- **Auth requerida:** No
- **Request Query:**
  ```
  ?query=5&searchBy=turnNumber
  OR
  ?query=1234567890&searchBy=documentId
  ```
- **Response 200:**
  ```json
  {
    "result": {
      "patientId": "DOC-1234567890",
      "patientName": "Juan Pérez",
      "turnNumber": 5,
      "priority": "High",
      "status": "EnEsperaTaquilla",
      "checkInTime": "2026-03-16T10:00:00Z",
      "estimatedWaitTime": "12 minutes"
    }
  }
  ```
- **Response 404:** Paciente no encontrado

### Diseño Frontend

#### Componentes afectados / nuevos

| Componente | Ubicación | HU | Cambios |
|-----------|-----------|-----|---------|
| `CashierPatientList` | `/cashier/page.tsx` | R2 | Agregar columna `turnNumber` |
| `MedicalPatientList` | `/medical/page.tsx` | R2 | Agregar columna `turnNumber` + soporte para consultorio activo |
| `PatientSearchInput` | nuevamente creado | R3 | Nuevo componente reutilizable de búsqueda |
| `ConsultingRoomsGrid` | `/consulting-rooms/page.tsx` | R5 | Cargar estado inicial desde backend, no asumir todos inactivos |
| `ActivePatientCard` | `/cashier`, `/medical`, `/display` | R2, R4 | Mostrar turno prominentemente |

#### Nuevos hooks

| Hook | HU | Propósito |
|------|-----|----------|
| `usePatientSearch(queueId)` | R3 | Filtra la lista de pacientes con búsqueda local o backend |
| `useConsultingRoomStatus(queueId)` | R5 | Consulta estado de salas desde backend en mount |
| `useMultipleActiveAttentions(queueId)` | R4 | Maneja estado de atención en múltiples salas (en lugar de single) |

#### Páginas modificadas

| Página | Archivo | HU | Cambios |
|--------|---------|-----|---------|
| `/reception` | `reception/page.tsx` | R3 | Agregar búsqueda de paciente en la lista izquierda |
| `/cashier` | `cashier/page.tsx` | R2, R3 | Mostrar `turnNumber` en lista + agregar búsqueda campo |
| `/medical` | `medical/page.tsx` | R2, R3, R4 | Mostrar `turnNumber`, buscar, soportar múltiples salas activas |
| `/consulting-rooms` | `consulting-rooms/page.tsx` | R5 | Cargar estado inicial `useConsultingRoomStatus()` |
| `/display/[queueId]` | `display/[queueId]/page.tsx` | (sin cambios) | Ya muestra turnos correctamente |

### Eliminaciones / Deprecaciones (HU-R6)

#### Backend

- **Archivo:** `WaitingRoom.Domain/Invariants/WaitingQueueInvariants.cs`
  - **Eliminar constantes:** `RegisteredState`, `PaymentValidatedState`, `CashierAbsentState`, `ConsultationAbsentState`
  - **Justificación:** Nunca usadas; causan confusión en el modelo de estados

#### Frontend

- **Archivo:** `hooks/useAppointmentsWebSocket.ts`
  - **Estado:** `@deprecated` o eliminar
  - **Justificación:** Reemplazado por `useWaitingRoom` basado en SignalR

- **Archivo:** `components/WaitingRoomDemo.tsx` (o donde esté)
  - **Estado:** Remover de `/dashboard/page.tsx` o gate'ar con flag de env
  - **Justificación:** Código de desarrollo, no debe estar en producción

- **Archivo:** `hooks/useAppointmentRegistration.ts`
  - **Estado:** `@deprecated` — hay path moderno con `useCheckIn`
  - **Justificación:** Deuda técnica de DI pattern antiguo

---

## 3. LISTA DE TAREAS

### Fase 1: Bug crítico `ValidatePayment()` (HU-R1)

- [ ] **Análisis:**
  - [ ] Leer `WaitingQueue.ValidatePayment()` en el dominio
  - [ ] Verificar invariante `ValidateStateTransition()` que rechaza `PagoPendiente`
  - [ ] Caso de test: paciente en `PagoPendiente` intenta validar pago → debe fallar hoy

- [ ] **Diseño:**
  - [ ] Confirmar que `ValidatePayment()` debe aceptar estado `EnTaquilla` O `PagoPendiente`
  - [ ] No hay cambios en eventos ni proyecciones, solo validación menos estricta

- [ ] **Implementación Backend:**
  - [ ] Modificar `ValidatePayment()` en `WaitingQueue.cs` para aceptar ambos estados
  - [ ] Cambiar validación de: `ValidateStateTransition(currentState, CashierCalledState, ...)` a condicional `if (currentState != CashierCalledState && currentState != PaymentPendingState) throw ...`
  - [ ] Mantener la lógica de limpieza de contadores igual

- [ ] **Testing:**
  - [ ] Test: registrar paciente → llamar a caja → marcar pendiente → validar pago → debe ir a `EnEsperaConsulta` ✓
  - [ ] Test: registrar paciente → llamar a caja → validar pago (sin pendiente) → debe ir a `EnEsperaConsulta` ✓
  - [ ] Test de regresión: otros flujos de caja sin cambios

- [ ] **Deploy:**
  - [ ] Commit con mensaje: `fix: allow ValidatePayment from PagoPendiente state (HU-R1)`
  - [ ] Nota: no hay cambios de API ni frontend, solo corrección de lógica

### Fase 2: Mostrar turnos en pantallas operativas (HU-R2)

- [ ] **Análisis Frontend:**
  - [ ] Verificar que `PatientInQueueDto` en `types.ts` ya tiene campo `turnNumber`
  - [ ] Revisar `useWaitingRoom` hook — confirma que trae `turnNumber` en cada paciente
  - [ ] Revisar `useQueueAsAppointments` hook — verificar que `Appointment` type pierde `turnNumber` (bug confirmado)

- [ ] **Diseño:**
  - [ ] `Appointment` type: agregar campo `turnNumber?: number` para no perder el dato en transformación
  - [ ] Componentes de lista (`CashierPatientList`, `MedicalPatientList`): agregar render de `turnNumber`
  - [ ] Active patient card: mostrar `Turno #{turnNumber}` prominentemente

- [ ] **Implementación Frontend:**
  - [ ] Actualizar `Appointment` interface en `domain/models/Appointment.ts`
  - [ ] Actualizar `useQueueAsAppointments` para no perder `turnNumber`
  - [ ] Actualizar componente de lista de caja: mostrar `Turno #${p.turnNumber}`
  - [ ] Actualizar componente de lista médica: mostrar `Turno #${p.turnNumber}`
  - [ ] Actualizar tarjeta de paciente activo en ambas pantallas
  - [ ] Testear visualmente en `/cashier` y `/medical`

- [ ] **Testing:**
  - [ ] Navegación a `/cashier`, verificar que se muestra "Turno #1", "Turno #2", etc. ✓
  - [ ] Navegación a `/medical`, verificar que se muestra "Turno #5" para paciente activo ✓
  - [ ] Llamar siguiente paciente en caja → turno se actualiza inmediatamente

- [ ] **Deploy:**
  - [ ] Commit: `feat: display turn numbers in cashier and medical views (HU-R2)`

### Fase 3: Búsqueda de pacientes por turno/documento (HU-R3)

- [ ] **Análisis:**
  - [ ] Implementar búsqueda como **filtro client-side** (100% local sin backend)
  - [ ] La lista ya tiene toda la información (turnNumber, patientId, patientName)
  - [ ] Búsqueda será en `/reception`, `/cashier`, `/medical` (3 páginas)

- [ ] **Diseño:**
  - [ ] Nuevo componente `PatientSearchInput` reutilizable
  - [ ] Props: `value`, `onChange`, `placeholder`, `searchBy` (turnNumber | documentId)
  - [ ] Retorna booleano de matching: `isMatch(patient, query, searchBy)`

- [ ] **Implementación Frontend:**
  - [ ] Crear componente `PatientSearchInput.tsx`
  - [ ] En `reception/page.tsx`: agregar input encima de la lista de cola (izquierda)
  - [ ] En `cashier/page.tsx`: agregar input encima de la lista de pacientes
  - [ ] En `medical/page.tsx`: agregar input encima de la lista de pacientes
  - [ ] `useState(searchQuery)` local en cada página; filtrar lista en tiempo real
  - [ ] Display de resultados: "1 de 10 resultados" si hay búsqueda activa

- [ ] **Testing:**
  - [ ] Búsqueda por turno "#5" en `/cashier` → solo muestra paciente con turnNumber=5
  - [ ] Búsqueda por documento "1234567" en `/reception` → filtra por patientId/nombre
  - [ ] Borrar búsqueda → muestra lista completa de nuevo
  - [ ] Búsqueda sin resultados → "No se encontraron resultados"

- [ ] **Deploy:**
  - [ ] Commit: `feat: add patient search by turn number and document ID (HU-R3)`

### Fase 4: Atención médica paralela en múltiples consultorios (HU-R4)

> ⚠️ **Fase más compleja.** Requiere cambio en el núcleo del dominio.

- [ ] **Análisis Backend:**
  - [ ] Leer `WaitingQueue.cs` — ubicar `CurrentAttentionPatientId` (string?)
  - [ ] Leer métodos: `ClaimNextPatient()`, `CallPatient()`, `CompleteAttention()`, `MarkAbsentAtConsultation()`
  - [ ] Leer evento `PatientClaimedForAttention` — incluye `consultingRoomId` o `stationId`?
  - [ ] Plan: cambiar de single ID a `Dictionary<string, string> ActiveAttentionsByRoom`

- [ ] **Diseño Backend:**
  - [ ] Cambio de état:
    ```csharp
    // Antes:
    private string? CurrentAttentionPatientId;
    
    // Después:
    private Dictionary<string, string> ActiveAttentionsByConsultingRoom = new(); // room → patientId
    ```
  - [ ] Método `ValidateNoActiveAttention()` ahora acepta `consultingRoomId` como parámetro:
    ```csharp
    if (ActiveAttentionsByConsultingRoom.ContainsKey(consultingRoomId))
        throw InvalidTransition("Room is occupied");
    ```
  - [ ] Métodos `ClaimNextPatient()`, `CallPatient()`, `CompleteAttention()` ahora son scoped a consultorio
  - [ ] Invariante nueva: 1 paciente por consultorio (pero permite 4 simultáneamente)

- [ ] **Implementación Backend:**
  - [ ] Backup de `WaitingQueue.cs` antes de cambios
  - [ ] Cambiar `CurrentAttentionPatientId` a `ActiveAttentionsByConsultingRoom`
  - [ ] Refactorizar `ClaimNextPatient(string consultingRoomId)`:
    - [ ] Rechazar si `ActiveAttentionsByConsultingRoom.ContainsKey(consultingRoomId)`
    - [ ] Asignar `ActiveAttentionsByConsultingRoom[consultingRoomId] = patientId`
    - [ ] Emitir evento con `consultingRoomId`
  - [ ] Refactorizar `CallPatient()`, `CompleteAttention()`, `MarkAbsentAtConsultation()` — todos ahora aceptan `consultingRoomId`
  - [ ] Refactorizar `_consultationAbsenceRetries` y `_cashierAbsenceRetries` — ahora son `Dictionary<string, int>` o similares si deben ser por consultorio (o por paciente global)
      - **Decisión:** Los contadores son POR PACIENTE, no por consultorio. Mantener `Dictionary<string, int> _consultationAbsenceRetries` donde key=patientId.
  - [ ] Validar invariante: no quebrar cambios ya implementados en eventos anteriores

- [ ] **Implementación Frontend:**
  - [ ] En `medical/page.tsx`: cambiar lógica de station/consultingRoomId
  - [ ] Cuando doctor clica "Llamar siguiente", se muestra qué consultorio está en uso
  - [ ] Almacenar mapping local: `lastClaimedRoomId` para mantener sesión del doctor
  - [ ] El form de "Iniciar consulta" y "Finalizar consulta" debe enviar `consultingRoomId`

- [ ] **Adaptaciones de DTOs/Commands:**
  - [ ] `ClaimNextPatientDto`: agregar campo `consultingRoomId` (requerido)
  - [ ] `CallPatientDto`: agregar campo `consultingRoomId` (requerido)
  - [ ] `CompleteAttentionDto`: agregar campo `consultingRoomId` (requerido)
  - [ ] `MarkAbsentAtConsultationDto`: agregar campo `consultingRoomId` (requerido)

- [ ] **Testing Backend:**
  - [ ] Doctor A reclama paciente 1 en CONS-01 → exitoso
  - [ ] Doctor B reclama paciente 2 en CONS-02 simultáneamente → exitoso
  - [ ] Doctor C intenta reclamar en CONS-01 mientras Doctor A está activo → rechazado (409)
  - [ ] Doctor A completa → CONS-01 queda libre, Doctor C puede reclamar ahora
  - [ ] Doctor B sigue en CONS-02 sin interrupciones

- [ ] **Testing Frontend:**
  - [ ] Navegación a `/medical` → doctor selecciona CONS-01 o deja que se auto-asigne
  - [ ] Llama siguiente → paciente aparece asignado a esa sala
  - [ ] Iniciar consulta → paciente en estado EnConsulta
  - [ ] Finalizar consulta → paciente en estado Finalizado, sala libre
  - [ ] Otro doctor puede reclamar simultáneamente en sala diferente

- [ ] **Build & Integration Test:**
  - [ ] Compilar backend sin errores
  - [ ] Ejecutar suite de tests del dominio
  - [ ] Prueba E2E: 2 doctores atienden 2 pacientes en 2 salas en paralelo

- [ ] **Deploy:**
  - [ ] Commit: `refactor: enable parallel medical attention in multiple consulting rooms (HU-R4)`

### Fase 5: Cargar estado inicial de consultorios y limpiar legacy (HU-R5 + HU-R6)

- [ ] **HU-R5 — Cargar estado de consultorios:**
  - [ ] **Backend:** Crear proyección `ConsultingRoomStatusView` que persista estado activo/inactivo de 4 salas
    - [ ] Escucha eventos `ConsultingRoomActivated`, `ConsultingRoomDeactivated`
    - [ ] Endpoint: `GET /api/v1/waiting-room/{queueId}/consulting-rooms` (ver sección de endpoints)
  - [ ] **Frontend:** 
    - [ ] Crear hook `useConsultingRoomStatus(queueId)` que consulte el endpoint
    - [ ] `useEffect(() => { fetchRoomStatus() }, [queueId])` en mount
    - [ ] Estado local: `Dictionary<consultingRoomId, isActive>`
    - [ ] En `/consulting-rooms/page.tsx`: usar `useConsultingRoomStatus()` en lugar de asumir todos inactivos
  - [ ] **Testing:** Cargar página → debe reflejar estados reales

- [ ] **HU-R6 — Limpiar código legacy:**
  - [ ] **Backend:**
    - [ ] Eliminar 4 constantes muertas de `WaitingQueueInvariants.cs`
    - [ ] Verificar que no hay referencias a esos estados en el código
  - [ ] **Frontend:**
    - [ ] Marcar `useAppointmentsWebSocket` como `@deprecated` en comentario (o eliminar si no hay dependencias)
    - [ ] Remover `WaitingRoomDemo` de `dashboard/page.tsx` o gatearla con `NEXT_PUBLIC_DEMO=true`
    - [ ] Marcar `useAppointmentRegistration` como deprecated; documentar que se use `useCheckIn` en su lugar
  - [ ] **Cleanup:**
    - [ ] Búsqueda de referencias a código eliminado en toda la codebase
    - [ ] Verificar que no queda deuda técnica de ESLint

### Verificación y Rollout

- [ ] **Testing integrado (todas las fases):**
  - [ ] Flujo completo check-in → caja → médico con 2+ doctores en paralelo
  - [ ] Búsqueda de pacientes en recepción y caja
  - [ ] Números de turno visibles en todas las pantallas
  - [ ] Estado de consultorios cargado correctamente
  - [ ] No hay errores de consola ni warnings en el navegador

- [ ] **Build final:**
  - [ ] Backend: `dotnet test` pasa
  - [ ] Frontend: `npm test` pasa
  - [ ] Docker build sin errores
  - [ ] `docker-compose up` levanta toda la stack

- [ ] **Documentación:**
  - [ ] Actualizar `apps/backend/README.md` con diagrama de estados corregido (HU-R1, HU-R4)
  - [ ] Actualizar `apps/frontend/README.md` con cambios de componentes y hooks
  - [ ] Changelog: describir 5 fases y cómo afectan a operadores

- [ ] **Squashing de commits por fase (ANTES de merge):**
  - [ ] Fase 1 (HU-R1): 1 commit `fix: ValidatePayment...`
  - [ ] Fase 2 (HU-R2): 1 commit `feat: display turn numbers...`
  - [ ] Fase 3 (HU-R3): 1 commit `feat: add patient search...`
  - [ ] Fase 4 (HU-R4): 1 commit `refactor: enable parallel attention...`
  - [ ] Fase 5 (HU-R5 + HU-R6): 1 commit `feat: load consulting room status and cleanup legacy...`

- [ ] **Merge a main:**
  - [ ] Todas las fases testeadas ✓
  - [ ] Code review aprobado
  - [ ] Commits con mensajes convencionales
  - [ ] Linked a esta SPEC en commit messages (ej. `refactor: ... (closes SPEC-001)`)

---

## Aprobación

| Rol | Estado | Firma / Comentario |
|-----|--------|-----------------|
| Spec Generator | ✓ `DRAFT` | Listo para revisión |
| Product Owner | ⏳ Pendiente | Aprobar si los requerimientos son correctos |
| Tech Lead Backend | ⏳ Pendiente | Validar HU-R4 (cambios de arquitectura) |
| Tech Lead Frontend | ⏳ Pendiente | Validar decisiones de UX y componentes |

---

**Proximos pasos:**
1. ✅ Esta SPEC se crea en `DRAFT`
2. ⏳ Revisar, comentar y aprobar → cambiar a `status: APPROVED`
3. ⏳ Una vez aprobada, iniciar Fase 1 con `/implement-backend` + `/implement-frontend`
4. ⏳ Ejecutar fases incrementalmente, con testing y commits por cada una
5. ⏳ Finalmente, cambiar spec a `status: IMPLEMENTED`
