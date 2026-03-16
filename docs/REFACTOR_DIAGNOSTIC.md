# Diagnóstico de Refactor — RLAPP

**Fecha:** 16 de marzo de 2026
**Alcance:** Mapeo completo backend ↔ frontend, verificación contra HU refinadas, análisis de flujos y propuestas de corrección.

---

## 1. MAPA DE ENDPOINTS DEL BACKEND (26 endpoints)

### 1.1 Autenticación (1)

| Método | Ruta | Rol requerido | Descripción |
|--------|------|---------------|-------------|
| POST | `/api/auth/token` | Público | Genera JWT con UserId, UserName y Role |

### 1.2 Queries / Proyecciones (5)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/waiting-room/{queueId}/monitor` | KPIs: conteos por prioridad, tiempo promedio, utilización |
| GET | `/api/v1/waiting-room/{queueId}/queue-state` | Estado detallado de cola: lista de pacientes, capacidad |
| GET | `/api/v1/waiting-room/{queueId}/next-turn` | Paciente actualmente reclamado/llamado |
| GET | `/api/v1/waiting-room/{queueId}/recent-history` | Historial de atenciones completadas |
| POST | `/api/v1/waiting-room/{queueId}/rebuild` | Reconstruir proyecciones desde Event Store |

### 1.3 Recepción (2 — duplicados)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/waiting-room/check-in` | Receptionist, Admin | Check-in genérico |
| POST | `/api/reception/register` | Receptionist, Admin | Check-in etiquetado para recepción (mismo handler) |

### 1.4 Caja (5)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/cashier/call-next` | Cashier, Admin | Llamar siguiente paciente |
| POST | `/api/cashier/validate-payment` | Cashier, Admin | Validar pago |
| POST | `/api/cashier/mark-payment-pending` | Cashier, Admin | Marcar pago pendiente |
| POST | `/api/cashier/mark-absent` | Cashier, Admin | Marcar ausente en caja |
| POST | `/api/cashier/cancel-payment` | Cashier, Admin | Cancelar por pago |

### 1.5 Médico (6)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/medical/call-next` | Doctor, Admin | Reclamar siguiente paciente |
| POST | `/api/medical/start-consultation` | Doctor, Admin | Iniciar consulta |
| POST | `/api/medical/finish-consultation` | Doctor, Admin | Finalizar atención |
| POST | `/api/medical/mark-absent` | Doctor, Admin | Marcar ausente en consultorio |
| POST | `/api/medical/consulting-room/activate` | Doctor, Admin | Activar consultorio |
| POST | `/api/medical/consulting-room/deactivate` | Doctor, Admin | Desactivar consultorio |

### 1.6 Genéricos (duplicados de médico) (4)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/waiting-room/claim-next` | Doctor, Admin | Duplicado de `/api/medical/call-next` |
| POST | `/api/waiting-room/call-patient` | Doctor, Admin | Duplicado de `/api/medical/start-consultation` |
| POST | `/api/waiting-room/complete-attention` | Doctor, Admin | Duplicado de `/api/medical/finish-consultation` |

### 1.7 SignalR (1 hub vacío)

| Hub | Ruta | Estado |
|-----|------|--------|
| WaitingRoomHub | `/ws/waiting-room` | Sin métodos — no emite eventos al cliente |

---

## 2. MAPA DEL FRONTEND (10 rutas)

### 2.1 Rutas y propósito

| Ruta | Rol | Componente principal | Backend endpoints utilizados |
|------|-----|---------------------|------------------------------|
| `/` | Todos | RealtimeAppointments | Queries (monitor, queue-state, next-turn) |
| `/login` | Público | Login form | `/api/auth/token` |
| `/reception` | Receptionist, Admin | Formulario check-in + estado de cola | `/api/reception/register` + queries |
| `/cashier` | Cashier, Admin | Lista pacientes + acciones de caja | 5 endpoints de caja + queries |
| `/medical` | Doctor, Admin | Claim + call + complete + absent | 6 endpoints médicos + queries |
| `/dashboard` | Todos (autenticados) | Historial completados + tiempo real | Queries |
| `/consulting-rooms` | Admin | Activar/desactivar consultorios | 2 endpoints consulting-room |
| `/registration` | Admin | AppointmentRegistrationForm | Repositorio DI (no usa API REST) |
| `/waiting-room/[queueId]` | Todos (autenticados) | Dashboard multi-panel | Queries + SignalR |
| `/display/[queueId]` | Paciente/público | Pantalla TV de turnos | Queries (polling 3s) |

### 2.2 Endpoints backend NO consumidos en frontend

