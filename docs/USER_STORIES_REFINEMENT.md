# Informe comparativo de refinamiento de historias de usuario

Documento que presenta, para cada una de las 3 historias de usuario del proyecto RLAPP, la version original, la version refinada tras el diagnostico de calidad y el cuadro de diferencias detectadas.

---

## HU-001: Registro de paciente en recepcion (Check-in)

### Version original

**Como** recepcionista,
**quiero** registrar a un paciente en la cola de espera con sus datos basicos y prioridad,
**para que** el paciente ingrese al flujo operativo de la clinica y sea visible para las estaciones de caja y consultorio.

**Criterios de aceptacion originales:**

| ID | Criterio |
|----|----------|
| CA-001.1 | El formulario requiere cedula (3-20 caracteres alfanumericos), nombre (minimo 2 caracteres), prioridad y tipo de consulta. |
| CA-001.2 | Las prioridades validas son: Low (Baja), Medium (Normal), High (Alta), Urgent (Urgente). Cualquier otro valor es rechazado. |
| CA-001.3 | Los tipos de consulta validos son: General, Specialist, Emergency. |
| CA-001.4 | No se permite registrar al mismo paciente dos veces en la misma cola activa. El sistema retorna error de dominio. |
| CA-001.5 | Si la cola alcanza su capacidad maxima, el check-in es rechazado con un mensaje explicativo. |
| CA-001.6 | La operacion es idempotente: reintentos con la misma Idempotency-Key retornan la respuesta original sin crear duplicados. |
| CA-001.7 | Tras el registro exitoso, el paciente entra en estado EnEsperaTaquilla y es visible en la cola de caja ordenado por prioridad descendente y hora de check-in ascendente. |
| CA-001.8 | Solo los roles Receptionist y Admin pueden ejecutar el check-in. Otros roles reciben HTTP 403. |
| CA-001.9 | Campos opcionales (edad, embarazo, notas) se aceptan sin ser obligatorios. |
| CA-001.10 | El evento PatientCheckedIn se persiste en el Event Store y se inserta en la Outbox para despacho asincrono a RabbitMQ. |

### Version refinada

**Como** recepcionista,
**quiero** registrar a un paciente en la cola de espera ingresando su cedula, nombre completo, prioridad clinica, tipo de consulta y opcionalmente edad, indicador de embarazo y notas,
**para que** el paciente ingrese al flujo operativo de la clinica, sea visible para las estaciones de caja y consultorio, y el evento de registro quede trazado en el Event Store conforme a las normativas de proteccion de datos personales.

**Criterios de aceptacion refinados:**

| ID | Criterio |
|----|----------|
| CA-001.1 | El formulario requiere cedula (3-20 caracteres alfanumericos, solo letras, numeros y guiones), nombre completo (minimo 2 caracteres) , prioridad y tipo de consulta. Campos opcionales: edad (entero entre 0 y 120), indicador de embarazo (booleano) y notas (texto libre, maximo 500 caracteres). |
| CA-001.2 | Las prioridades validas son: Low (Baja), Medium (Normal), High (Alta), Urgent (Urgente). Cualquier otro valor retorna HTTP 400 con mensaje descriptivo del error. |
| CA-001.3 | Los tipos de consulta validos son: General, Specialist, Emergency. Cualquier otro valor retorna HTTP 400 con mensaje descriptivo. |
| CA-001.4 | No se permite registrar al mismo paciente dos veces en la misma cola activa. El sistema retorna HTTP 409 (Conflict) con mensaje indicando que el paciente ya esta registrado en la cola. |
| CA-001.5 | Si la cola alcanza su capacidad maxima, el check-in es rechazado con HTTP 409 y un mensaje indicando la capacidad actual y el limite. |
| CA-001.6 | La operacion es idempotente: reintentos con la misma Idempotency-Key retornan la respuesta original (mismo status code y payload) sin ejecutar el comando de nuevo. Los registros de idempotencia expiran tras 24 horas; pasado ese plazo el paciente puede registrarse nuevamente si fue dado de baja. |
| CA-001.7 | Tras el registro exitoso (HTTP 200), el paciente entra en estado EnEsperaTaquilla, se asigna a la cola por defecto QUEUE-01, y es visible en la cola de caja ordenado por prioridad descendente y hora de check-in ascendente (FIFO dentro de la misma prioridad). |
| CA-001.8 | Solo los roles Receptionist y Admin pueden ejecutar el check-in. Otros roles reciben HTTP 403 con mensaje de acceso denegado. Los intentos no autorizados se registran en el log de auditoria. |
| CA-001.9 | Los campos opcionales (edad, embarazo, notas) se aceptan sin ser obligatorios. El campo edad debe estar entre 0 y 120 si se proporciona. El campo notas admite texto plano con un maximo de 500 caracteres. |
| CA-001.10 | El evento PatientCheckedIn se persiste en el Event Store con correlation_id, causation_id, actor y fecha de ocurrencia, y se inserta en la Outbox para despacho asincrono a RabbitMQ. Los datos personales (cedula, nombre) no se exponen en los logs del sistema. |
| CA-001.11 | En caso de fallo de infraestructura (base de datos o mensajeria no disponible), el sistema retorna HTTP 503 con mensaje generico. El evento queda en la Outbox para reintento automatico. |

