# Contexto de negocio

> Reconstrucción del contexto de negocio inferido desde la implementación real del repositorio RLAPP.

---

## 1. Propósito del negocio

RLAPP es un sistema de operación clínica para una sala de espera médica. Su propósito es coordinar, con trazabilidad y control de estado, el recorrido de un paciente desde recepción hasta caja y atención médica, evitando duplicidades, inconsistencias de identidad y errores de transición entre etapas operativas.

El backend implementa este propósito como una secuencia de eventos de dominio persistidos en PostgreSQL. El frontend organiza la operación por vistas de rol y consume comandos y consultas del backend para soportar trabajo en tiempo real.

## 2. Roles de usuario inferidos

| Rol | Objetivo operativo | Evidencia funcional inferida |
| --- | --- | --- |
| Paciente | Consultar el estado visible de turnos o pantallas públicas. | Existe rol `patient` en frontend y rutas de display. |
| Recepción | Registrar pacientes en la cola clínica. | Flujo de check-in con datos demográficos y clínicos básicos. |
| Caja | Llamar pacientes, validar pago, dejar pago pendiente, marcar ausencias y cancelar por impago. | Flujo explícito de caja en backend y frontend. |
| Médico | Activar consultorios, reclamar siguiente paciente, iniciar y finalizar consulta, gestionar ausencias. | Flujo clínico explícito en aggregate y UI médica. |
| Administrador | Supervisar y operar múltiples vistas o estaciones. | El backend y frontend contemplan acceso ampliado por rol `Admin`. |

## 3. Entidades y conceptos de dominio

| Concepto | Significado de negocio |
| --- | --- |
| Waiting queue | Cola operativa donde viven los estados del paciente durante el proceso clínico. |
| Patient identity | Identidad clínica global asociada a `patientId`; no puede cambiar de nombre sin conflicto explícito. |
| Waiting patient | Representación operativa del paciente dentro de la cola. |
| Consulting room | Consultorio que debe estar activo antes de asignar atención médica. |
| Event store | Fuente de verdad histórica de la operación clínica. |
| Projection | Vista de lectura para dashboards, cola, siguiente turno e historial reciente. |
| Idempotency record | Garantía de que una misma orden clínica o administrativa no se procese dos veces. |

## 4. Flujos principales del negocio

### 4.1 Registro de paciente en recepción

Recepción registra al paciente con identificación, nombre, prioridad, tipo de consulta y metadatos opcionales. Si no se envía `queueId`, el backend genera uno. Antes de aceptar el ingreso, el sistema valida unicidad clínica de `patientId`, capacidad de la cola y ausencia de duplicado dentro de la misma cola.

### 4.2 Gestión de pago en caja

Caja llama al siguiente paciente elegible, valida el pago o lo deja pendiente. Si el paciente no atiende el llamado, puede registrarse ausencia. Si acumula intentos pendientes de pago hasta el máximo permitido, el flujo permite cancelación por impago.

### 4.3 Gestión de atención médica

Una vez validado el pago, el paciente pasa a estado de espera para consulta. El personal médico debe activar un consultorio, reclamar al siguiente paciente elegible, llamarlo, iniciar la atención y cerrarla con resultado clínico. Si el paciente no se presenta, el sistema permite reintentos controlados y posterior cancelación por ausencia.

### 4.4 Monitoreo operativo

El sistema expone vistas para monitor de sala, estado detallado de la cola, siguiente turno e historial reciente. El frontend combina polling periódico con SignalR para reducir latencia de actualización y reflejar cambios de comando sobre la operación activa.

## 5. Reglas de negocio inferidas

1. La identidad clínica del paciente se controla por `patientId` y nombre canónico; el mismo identificador con nombre distinto produce conflicto.
2. La cola no puede exceder su capacidad máxima.
3. Un paciente no puede registrarse dos veces en la misma cola activa.
4. Solo puede existir un paciente activo simultáneo en caja por cola.
5. Solo puede existir un paciente activo simultáneo en atención médica por cola.
6. El consultorio debe estar activo antes de reclamar al siguiente paciente para consulta.
7. La prioridad clínica puede elevarse automáticamente cuando la paciente está embarazada o cuando la edad es menor de 18 o mayor de 65 años.
8. El pago pendiente tiene máximo de tres intentos antes de habilitar cancelación por impago.
9. La ausencia en caja tiene máximo de dos reintentos antes de escalar a otro resultado operativo.
10. La ausencia en consulta tiene máximo de un reintento antes de cancelación por ausencia.
11. Toda operación de escritura requiere una clave de idempotencia para evitar reprocesamiento.
12. Las consultas operativas no leen del modelo de escritura sino de proyecciones denormalizadas.

## 6. Restricciones y supuestos operativos

| Restricción | Implicación de negocio |
| --- | --- |
| Las proyecciones actuales son en memoria. | Un reinicio puede degradar la continuidad visual hasta reprocesar eventos. |
| El frontend ya solicita JWT reales para roles operativos, pero el backend conserva un fallback por header para compatibilidad local. | La seguridad productiva depende de retirar o controlar estrictamente ese modo de compatibilidad en entornos no locales. |
| El backend combina JWT con fallback por header para desarrollo. | Existe riesgo de desalineación entre entorno local y entorno productivo. |
| El dashboard depende de polling más eventos push. | La frescura operativa depende tanto de red como de salud de proyecciones. |

## 7. Riesgos de calidad para el negocio

| Riesgo | Impacto de negocio |
| --- | --- |
| Uso residual del fallback por header en backend | Puede reintroducir diferencias entre ambientes si no se restringe a desarrollo controlado. |
| Extensión futura del dominio sin actualización simultánea del read side | Nuevos eventos podrian volver a degradar la consistencia del dashboard si no se agregan handlers y pruebas en paralelo. |
| Proyecciones volátiles en memoria | Riesgo de inconsistencia temporal después de reinicios o fallos. |
| Endpoints y composición concentrados en un `Program.cs` extenso | Eleva el costo de cambio y aumenta el riesgo de regresiones operativas. |
| Orquestación repetitiva en command handlers | Incrementa posibilidad de divergencia entre casos de uso equivalentes. |

## 8. Operaciones críticas

Las operaciones críticas del sistema son:

- registro clínico inicial del paciente;
- validación de identidad clínica;
- llamado y validación de pago;
- transición de caja a consulta;
- asignación de consultorio activo;
- finalización o cancelación controlada de la atención;
- actualización consistente del monitor operativo;
- prevención de duplicados mediante idempotencia.