| Endpoint | Observación |
|----------|-------------|
| `/api/waiting-room/check-in` | Duplicado; frontend solo usa `/api/reception/register` |
| `/api/waiting-room/claim-next` | Frontend usa `/api/medical/call-next` (según hook) |
| `/api/waiting-room/call-patient` | Frontend usa `/api/medical/start-consultation` |
| `/api/waiting-room/complete-attention` | Frontend usa `/api/medical/finish-consultation` |
| `/api/v1/waiting-room/{queueId}/rebuild` | Solo para uso administrativo manual |

---

## 3. VERIFICACIÓN DE FLUJOS vs HISTORIAS DE USUARIO

### HU-001: Check-in en recepción

| Criterio refinado | Estado en backend | Estado en frontend | Veredicto |
|-------------------|-------------------|--------------------|-----------|
| CA-001.1 Campos requeridos y opcionales | ✅ DTO acepta todos los campos | ✅ Formulario tiene todos los campos | OK |
| CA-001.2 Prioridades válidas | ✅ Validación en dominio | ✅ Select con 4 opciones | OK |
| CA-001.3 Tipos de consulta | ✅ Validación en dominio | ✅ Select con opciones | OK |
| CA-001.4 Paciente duplicado → 409 | ✅ Validación por PatientId | ✅ Muestra error | OK |
| CA-001.5 Cola llena → 409 | ✅ Validación de capacidad | ✅ Muestra error | OK |
| CA-001.6 Idempotencia 24h | ✅ PostgresIdempotencyStore | ✅ Header Idempotency-Key | OK |
| CA-001.7 Estado EnEsperaTaquilla + orden | ✅ Dominio asigna estado | ⚠️ **Tras registro, redirige fuera de /reception** | FALLO |
| CA-001.8 Roles Receptionist/Admin → 403 | ✅ Filtro de rol | ✅ RouteGuard + header | OK |
| CA-001.9 Campos opcionales | ✅ Nullable en DTO | ✅ Opcionales en form | OK |
| CA-001.10 Evento en Event Store + Outbox | ✅ Persistencia completa | N/A (backend) | OK |
| CA-001.11 Fallo infra → 503 | ✅ Manejo de excepciones | ⚠️ Frontend no muestra 503 específicamente | MENOR |

### HU-002: Gestión de pago en caja

| Criterio refinado | Backend | Frontend | Veredicto |
|-------------------|---------|----------|-----------|
| CA-002.1 Llamar siguiente paciente (orden) | ✅ | ✅ callNext | OK |
| CA-002.2 Solo un paciente activo | ✅ Invariante dominio | ✅ UI refleja turno activo | OK |
| CA-002.3 Referencia de pago obligatoria | ⚠️ **PaymentReference es OPCIONAL en DTO** | ⚠️ Campo existe pero no validado como obligatorio | **FALLO** |
| CA-002.4 Pago pendiente max 3, razón obligatoria | ✅ Max 3 en dominio / ⚠️ **Reason OPCIONAL en DTO** | ⚠️ Campo razón no forzado como obligatorio | **FALLO** |
| CA-002.5 Ausencia max 2, retorna a cola | ✅ Dominio valida | ✅ | OK |
| CA-002.6 Cancelación solo tras 3 intentos | ✅ Dominio valida | ✅ | OK |
| CA-002.7 Roles Cashier/Admin | ✅ | ✅ | OK |
| CA-002.8 Transiciones estrictas | ✅ | ✅ | OK |
| CA-002.9 Auto-selección + fallback manual | ⚠️ No hay fallback explícito | ⚠️ UI muestra lista pero no documenta fallback | MENOR |
| CA-002.10 Eventos inmutables | ✅ | N/A | OK |
| CA-002.11 Fallo infra → 503 | ✅ | ⚠️ | MENOR |
| CA-002.12 Cierre sesión/fallo terminal | No implementado a nivel de dominio | ⚠️ Sin mecanismo de "retomar" proceso | **FALLO** |

### HU-003: Atención médica en consultorio

| Criterio refinado | Backend | Frontend | Veredicto |
|-------------------|---------|----------|-----------|
| CA-003.1 Claim siguiente (orden) | ✅ | ✅ | OK |
| CA-003.2 Solo un paciente activo | ✅ | ✅ | OK |
| CA-003.3 Consultorio activo requerido | ✅ | ✅ | OK |
| CA-003.4 Llamar paciente reclamado | ✅ | ✅ start-consultation | OK |
| CA-003.5 Completar con outcome | ✅ / ⚠️ **Outcome OPCIONAL en DTO** | ⚠️ No forzado como obligatorio | **FALLO** |
| CA-003.6 Ausencia 1 reintento | ✅ | ✅ | OK |
| CA-003.7 Roles Doctor/Admin | ✅ | ✅ | OK |
| CA-003.8 Activar/desactivar consultorios | ✅ | ✅ | OK |
| CA-003.9 Auto-relleno patientId | N/A | ✅ (auto-fill tras claim) | OK |
| CA-003.10 Eventos inmutables | ✅ | N/A | OK |
| CA-003.11 Fallo infra → 503 | ✅ | ⚠️ | MENOR |
| CA-003.12 PII no en logs | ✅ Parcial | N/A | MENOR |

