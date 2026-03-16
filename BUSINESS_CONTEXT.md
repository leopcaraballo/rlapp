# Contexto de negocio — RLAPP

## 1. Descripcion del proyecto

- **Nombre del proyecto:** RLAPP — Sistema de gestion de sala de espera medica.
- **Objetivo del proyecto:** Automatizar el flujo operacional completo de una sala de espera clinica — desde el registro del paciente en recepcion, pasando por el cobro en caja, hasta la atencion medica en consultorio — proporcionando trazabilidad total mediante Event Sourcing, notificaciones en tiempo real via SignalR y un tablero operativo para monitoreo de KPIs clinicos.

## 2. Flujos criticos del negocio

- **Principales flujos de trabajo:** El sistema soporta una maquina de estados con 13 estados y transiciones controladas por invariantes de dominio. Los flujos clave son:
  1. **Registro / Check-in en recepcion** — El recepcionista ingresa cedula, nombre, prioridad (Low, Medium, High, Urgent), tipo de consulta (General, Specialist, Emergency) y notas opcionales. Campos opcionales: edad e indicador de embarazo (para escalar prioridad administrativa). El paciente se asigna a la cola por defecto (`QUEUE-01`) y entra en estado `EnEsperaTaquilla`.
  2. **Atencion en caja** — El cajero llama al siguiente paciente (ordenado por prioridad descendente y hora de check-in ascendente). El cajero puede: validar el pago (referencia obligatoria, paciente avanza a `EnEsperaConsulta`), marcar pago pendiente (maximo 3 intentos con razon obligatoria), marcar ausente en caja (maximo 2 reintentos, retorna a cola) o cancelar por pago (solo tras agotar los 3 intentos).
  3. **Atencion medica en consultorio** — El medico reclama al siguiente paciente desde un consultorio activo. Solo puede haber un paciente en atencion activa a la vez. El medico puede: completar la atencion (outcome y notas opcionales → estado `Finalizado`) o marcar ausente en consultorio (1 reintento; si se excede → `CanceladoPorAusencia`).
  4. **Notificaciones en tiempo real** — Actualizacion de turnos y estados de pacientes via SignalR/WebSocket para todas las estaciones operativas.
  5. **Monitoreo operativo** — Dashboard con KPIs clinicos, historial de atenciones completadas y estado de cola en tiempo real.

- **Modulos o funcionalidades criticas:**
  - **Recepcion (Check-in):** Formulario de registro con validacion, asignacion a cola y prioridad automatica.
  - **Caja (Cashier):** Llamar siguiente paciente, validar pago, marcar pendiente, marcar ausencia y cancelar por pago.
  - **Consultorio medico:** Reclamar paciente, llamar a consulta, completar atencion y marcar ausencia.
  - **Gestion de consultorios:** Activar y desactivar consultorios (CONS-01 a CONS-04).
  - **Display de turnos:** Pantalla publica de turnos en tiempo real con prioridad y estado de cada paciente.
  - **Dashboard operativo:** Panel con turnos en tiempo real incluyendo historial de atenciones completadas.
  - **Proyecciones y consultas:** Monitor KPI, estado de cola, proximo turno e historial reciente (modelo de lectura CQRS).
  - **Worker Outbox:** Despacho asincrono de eventos del Event Store a RabbitMQ.
  - **Idempotencia:** Deduplicacion de requests con TTL de 24 horas para garantizar que reintentos no generen duplicados.
  - **Observabilidad:** Metricas HTTP (Prometheus), logs estructurados (Serilog a Seq) y monitoreo de lag de eventos.

## 3. Reglas de negocio y restricciones

- **Reglas de negocio relevantes:**
  1. La cola no puede exceder su capacidad maxima configurada.
  2. Un paciente no puede registrarse dos veces en la misma cola activa (validacion por cedula/PatientId).
  3. Solo se admiten prioridades validas: Low, Medium, High, Urgent.
  4. Solo se admiten tipos de consulta validos: General, Specialist, Emergency.
  5. Solo un paciente puede estar en atencion medica activa a la vez por cola.
  6. Solo un paciente puede estar en proceso de caja activo a la vez por cola.
  7. El pago pendiente tiene un maximo de 3 intentos antes de permitir la cancelacion.
  8. La ausencia en caja permite un maximo de 2 reintentos (luego el paciente queda cancelable por el cajero).
  9. La ausencia en consultorio permite 1 reintento; al excederlo, el paciente se cancela automaticamente por ausencia.
  10. Los consultorios deben estar activos para que un medico pueda reclamar pacientes.
  11. Las transiciones de estado son estrictas: solo se admite la transicion desde el estado inmediatamente previo que sea valido.
  12. Todos los eventos son inmutables y versionados (control de concurrencia optimista por aggregate_id + version).
  13. El check-in es idempotente: reintentos con la misma clave de idempotencia retornan la respuesta original cacheada.
  14. Los pacientes en la cola se ordenan por prioridad descendente (Urgent > High > Medium > Low) y hora de check-in ascendente (FIFO dentro de la misma prioridad).