### Cuadro de diferencias

| Aspecto | Version original | Version refinada | Tipo de cambio |
|---------|-----------------|-----------------|----------------|
| Descripcion de la HU | Menciona "datos basicos" sin detallarlos | Lista explicitamente todos los campos obligatorios y opcionales | Clarificacion |
| Trazabilidad en la descripcion | No mencionada | Incluye referencia al Event Store y normativas de proteccion de datos | Adicion |
| Campos opcionales (CA-001.1/CA-001.9) | Se mencionan sin restricciones de formato ni longitud | Se define rango de edad (0-120), formato de notas (texto plano, max 500 caracteres) | Clarificacion |
| Codigos HTTP de error | No especificados | Se definen HTTP 400 (validacion), 409 (duplicado/capacidad), 403 (rol), 503 (infraestructura) | Adicion |
| Mensajes de error | Genericos ("mensaje explicativo") | Descriptivos y especificos por escenario | Clarificacion |
| Cola por defecto | Implicita | Explicita: siempre se asigna a QUEUE-01 | Clarificacion |
| Expiracion de idempotencia | TTL 24h mencionado sin consecuencias | Se explica que tras expirar, el paciente puede registrarse nuevamente si fue dado de baja | Clarificacion |
| Auditoria de intentos no autorizados | No mencionada | Los intentos con rol no autorizado se registran en el log | Adicion |
| Proteccion de datos en logs | No mencionada | Se explicita que cedula y nombre no se exponen en logs | Adicion |
| Fallo de infraestructura (CA-001.11) | No contemplado | Nuevo criterio: HTTP 503, reintento automatico via Outbox | Adicion |

---

## HU-002: Gestion de pago en caja

### Version original

**Como** cajero,
**quiero** llamar al siguiente paciente en cola, validar su pago o marcar pendientes y ausencias,
**para que** el paciente avance al consultorio tras validar su pago, o sea gestionado segun las politicas de reintento y cancelacion de la clinica.

**Criterios de aceptacion originales:**

| ID | Criterio |
|----|----------|
| CA-002.1 | El cajero puede llamar al siguiente paciente en cola de caja. El sistema selecciona por prioridad descendente y hora de check-in ascendente entre pacientes en estado EnEsperaTaquilla. |
| CA-002.2 | Solo un paciente puede estar en proceso de caja activo a la vez. Si ya hay uno activo, el sistema rechaza la llamada. |
| CA-002.3 | Al validar el pago (con referencia obligatoria), el paciente transiciona a EnEsperaConsulta y queda disponible para los medicos. Los contadores de intentos de pago y ausencia se reinician. |
| CA-002.4 | El cajero puede marcar el pago como pendiente hasta un maximo de 3 veces, con razon obligatoria. Al cuarto intento, el sistema rechaza la operacion. |
| CA-002.5 | El cajero puede marcar al paciente como ausente en caja hasta un maximo de 2 veces. Tras cada ausencia, el paciente retorna a la cola de espera de caja. |
| CA-002.6 | La cancelacion por pago solo se permite tras agotar los 3 intentos de pago. Si no los agoto, el sistema rechaza la cancelacion. |
| CA-002.7 | Solo los roles Cashier y Admin pueden ejecutar operaciones de caja. Otros roles reciben HTTP 403. |
| CA-002.8 | Las transiciones de estado son estrictas: validar/pendiente/ausencia solo desde EnTaquilla o PagoPendiente. Cualquier otra transicion es rechazada. |
| CA-002.9 | La interfaz muestra al paciente llamado automaticamente (auto-seleccion via nextTurn con status cashier-called). |
| CA-002.10 | Cada operacion de caja genera un evento de dominio inmutable que se persiste en el Event Store y se despacha via Outbox. |

