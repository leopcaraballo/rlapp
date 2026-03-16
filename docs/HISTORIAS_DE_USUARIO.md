# Historias de usuario resueltas

## HU-001: Registro de paciente en recepcion (Check-in)

**Como** recepcionista,
**quiero** registrar a un paciente en la cola de espera con sus datos basicos y prioridad,
**para que** el paciente ingrese al flujo operativo de la clinica y sea visible para las estaciones de caja y consultorio.

**Estado:** Resuelta

### Criterios de aceptacion

| ID | Criterio | Validacion |
|----|----------|------------|
| CA-001.1 | El formulario requiere cedula (3-20 caracteres alfanumericos), nombre (minimo 2 caracteres), prioridad y tipo de consulta. | Validacion Zod en el frontend (`CheckInSchema`) y validacion de Value Objects en el dominio (`PatientId`, `Priority`, `ConsultationType`). |
| CA-001.2 | Las prioridades validas son: Low (Baja), Medium (Normal), High (Alta), Urgent (Urgente). Cualquier otro valor es rechazado. | Invariante `ValidatePriority` en `WaitingQueueInvariants`; Value Object `Priority` con valores canonicos. |
| CA-001.3 | Los tipos de consulta validos son: General, Specialist, Emergency. | Enum `ConsultationType` en el frontend; Value Object `ConsultationType` (2-100 caracteres) en el dominio. |
| CA-001.4 | No se permite registrar al mismo paciente dos veces en la misma cola activa. El sistema retorna error de dominio. | Invariante `ValidateDuplicateCheckIn` compara `PatientId` contra pacientes existentes en la cola. |
| CA-001.5 | Si la cola alcanza su capacidad maxima, el check-in es rechazado con un mensaje explicativo. | Invariante `ValidateCapacity` verifica `Patients.Count < MaxCapacity`. |
| CA-001.6 | La operacion es idempotente: reintentos con la misma `Idempotency-Key` retornan la respuesta original sin crear duplicados. | Middleware `IdempotencyKeyMiddleware` consulta `waiting_room_idempotency_records` (TTL 24h). |
| CA-001.7 | Tras el registro exitoso, el paciente entra en estado `EnEsperaTaquilla` y es visible en la cola de caja ordenado por prioridad descendente y hora de check-in ascendente. | Evento `PatientCheckedIn` emitido; metodo `When(PatientCheckedIn)` asigna estado `WaitingCashierState`. |
| CA-001.8 | Solo los roles Receptionist y Admin pueden ejecutar el check-in. Otros roles reciben HTTP 403. | Filtro `ReceptionistOnlyFilter` valida claim JWT `role` o header `X-User-Role` en desarrollo. |
| CA-001.9 | Campos opcionales (edad, embarazo, notas) se aceptan sin ser obligatorios. | DTO `CheckInPatientDto` define `Age`, `IsPregnant` y `Notes` como nullable. |
| CA-001.10 | El evento `PatientCheckedIn` se persiste en el Event Store y se inserta en la Outbox para despacho asincrono a RabbitMQ. | `PostgresEventStore` graba en `waiting_room_events` y `PostgresOutboxStore` inserta en `waiting_room_outbox`. |

### Evidencia tecnica

- **Endpoint:** `POST /api/waiting-room/check-in`
- **Command Handler:** `CheckInPatientCommandHandler`
- **Agregado:** `WaitingQueue.CheckInPatient(CheckInPatientRequest)`
- **Evento de dominio:** `PatientCheckedIn`
- **Frontend:** `apps/frontend/src/app/reception/page.tsx`

---

## HU-002: Gestion de pago en caja

**Como** cajero,
**quiero** llamar al siguiente paciente en cola, validar su pago o marcar pendientes y ausencias,
**para que** el paciente avance al consultorio tras validar su pago, o sea gestionado segun las politicas de reintento y cancelacion de la clinica.

**Estado:** Resuelta

### Criterios de aceptacion

