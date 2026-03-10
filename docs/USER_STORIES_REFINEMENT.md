# Refinamiento de historias de usuario

> Historias de usuario inferidas desde el comportamiento real del sistema y refinadas con criterios INVEST orientados a automatización y auditoría.

---

## 1. Resumen de historias refinadas

| HU Original | HU Refinada | Mejoras para Automatización | Diferencias Detectadas |
| --- | --- | --- | --- |
| Como recepcionista, quiero registrar un paciente para que ingrese a la atención clínica. | Como recepcionista, quiero registrar un paciente con identidad validada y prioridad clínica consistente para que el flujo posterior no se contamine con duplicados ni datos contradictorios. | La historia se descompone en validaciones observables: identidad, duplicado, prioridad, idempotencia y respuesta operativa. | El sistema real genera la cola desde backend y no depende del cliente para asignar `queueId`. |
| Como cajero, quiero gestionar el siguiente paciente pendiente de pago para que solo avance a consulta quien cumpla la validación administrativa. | Como cajero, quiero llamar, validar, diferir o cancelar la gestión de pago del paciente activo para que la transición hacia consulta refleje el resultado administrativo real. | La historia permite automatizar estados, reintentos, límites y errores de autorización. | El flujo real impone máximo de tres intentos de pago y un único paciente activo en caja. |
| Como médico, quiero gestionar la atención del siguiente paciente elegible para consulta para que la sala avance sin conflictos de estación ni estados inválidos. | Como médico, quiero activar consultorios, reclamar el siguiente paciente elegible y cerrar la atención con resultado clínico o ausencia para que la operación médica mantenga trazabilidad y continuidad. | La historia habilita automatización por consultorio activo, transición de estados, concurrencia y validación de proyección. | El sistema real exige consultorio activo y maneja cancelación por ausencia tras reintentos limitados. |

## 2. Historia 1: recepción

### 2.1 Historia refinada

Como recepcionista
Quiero registrar un paciente con identidad clínica consistente y prioridad validada
Para que la sala de espera inicie el flujo asistencial sin duplicidades ni ambigüedades

### 2.2 Evaluación INVEST

- Independent: sí, porque puede ejecutarse sin requerir cierre de caja o consulta.
- Negotiable: sí, porque admite reglas parametrizables sobre prioridad y campos opcionales.
- Valuable: sí, porque habilita todo el flujo clínico posterior.
- Estimable: sí, porque sus reglas están acotadas por validaciones claras.
- Small: sí, si se limita a alta del paciente y respuesta operativa.
- Testable: sí, por criterios de aceptación y reglas de error observables.

### 2.3 Criterios de aceptación

1. Debe registrarse un paciente válido con identificación, nombre, prioridad y tipo de consulta.
2. Debe rechazarse un paciente duplicado dentro de la misma cola activa.
3. Debe rechazarse un conflicto de identidad cuando el mismo identificador llegue con nombre divergente.
4. Debe generarse una respuesta idempotente cuando el mismo comando se reintente con la misma clave.
5. Debe asignarse la cola desde backend cuando el cliente no la provea.

### 2.4 Casos de seguridad

- Solo un rol autorizado de recepción o administración debe poder ejecutar el registro.
- Para roles operativos no paciente, la autenticación debe derivar de un token emitido por el backend y no de una sesión local simulada.
- Debe invalidarse la solicitud si falta la clave de idempotencia.
- Debe registrarse correlación suficiente para rastrear errores sin exponer datos sensibles.

### 2.5 Expectativas de rendimiento

- La respuesta del registro debe ser suficientemente rápida para no bloquear la atención en ventanilla.
- La repetición del mismo comando no debe duplicar pacientes ni degradar la estabilidad operativa.

### 2.6 Escenarios de fallo

- Conflicto de identidad clínica.
- Cola al máximo de capacidad.
- Duplicado del paciente.
- Error de autorización o ausencia de autenticación.
- Error transitorio de persistencia con reintento del cliente.

### 2.7 Condiciones de borde

- Identificación en longitud mínima y máxima permitida.
- Prioridad elevada por embarazo.
- Prioridad elevada por edad extrema.
- Notas opcionales nulas.

## 3. Historia 2: caja

### 3.1 Historia refinada

Como cajero
Quiero gestionar el paciente activo de caja mediante validación, diferimiento, ausencia o cancelación
Para que solo avancen a consulta los pacientes administrativamente habilitados