---

## 4. PROBLEMAS DE FLUJO Y REDIRECCIONES

### PROBLEMA 1: Recepción redirige tras registrar paciente

**Situación actual:** Tras registrar un check-in exitoso, `/reception` ejecuta `router.push('/waiting-room/{queueId}')`, sacando al recepcionista de su pantalla de trabajo.

**Impacto:** El recepcionista pierde su contexto de trabajo. La recepción debería ser una estación fija donde se registran pacientes uno tras otro sin navegar a otra pantalla.

**Solución propuesta:** Eliminar la redirección post-registro. Tras un check-in exitoso, mostrar un toast de confirmación con el nombre y turno del paciente, limpiar el formulario y mantener al recepcionista en `/reception`.

### PROBLEMA 2: No existe concepto de "número de turno"

**Situación actual:** El sistema identifica pacientes por `patientId` (cédula/documento). No existe un número de turno secuencial (ej: A-001, A-002) que el paciente pueda ver en una pantalla.

**Impacto:** En una sala de espera real, los pacientes necesitan un identificador simple y anónimo (número de turno) para saber cuándo los llaman, sin exponer su nombre completo ni cédula en pantallas públicas.

**Solución propuesta:**
- Backend: Agregar `turnNumber` (int autoincremental por cola) al evento `PatientCheckedIn` y a las proyecciones.
- Frontend: Mostrar `turnNumber` en la pantalla de display en vez de `patientName`.
- Búsquedas: Permitir buscar por `turnNumber` o por `patientId` (documento).

### PROBLEMA 3: Pantalla de display expone nombres de pacientes

**Situación actual:** `/display/[queueId]` muestra `patientName` públicamente en la lista de espera y en el turno llamado.

**Impacto:** Violación de protección de datos personales. En una pantalla pública no debería mostrarse el nombre completo.

**Solución propuesta:** Mostrar solo el número de turno y, opcionalmente, las iniciales del nombre (ej: "Turno A-005 — J.O.").

### PROBLEMA 4: Dos rutas de registro duplicadas

**Situación actual:** Existen `/reception` (formulario de recepción) y `/registration` (AppointmentRegistrationForm). Ambas registran pacientes pero con diferentes componentes, flujos y mecanismos (una usa API REST, la otra usa repositorio DI).

**Impacto:** Confusión funcional, mantenimiento duplicado y posible inconsistencia de datos.

**Solución propuesta:** Eliminar `/registration` o convertirla en un alias que renderice el mismo componente de `/reception`. Solo debe haber una pantalla de registro.

### PROBLEMA 5: Endpoints backend duplicados

**Situación actual:** Existen rutas paralelas para las mismas operaciones:
- `/api/waiting-room/check-in` vs `/api/reception/register` (mismo handler)
- `/api/waiting-room/claim-next` vs `/api/medical/call-next` (mismo handler)
- `/api/waiting-room/call-patient` vs `/api/medical/start-consultation`
- `/api/waiting-room/complete-attention` vs `/api/medical/finish-consultation`

**Impacto:** Superficie de API innecesariamente grande, confusión sobre cuál usar, posible drift de comportamiento futuro.

**Solución propuesta:** Deprecar los endpoints genéricos `/api/waiting-room/*` (excepto check-in y queries). Mantener solo las rutas semánticas: `/api/reception/*`, `/api/cashier/*`, `/api/medical/*`.

### PROBLEMA 6: SignalR hub vacío

**Situación actual:** `WaitingRoomHub` en `/ws/waiting-room` existe pero no define ningún método. El frontend se conecta por SignalR y escucha eventos (`MonitorUpdated`, `QueueStateUpdated`, etc.), pero el backend nunca los emite.

**Impacto:** SignalR está configurado pero no funcional. Las actualizaciones en tiempo real dependen 100% del polling cada 5 segundos.

**Solución propuesta:** Implementar la emisión de eventos SignalR desde el Worker (o desde los command handlers) cuando se procesen eventos del Outbox. El hub debería notificar a los clientes conectados cada vez que cambie el estado de la cola.

---

## 5. FALLOS EN LA LÓGICA DE NEGOCIO

### FALLO 1: `PaymentReference` es opcional en el backend

**Ubicación:** `ValidatePaymentDto.PaymentReference` — campo nullable/opcional.
**HU-002 CA-002.3:** "El cajero debe ingresar una referencia de comprobante (campo obligatorio, texto no vacío)."
**Corrección:** Hacer `PaymentReference` requerido y no vacío en la validación del DTO.

### FALLO 2: `Reason` es opcional en `MarkPaymentPendingDto`