### Version refinada

**Como** cajero,
**quiero** llamar al siguiente paciente en la cola de caja, validar su pago ingresando una referencia de comprobante, marcar el pago como pendiente indicando la razon, registrar ausencias o cancelar al paciente por incumplimiento de pago,
**para que** el paciente avance al consultorio tras la validacion de su pago, o sea gestionado segun las politicas de reintento (maximo 3 intentos de pago, maximo 2 ausencias) y cancelacion de la clinica, garantizando trazabilidad completa de cada operacion.

**Criterios de aceptacion refinados:**

| ID | Criterio |
|----|----------|
| CA-002.1 | El cajero puede llamar al siguiente paciente en cola de caja. El sistema selecciona automaticamente por prioridad descendente y hora de check-in ascendente entre pacientes en estado EnEsperaTaquilla. Si la cola esta vacia, retorna HTTP 409 con mensaje indicando que no hay pacientes disponibles. |
| CA-002.2 | Solo un paciente puede estar en proceso de caja activo a la vez. Si ya hay uno activo, el sistema retorna HTTP 409 con mensaje indicando que existe un proceso de caja en curso. |
| CA-002.3 | Al validar el pago, el cajero debe ingresar una referencia de comprobante (campo obligatorio, texto no vacio). Tras la validacion, el paciente transiciona a EnEsperaConsulta, los contadores de intentos de pago y ausencia se reinician, y el slot de caja activa se libera. |
| CA-002.4 | El cajero puede marcar el pago como pendiente hasta un maximo de 3 veces. Cada marcacion requiere una razon obligatoria (texto no vacio). Al cuarto intento, el sistema retorna HTTP 409 indicando que se agotaron los intentos de pago. |
| CA-002.5 | El cajero puede marcar al paciente como ausente en caja hasta un maximo de 2 veces. Tras cada ausencia, el paciente retorna al final de la cola de caja (estado EnEsperaTaquilla) y el slot de caja activa se libera. Al tercer intento de marcar ausencia, el sistema retorna HTTP 409. |
| CA-002.6 | La cancelacion por pago solo se habilita tras agotar los 3 intentos de pago. Si los intentos no se agotaron, el sistema retorna HTTP 409 indicando que la cancelacion no esta permitida aun. Al cancelar, el paciente pasa a estado CanceladoPorPago (estado terminal). |
| CA-002.7 | Solo los roles Cashier y Admin pueden ejecutar operaciones de caja. Otros roles reciben HTTP 403 con mensaje de acceso denegado. |
| CA-002.8 | Las transiciones de estado son estrictas: las operaciones de validar, marcar pendiente, marcar ausencia y cancelar solo se admiten desde los estados EnTaquilla o PagoPendiente. Cualquier otra transicion retorna HTTP 409 con mensaje indicando el estado actual y los estados validos. |
| CA-002.9 | La interfaz muestra al paciente llamado automaticamente (auto-seleccion via nextTurn). Si hay un fallo de sincronizacion o no existe un nextTurn activo, la interfaz muestra la lista de cola y el cajero selecciona manualmente. |
| CA-002.10 | Cada operacion de caja genera un evento de dominio inmutable (PatientCalledAtCashier, PatientPaymentValidated, PatientPaymentPending, PatientAbsentAtCashier, PatientCancelledByPayment) que se persiste en el Event Store y se despacha via Outbox. |
| CA-002.11 | En caso de fallo de infraestructura durante una operacion de caja, el sistema retorna HTTP 503. Los eventos pendientes en la Outbox se reintentan automaticamente por el Worker. |
| CA-002.12 | Si el cajero cierra sesion o su terminal falla durante un proceso activo, el paciente permanece en el estado actual (EnTaquilla o PagoPendiente) y puede ser retomado por otro cajero o admin al recargar la interfaz. |