| ID | Criterio | Validacion |
|----|----------|------------|
| CA-002.1 | El cajero puede llamar al siguiente paciente en cola de caja. El sistema selecciona por prioridad descendente y hora de check-in ascendente entre pacientes en estado `EnEsperaTaquilla`. | Metodo `CallNextAtCashier` filtra por estado `WaitingCashierState`, ordena por `Priority.Level DESC, CheckInTime ASC`. |
| CA-002.2 | Solo un paciente puede estar en proceso de caja activo a la vez. Si ya hay uno activo, el sistema rechaza la llamada. | Invariante `ValidateNoActiveCashier(CurrentCashierPatientId)`. |
| CA-002.3 | Al validar el pago (con referencia obligatoria), el paciente transiciona a `EnEsperaConsulta` y queda disponible para los medicos. Los contadores de intentos de pago y ausencia se reinician. | Metodo `ValidatePayment`: emite `PatientPaymentValidated`, estado → `WaitingConsultationState`, limpia `_paymentAttempts` y `_cashierAbsenceRetries`. |
| CA-002.4 | El cajero puede marcar el pago como pendiente hasta un maximo de 3 veces, con razon obligatoria. Al cuarto intento, el sistema rechaza la operacion. | Metodo `MarkPaymentPending`: incrementa `_paymentAttempts`; si `attemptNumber > MaxPaymentAttempts (3)` lanza `DomainException`. |
| CA-002.5 | El cajero puede marcar al paciente como ausente en caja hasta un maximo de 2 veces. Tras cada ausencia, el paciente retorna a la cola de espera de caja. | Metodo `MarkAbsentAtCashier`: incrementa `_cashierAbsenceRetries`; si `retryNumber > MaxCashierAbsenceRetries (2)` lanza `DomainException`. El evento reinicia el estado a `WaitingCashierState`. |
| CA-002.6 | La cancelacion por pago solo se permite tras agotar los 3 intentos de pago. Si no los agoto, el sistema rechaza la cancelacion. | Metodo `CancelByPayment`: valida `attempts < MaxPaymentAttempts` → `DomainException`. Emite `PatientCancelledByPayment`. |
| CA-002.7 | Solo los roles Cashier y Admin pueden ejecutar operaciones de caja. Otros roles reciben HTTP 403. | Filtro `CashierOnlyFilter` valida claim JWT `role`. |
| CA-002.8 | Las transiciones de estado son estrictas: validar/pendiente/ausencia solo desde `EnTaquilla` o `PagoPendiente`. Cualquier otra transicion es rechazada. | Validacion explicita de `currentState` en cada metodo contra `CashierCalledState` y `PaymentPendingState`. |
| CA-002.9 | La interfaz muestra al paciente llamado automaticamente (auto-seleccion via nextTurn con status `cashier-called`). | Hook `useCashierStation` + efecto en `CashierPage` sincroniza `nextTurn` con el estado seleccionado. |
| CA-002.10 | Cada operacion de caja genera un evento de dominio inmutable que se persiste en el Event Store y se despacha via Outbox. | Eventos: `PatientCalledAtCashier`, `PatientPaymentValidated`, `PatientPaymentPending`, `PatientAbsentAtCashier`, `PatientCancelledByPayment`. |

### Evidencia tecnica

- **Endpoints:** `POST /api/waiting-room/cashier/call-next`, `POST /api/waiting-room/cashier/validate-payment`, `POST /api/waiting-room/cashier/mark-pending`, `POST /api/waiting-room/cashier/mark-absent`, `POST /api/waiting-room/cashier/cancel-by-payment`
- **Command Handlers:** `CallNextCashierCommandHandler`, `ValidatePaymentCommandHandler`, `MarkPaymentPendingCommandHandler`, `MarkAbsentAtCashierCommandHandler`, `CancelByPaymentCommandHandler`
- **Agregado:** `WaitingQueue` (metodos `CallNextAtCashier`, `ValidatePayment`, `MarkPaymentPending`, `MarkAbsentAtCashier`, `CancelByPayment`)
- **Frontend:** `apps/frontend/src/app/cashier/page.tsx`, hook `useCashierStation`

---

## HU-003: Atencion medica en consultorio

**Como** medico,
**quiero** reclamar al siguiente paciente aprobado, llamarlo a mi consultorio, completar su atencion o marcarlo ausente,
**para que** el flujo clinico se complete con trazabilidad total y el paciente sea atendido o gestionado segun la politica de ausencias.

**Estado:** Resuelta