**Ubicación:** `MarkPaymentPendingDto.Reason` — campo nullable/opcional.
**HU-002 CA-002.4:** "Cada marcación requiere una razón obligatoria (texto no vacío)."
**Corrección:** Hacer `Reason` requerido y no vacío en la validación del DTO.

### FALLO 3: `Outcome` es opcional en `CompleteAttentionDto`

**Ubicación:** `CompleteAttentionDto.Outcome` — campo nullable/opcional.
**HU-003 CA-003.5:** "El médico puede registrar un resultado clínico (outcome, texto libre)." — Aunque dice "puede", la versión refinada implica que es un dato necesario para la trazabilidad clínica.
**Corrección:** Evaluar si outcome debe ser obligatorio. Si se mantiene opcional, documentar explícitamente.

### FALLO 4: Activar/desactivar consultorios permite a Doctor (HU dice solo Admin)

**Ubicación:** Endpoints `/api/medical/consulting-room/activate` y `deactivate` permiten rol Doctor.
**HU-003 CA-003.8:** "Los consultorios pueden activarse y desactivarse **exclusivamente por un administrador**."
**Corrección:** Restringir el filtro de rol a solo Admin en los endpoints de activar/desactivar consultorio.

### FALLO 5: No hay mecanismo de "retomar" proceso de caja abandonado

**HU-002 CA-002.12:** "Si el cajero cierra sesión o su terminal falla durante un proceso activo, el paciente permanece en el estado actual y puede ser retomado por otro cajero."
**Situación:** No existe endpoint ni flujo frontend para que un cajero "retome" un proceso abandonado. El paciente queda atascado en `EnTaquilla` sin vía de resolución.
**Corrección:** La interfaz de cajero debería detectar si ya hay un paciente en `EnTaquilla` al cargar y ofrecerlo como turno activo.

### FALLO 6: No se genera número de turno automático

**Impacto transversal:** Sin número de turno, el sistema no puede funcionar como una sala de espera real donde los pacientes identifican su posición por un ticket.
**Corrección:** Agregar `turnNumber` secuencial por cola en el aggregate `WaitingQueue`, asignado al hacer check-in.

---

## 6. PLAN DE REFACTOR POR FASES

### Fase 1 — Correcciones de datos obligatorios (backend)
1. Hacer `PaymentReference` obligatorio en `ValidatePaymentDto`
2. Hacer `Reason` obligatorio en `MarkPaymentPendingDto`
3. Restringir activar/desactivar consultorio a solo Admin
4. Evaluar obligatoriedad de `Outcome` en `CompleteAttentionDto`

### Fase 2 — Número de turno (backend + frontend)
1. Agregar `TurnNumber` al aggregate y al evento `PatientCheckedIn`
2. Incluir `turnNumber` en las proyecciones (QueueState, NextTurn)
3. Retornar `turnNumber` en la respuesta del check-in
4. Mostrar `turnNumber` en display público en vez de `patientName`
5. Permitir búsqueda por `turnNumber` o `patientId`

### Fase 3 — Correcciones de flujo frontend
1. Eliminar redirección post-registro en `/reception` → toast + limpiar form
2. Eliminar o unificar `/registration` con `/reception`
3. Ajustar pantalla display para mostrar turnos anónimos
4. Implementar detección de "turno activo abandonado" en vista de cajero

### Fase 4 — Limpieza de API
1. Deprecar endpoints genéricos `/api/waiting-room/claim-next`, `call-patient`, `complete-attention`
2. Mantener solo `/api/waiting-room/check-in` como alias (o eliminarlo a favor de `/api/reception/register`)

### Fase 5 — SignalR funcional
1. Implementar emisión de eventos desde el Worker al procesar Outbox
2. Emitir `MonitorUpdated`, `QueueStateUpdated`, `NextTurn` desde el hub
3. Reducir frecuencia de polling una vez SignalR sea confiable

---

## 7. RESUMEN EJECUTIVO

| Categoría | Problemas encontrados | Severidad |
|-----------|----------------------|-----------|
| Redirecciones incorrectas | 1 (recepción redirige fuera) | Alta |
| Datos obligatorios no validados | 3 (PaymentReference, Reason, Outcome) | Alta |
| Privacidad en display público | 1 (nombres expuestos) | Alta |
| Concepto de turno ausente | 1 (no existe turn number) | Alta |
| Endpoints duplicados | 5 (genéricos vs semánticos) | Media |
| Rutas frontend duplicadas | 1 (/reception vs /registration) | Media |
| SignalR no funcional | 1 (hub vacío) | Media |
| Permisos incorrectos | 1 (Doctor puede gestionar consultorios) | Media |
| Retomar proceso abandonado | 1 (sin mecanismo) | Media |
| Manejo de 503 en frontend | 3 (genérico, no específico) | Baja |
| **TOTAL** | **18 hallazgos** | — |