### Cuadro de diferencias

| Aspecto | Version original | Version refinada | Tipo de cambio |
|---------|-----------------|-----------------|----------------|
| Descripcion de la HU | Generica ("marcar pendientes y ausencias") | Detalla cada accion con sus inputs requeridos y los limites de reintentos | Clarificacion |
| Limites en la descripcion | Solo en los criterios de aceptacion | Explicitados tambien en la descripcion: max 3 pagos, max 2 ausencias | Clarificacion |
| Referencia de pago (CA-002.3) | "Referencia obligatoria" sin formato | Campo obligatorio, texto no vacio | Clarificacion |
| Codigos HTTP de error | Solo se menciona HTTP 403 para roles | Se definen HTTP 409 (negocio), HTTP 403 (roles), HTTP 503 (infraestructura) por escenario | Adicion |
| Cola vacia (CA-002.1) | No se describe que ocurre si no hay pacientes | Retorna HTTP 409 con mensaje explicativo | Adicion |
| Liberacion de slot (CA-002.3/CA-002.5) | No se explicita que se libera el slot de caja activa | Se explicita la liberacion del slot tras validar o marcar ausencia | Clarificacion |
| Estado terminal (CA-002.6) | Solo dice "cancelacion" | Se indica que CanceladoPorPago es un estado terminal | Clarificacion |
| Mensaje de transicion invalida (CA-002.8) | "Cualquier otra transicion es rechazada" | Se retorna HTTP 409 indicando estado actual y estados validos | Clarificacion |
| Fallback de seleccion manual (CA-002.9) | No contemplado | Si no hay nextTurn activo, el cajero selecciona manualmente de la lista | Adicion |
| Fallo de infraestructura (CA-002.11) | No contemplado | Nuevo criterio: HTTP 503, reintento automatico via Worker | Adicion |
| Cierre de sesion/fallo de terminal (CA-002.12) | No contemplado | Nuevo criterio: el paciente permanece en su estado y puede ser retomado | Adicion |
| Tamano de la HU (INVEST) | Una sola historia con 5 flujos de caja | Se recomienda considerar division en sub-historias para entrega incremental (validar pago, gestionar pendientes, registrar ausencias) | Recomendacion |

---

## HU-003: Atencion medica en consultorio

### Version original

**Como** medico,
**quiero** reclamar al siguiente paciente aprobado, llamarlo a mi consultorio, completar su atencion o marcarlo ausente,
**para que** el flujo clinico se complete con trazabilidad total y el paciente sea atendido o gestionado segun la politica de ausencias.

**Criterios de aceptacion originales:**

| ID | Criterio |
|----|----------|
| CA-003.1 | El medico puede reclamar (claim) al siguiente paciente en estado EnEsperaConsulta. El sistema selecciona por prioridad descendente y hora de check-in ascendente. |
| CA-003.2 | Solo se puede reclamar un paciente si no hay otro en atencion activa en la misma cola. |
| CA-003.3 | El claim solo se permite desde un consultorio activo. Si el consultorio esta desactivado, el sistema rechaza la operacion. |
| CA-003.4 | El medico puede llamar al paciente reclamado (call), transicionandolo a estado EnConsulta. |
| CA-003.5 | Al completar la atencion, el paciente transiciona a estado Finalizado con outcome y notas opcionales. |
| CA-003.6 | El medico puede marcar ausencia en consultorio. Se permite 1 reintento. Si se excede, el paciente se cancela automaticamente por ausencia. |
| CA-003.7 | Solo los roles Doctor y Admin pueden ejecutar operaciones medicas. Otros roles reciben HTTP 403. |
| CA-003.8 | Los consultorios (CONS-01 a CONS-04) pueden activarse y desactivarse por un administrador. Solo los activos participan en el flujo de claim. |
| CA-003.9 | La interfaz auto-rellena el patientId tras un claim exitoso para evitar copia manual del identificador por el medico. |
| CA-003.10 | Cada operacion medica genera un evento de dominio inmutable, persistido en el Event Store y despachado via Outbox a RabbitMQ. |

### Version refinada