### 3.2 Evaluación INVEST

- Independent: sí, porque opera sobre pacientes ya registrados.
- Negotiable: sí, porque el tratamiento del pago pendiente puede variar sin romper el objetivo.
- Valuable: sí, porque protege la transición entre recepción y consulta.
- Estimable: sí, por estados y límites definidos.
- Small: sí, si se implementa sobre un paciente activo por vez.
- Testable: sí, mediante estados, reintentos y respuestas HTTP.

### 3.3 Criterios de aceptación

1. Debe llamarse al siguiente paciente elegible para caja respetando prioridad y orden.
2. Debe permitirse validar el pago del paciente activo y moverlo a espera de consulta.
3. Debe permitirse marcar pago pendiente mientras no se exceda el máximo de intentos.
4. Debe impedirse cancelar por impago antes de alcanzar el límite de intentos configurado.
5. Debe impedirse operar sobre un paciente que no sea el activo de caja.

### 3.4 Casos de seguridad

- Solo caja o administración debe poder ejecutar comandos de esta historia.
- La autorización debe validarse con JWT emitido por backend para evitar equivalencias falsas entre UI y API.
- El sistema debe rechazar tokens inválidos, roles insuficientes o solicitudes sin autenticación.
- Debe rechazarse la manipulación de un paciente distinto al actualmente activo.

### 3.5 Expectativas de rendimiento

- La selección del siguiente paciente no debe bloquear la operación de caja en escenarios nominales.
- Las operaciones de pago no deben crear estados concurrentes para dos pacientes activos.

### 3.6 Escenarios de fallo

- No hay pacientes disponibles para caja.
- Ya existe un paciente activo en caja.
- Se excede el máximo de intentos de pago.
- Se intenta cancelar antes del umbral permitido.
- Se intenta actuar sobre un paciente inexistente o no activo.

### 3.7 Condiciones de borde

- Tercer intento de pago pendiente.
- Segundo reintento por ausencia en caja.
- Cola vacía.
- Paciente con prioridad alta al frente de la selección.

## 4. Historia 3: consulta médica

### 4.1 Historia refinada

Como médico
Quiero activar consultorios, reclamar el siguiente paciente elegible y cerrar la atención con resultado clínico o ausencia
Para que la operación médica conserve trazabilidad, capacidad y continuidad por estación

### 4.2 Evaluación INVEST

- Independent: sí, porque depende de pacientes ya validados por caja y de consultorios activos.
- Negotiable: sí, porque el detalle del resultado clínico puede variar sin alterar el flujo principal.
- Valuable: sí, porque representa la entrega asistencial del proceso.
- Estimable: sí, por depender de un conjunto finito de transiciones.
- Small: sí, si se limita a una estación y un paciente activo.
- Testable: sí, por estados, permisos y condiciones de estación.

### 4.3 Criterios de aceptación

1. Debe activarse un consultorio antes de reclamar pacientes para atención.
2. Debe reclamarse el siguiente paciente elegible respetando prioridad y orden de ingreso.
3. Debe poder llamarse al paciente reclamado e iniciar la consulta.
4. Debe cerrarse la atención con resultado clínico y retiro del paciente de la cola activa.
5. Debe cancelarse por ausencia cuando se superen los reintentos permitidos.

### 4.4 Casos de seguridad

- Solo médico o administración debe operar la estación médica.
- La identidad operativa del médico debe provenir de autenticación backend verificable, no de un rol local en navegador.
- Debe impedirse reclamar pacientes si no existe consultorio activo.
- Debe impedirse completar o marcar ausencia sobre un paciente distinto al activo.

### 4.5 Expectativas de rendimiento

- La actualización del siguiente turno debe reflejarse en monitor y cola con latencia operativa aceptable.
- La operación no debe asignar simultáneamente dos pacientes al mismo estado activo.

### 4.6 Escenarios de fallo

- No existen consultorios activos.
- No hay pacientes elegibles en espera de consulta.
- Se intenta cerrar una atención en estado inválido.
- La proyección no refleja inmediatamente el cambio y requiere reprocesamiento.

### 4.7 Condiciones de borde

- Primer consultorio activado en una cola sin actividad previa.
- Paciente único restante en espera de consulta.
- Segundo evento de ausencia en consulta, que debe terminar en cancelación.
- Reclamación sin `stationId`, con autoasignación del consultorio activo disponible.