### Criterios de aceptacion

| ID | Criterio | Validacion |
|----|----------|------------|
| CA-003.1 | El medico puede reclamar (claim) al siguiente paciente en estado `EnEsperaConsulta`. El sistema selecciona por prioridad descendente y hora de check-in ascendente. | Metodo `ClaimNextPatient`: filtra por `WaitingConsultationState`, ordena por `Priority.Level DESC, CheckInTime ASC`. Emite `PatientClaimedForAttention`. |
| CA-003.2 | Solo se puede reclamar un paciente si no hay otro en atencion activa en la misma cola. | Invariante `ValidateNoActiveAttention(CurrentAttentionPatientId)`. |
| CA-003.3 | El claim solo se permite desde un consultorio activo. Si el consultorio esta desactivado, el sistema rechaza la operacion. | Invariante `ValidateConsultingRoomActive` verifica que `_activeConsultingRooms` contiene el `stationId`. |
| CA-003.4 | El medico puede llamar al paciente reclamado (call), transicionandolo a estado `EnConsulta`. | Metodo `CallPatient`: valida estado `LlamadoConsulta` (claimed), emite `PatientCalled`, estado → `CalledState`. |
| CA-003.5 | Al completar la atencion, el paciente transiciona a estado `Finalizado` con outcome y notas opcionales. | Metodo `CompleteAttention`: valida estado `EnConsulta`, emite `PatientAttentionCompleted` con `Outcome` y `Notes`. |
| CA-003.6 | El medico puede marcar ausencia en consultorio. Se permite 1 reintento. Si se excede, el paciente se cancela automaticamente por ausencia. | Metodo `MarkAbsentAtConsultation`: si `retryNumber <= MaxConsultationAbsenceRetries (1)` emite `PatientAbsentAtConsultation`; si se excede emite `PatientCancelledByAbsence`. |
| CA-003.7 | Solo los roles Doctor y Admin pueden ejecutar operaciones medicas. Otros roles reciben HTTP 403. | Filtro `DoctorOnlyFilter` valida claim JWT `role`. |
| CA-003.8 | Los consultorios (CONS-01 a CONS-04) pueden activarse y desactivarse por un administrador. Solo los activos participan en el flujo de claim. | Metodos `ActivateConsultingRoom` / `DeactivateConsultingRoom` con invariantes `ValidateConsultingRoomCanActivate` / `ValidateConsultingRoomCanDeactivate`. |
| CA-003.9 | La interfaz auto-rellena el `patientId` tras un claim exitoso para evitar copia manual del identificador por el medico. | Efecto en `MedicalPage` observa `medical.lastResult?.patientId` y ejecuta `setValue("patientId", claimedId)`. |
| CA-003.10 | Cada operacion medica genera un evento de dominio inmutable, persistido en el Event Store y despachado via Outbox a RabbitMQ. | Eventos: `PatientClaimedForAttention`, `PatientCalled`, `PatientAttentionCompleted`, `PatientAbsentAtConsultation`, `PatientCancelledByAbsence`, `ConsultingRoomActivated`, `ConsultingRoomDeactivated`. |

### Evidencia tecnica

- **Endpoints:** `POST /api/waiting-room/medical/claim`, `POST /api/waiting-room/medical/call`, `POST /api/waiting-room/medical/complete`, `POST /api/waiting-room/medical/mark-absent`, `POST /api/waiting-room/consulting-room/activate`, `POST /api/waiting-room/consulting-room/deactivate`
- **Command Handlers:** `ClaimNextPatientCommandHandler`, `CallPatientCommandHandler`, `CompleteAttentionCommandHandler`, `MarkAbsentAtConsultationCommandHandler`, `ActivateConsultingRoomCommandHandler`, `DeactivateConsultingRoomCommandHandler`
- **Agregado:** `WaitingQueue` (metodos `ClaimNextPatient`, `CallPatient`, `CompleteAttention`, `MarkAbsentAtConsultation`, `ActivateConsultingRoom`, `DeactivateConsultingRoom`)
- **Frontend:** `apps/frontend/src/app/medical/page.tsx`, `apps/frontend/src/app/consulting-rooms/page.tsx`, hooks `useMedicalStation`, `useConsultingRooms`