**Como** medico,
**quiero** reclamar al siguiente paciente aprobado desde mi consultorio activo, llamarlo a consulta, completar su atencion registrando el resultado clinico, o marcarlo como ausente,
**para que** el flujo clinico se complete con trazabilidad total en el Event Store, el paciente sea atendido o gestionado segun la politica de ausencias (maximo 1 reintento antes de cancelacion automatica) y se cumplan los requisitos de auditoria y proteccion de datos.

**Criterios de aceptacion refinados:**

| ID | Criterio |
|----|----------|
| CA-003.1 | El medico puede reclamar (claim) al siguiente paciente en estado EnEsperaConsulta. El sistema selecciona automaticamente por prioridad descendente y hora de check-in ascendente. Si no hay pacientes disponibles, retorna HTTP 409 con mensaje indicando que la cola de consulta esta vacia. |
| CA-003.2 | Solo se puede reclamar un paciente si no hay otro en atencion activa en la misma cola. Si ya hay uno activo, retorna HTTP 409 indicando que existe una atencion en curso. |
| CA-003.3 | El claim solo se permite desde un consultorio activo (previamente activado por un administrador). Si el consultorio esta desactivado, retorna HTTP 409 indicando el identificador del consultorio y que no esta activo. |
| CA-003.4 | El medico puede llamar al paciente reclamado (call), transicionandolo de estado LlamadoConsulta a EnConsulta. Si el paciente no esta en estado LlamadoConsulta, retorna HTTP 409 con el estado actual. |
| CA-003.5 | Al completar la atencion, el medico puede registrar un resultado clinico (outcome, texto libre) y notas opcionales. El paciente transiciona a estado Finalizado (estado terminal). Si el paciente no esta en estado EnConsulta, retorna HTTP 409. |
| CA-003.6 | El medico puede marcar ausencia en consultorio. Se permite 1 reintento: tras la primera ausencia el paciente retorna a estado EnEsperaConsulta y puede ser reclamado de nuevo. Si se excede el reintento, el paciente se cancela automaticamente con estado CanceladoPorAusencia (estado terminal). |
| CA-003.7 | Solo los roles Doctor y Admin pueden ejecutar operaciones medicas. Otros roles reciben HTTP 403 con mensaje de acceso denegado. Los intentos no autorizados se registran en el log de auditoria. |
| CA-003.8 | Los consultorios (CONS-01 a CONS-04) pueden activarse y desactivarse exclusivamente por un administrador. Un consultorio ya activo no puede activarse de nuevo; uno ya inactivo no puede desactivarse de nuevo. Solo los consultorios activos participan en el flujo de claim. |
| CA-003.9 | La interfaz auto-rellena el patientId tras un claim exitoso para evitar copia manual del identificador. Este comportamiento es una mejora de UX y puede deshabilitarse sin afectar la funcionalidad del backend. |
| CA-003.10 | Cada operacion medica genera un evento de dominio inmutable (PatientClaimedForAttention, PatientCalled, PatientAttentionCompleted, PatientAbsentAtConsultation, PatientCancelledByAbsence, ConsultingRoomActivated, ConsultingRoomDeactivated) que se persiste en el Event Store y se despacha via Outbox. |
| CA-003.11 | En caso de fallo de infraestructura durante una operacion medica, el sistema retorna HTTP 503. Los eventos pendientes en la Outbox se reintentan automaticamente por el Worker. |
| CA-003.12 | Los datos clinicos del paciente (nombre, cedula, resultado de atencion) no se exponen en los logs del sistema. La trazabilidad de la operacion se mantiene mediante correlation_id y actor. |

### Cuadro de diferencias