- **Regulaciones o normativas:**
  - Cumplimiento de legislacion de proteccion de datos personales aplicable (almacenamiento seguro de nombres y cedulas de pacientes en PostgreSQL).
  - Registro de auditoria completo: cada evento incluye correlation_id, causation_id, actor, fecha de ocurrencia y version de esquema.
  - Seguridad de infraestructura: contenedores ejecutan como usuario no root, filesystem de solo lectura, sin capabilities del kernel y sin escalamiento de privilegios.
  - Autenticacion JWT con roles diferenciados; el fallback de desarrollo via header debe deshabilitarse en produccion.

## 4. Perfiles de usuario y roles

- **Perfiles o roles de usuario en el sistema:**
  - **Paciente:** Usuario final que visualiza el estado de su turno en la pantalla de display publica. No requiere autenticacion avanzada.
  - **Recepcionista:** Registra pacientes en la cola de espera (check-in), consulta el estado de la cola y accede al dashboard operativo.
  - **Cajero:** Llama al siguiente paciente en cola de caja, valida o marca pagos, gestiona ausencias y cancelaciones por pago.
  - **Medico:** Reclama pacientes aprobados para consultorio, los llama a consulta, completa la atencion o marca ausencias.
  - **Administrador:** Acceso total al sistema. Configura y gestiona consultorios, ejecuta todas las operaciones de cualquier rol y administra el registro de pacientes.

- **Permisos y limitaciones de cada perfil:**
  - **Paciente:** Solo puede ver la pantalla de display de turnos. No puede acceder a recepcion, caja, consultorio, dashboard ni gestion de consultorios.
  - **Recepcionista:** Puede registrar check-ins y ver dashboard. No puede operar caja, consultorio ni gestionar consultorios.
  - **Cajero:** Puede llamar pacientes en caja, validar/marcar pagos y ver dashboard. No puede registrar check-ins, operar consultorio ni gestionar consultorios.
  - **Medico:** Puede reclamar pacientes, llamar a consulta, completar atenciones y ver dashboard. No puede registrar check-ins, operar caja ni gestionar consultorios.
  - **Administrador:** Puede ejecutar todas las acciones del sistema, incluyendo activar/desactivar consultorios, registrar check-ins, operar caja y consultorio, y acceder a todas las rutas.

## 5. Condiciones del entorno tecnico

- **Plataformas soportadas:**
  - Aplicacion web construida con Next.js 16 y React 19 (App Router, CSS Modules). Interfaz en espanol, adaptable a escritorio y dispositivos moviles (responsive).
  - Backend en ASP.NET Core 10.0 con Minimal API y Worker independiente para despacho asincrono de eventos.

- **Tecnologias o integraciones clave:**
  - **Base de datos:** PostgreSQL 16 como Event Store, Outbox, registro de pacientes, tabla de idempotencia y monitoreo de lag.
  - **Mensajeria asincrona:** RabbitMQ 3.12 con topic exchange para publicacion de eventos de dominio.
  - **Tiempo real:** SignalR (ASP.NET) para notificaciones WebSocket al frontend.
  - **Observabilidad:** Prometheus (metricas HTTP y de base de datos), Grafana (dashboards), Seq (logs estructurados via Serilog).
  - **Documentacion API:** Scalar con OpenAPI v1 para interfaz interactiva de documentacion.
  - **Validacion de formularios:** Zod + react-hook-form en el frontend.
  - **Autenticacion:** JWT con generacion de tokens por endpoint dedicado; filtros de autorizacion por rol en cada grupo de endpoints.
  - **Orquestacion:** Docker Compose v5.1 con 10 servicios, healthchecks configurados y seguridad reforzada (non-root, read-only filesystem, cap_drop ALL, no-new-privileges).
  - **Administracion de base de datos:** pgAdmin 4 integrado en el stack Docker.

## 6. Casos especiales o excepciones

- **Escenarios alternos o excepciones que deben considerarse:**
  1. **Idempotencia de check-in:** Si el frontend reintenta un registro con la misma clave de idempotencia, el sistema retorna la respuesta original cacheada sin ejecutar el comando de nuevo. Los registros de idempotencia expiran tras 24 horas.
  2. **Ausencia en caja con reintento:** Si el paciente no se presenta al ser llamado en caja, se marca como ausente y retorna a la cola de espera. Se permiten hasta 2 reintentos; al agotarlos, el paciente queda cancelable por el cajero.
  3. **Pago pendiente con reintento:** El cajero puede marcar el pago como pendiente hasta 3 veces (con razon obligatoria). Tras agotar los intentos, se habilita la cancelacion por incumplimiento de pago.
  4. **Ausencia en consultorio:** El medico puede marcar 1 ausencia. Si el paciente no responde tras el unico reintento, se cancela automaticamente por ausencia.
  5. **Consultorio inactivo:** Si un medico intenta reclamar un paciente desde un consultorio desactivado, el sistema rechaza la operacion.
  6. **Cola llena:** Cuando la cola alcanza su capacidad maxima, ningun check-in adicional es aceptado hasta que se liberen posiciones.
  7. **Paciente duplicado:** Un paciente con la misma cedula no puede registrarse dos veces en la misma cola activa.
  8. **Fallo de infraestructura:** Si el Worker pierde conexion con PostgreSQL o RabbitMQ, registra el error y continua el loop de polling. Los mensajes en la Outbox se reintentan automaticamente.
  9. **Reconstruccion de proyecciones:** Existe un endpoint dedicado para reconstruir las vistas de lectura desde el Event Store, util para recuperacion ante inconsistencias o migraciones de esquema.