| Aspecto | Version original | Version refinada | Tipo de cambio |
|---------|-----------------|-----------------|----------------|
| Titulo de la HU | "Atencion medica en consultorio" (generico) | Se recomienda ajustar a "Gestion integral de paciente en consultorio medico" para mayor especificidad | Recomendacion |
| Descripcion de la HU | Generica, no menciona limites ni trazabilidad especifica | Detalla la politica de ausencias (max 1 reintento), trazabilidad en Event Store y proteccion de datos | Clarificacion |
| Cola vacia (CA-003.1) | No se describe que ocurre si no hay pacientes disponibles | Retorna HTTP 409 con mensaje explicativo | Adicion |
| Atencion activa duplicada (CA-003.2) | "El sistema rechaza" sin detalle | Retorna HTTP 409 indicando que existe una atencion en curso | Clarificacion |
| Consultorio desactivado (CA-003.3) | "El sistema rechaza la operacion" | Retorna HTTP 409 indicando el identificador del consultorio y su estado | Clarificacion |
| Transicion invalida al llamar (CA-003.4) | No se detalla que ocurre si el estado no es el esperado | Retorna HTTP 409 con el estado actual del paciente | Adicion |
| Resultado clinico (CA-003.5) | "Outcome y notas opcionales" sin definir formato | Se define como texto libre; se explicita que Finalizado es estado terminal | Clarificacion |
| Retorno tras ausencia (CA-003.6) | "1 reintento" sin detallar a donde retorna | Se explicita que retorna a EnEsperaConsulta para ser reclamado de nuevo | Clarificacion |
| Auditoria de intentos no autorizados (CA-003.7) | No mencionada | Los intentos con rol no autorizado se registran en el log | Adicion |
| Doble activacion/desactivacion (CA-003.8) | No se contempla intento de activar un consultorio ya activo | Se explicita que no se puede activar uno ya activo ni desactivar uno ya inactivo | Clarificacion |
| Auto-relleno como mejora de UX (CA-003.9) | Presentado como criterio funcional | Se aclara que es una mejora de UX desacoplable del backend | Clarificacion |
| Proteccion de datos clinicos (CA-003.12) | No mencionada | Nuevo criterio: datos clinicos no se exponen en logs | Adicion |
| Fallo de infraestructura (CA-003.11) | No contemplado | Nuevo criterio: HTTP 503, reintento automatico via Worker | Adicion |
| Tamano de la HU (INVEST) | Una sola historia con 4 operaciones (claim, call, complete, absent) | Se recomienda considerar division: "Reclamar y llamar paciente", "Completar atencion", "Gestionar ausencias en consultorio" | Recomendacion |

---

## Resumen ejecutivo

| Dimension | HU-001 (Check-in) | HU-002 (Caja) | HU-003 (Consultorio) |
|-----------|-------------------|---------------|----------------------|
| Claridad original | Alta | Media-alta | Media |
| Ambiguedades detectadas | 6 | 5 | 5 |
| Criterios originales | 10 | 10 | 10 |
| Criterios refinados | 11 (+1) | 12 (+2) | 12 (+2) |
| INVEST - Independiente | Cumple | Cumple parcialmente | Cumple |
| INVEST - Negociable | Parcial | Cumple | Parcial |
| INVEST - Valiosa | Cumple | Cumple | Cumple |
| INVEST - Estimable | Cumple | Cumple | Cumple |
| INVEST - Pequena | Cumple | Parcial (divisible) | Parcial (divisible) |
| INVEST - Testeable | Cumple | Cumple | Cumple |
| Coherencia con el proyecto | Alta | Alta | Alta |
| Cambios tipo Clarificacion | 5 | 6 | 7 |
| Cambios tipo Adicion | 4 | 4 | 4 |
| Cambios tipo Recomendacion | 0 | 1 | 2 |
| Prioridad de refinamiento | Baja | Media | Media |

**Hallazgos transversales a las 3 historias:**

1. **Codigos HTTP y mensajes de error:** Ninguna version original especificaba los codigos de respuesta HTTP por escenario. Las versiones refinadas definen HTTP 400 (validacion), 403 (autorizacion), 409 (conflicto de negocio) y 503 (infraestructura).
2. **Proteccion de datos personales:** Las versiones originales no mencionaban el tratamiento de datos sensibles en logs ni en respuestas de la API. Las versiones refinadas incorporan criterios explicitos de no exposicion de PII.
3. **Fallos de infraestructura:** Ninguna version original contemplaba el escenario de indisponibilidad de base de datos o mensajeria. Las versiones refinadas agregan un criterio dedicado con HTTP 503 y reintento automatico.
4. **Tamano (INVEST):** Las HU-002 y HU-003 son amplias y podrian dividirse en sub-historias para entrega incremental.
5. **Auditoria de intentos no autorizados:** Las versiones originales solo indicaban rechazo; las refinadas agregan registro en log de auditoria.
