# Casos de prueba generados por IA

> Escenarios BDD inferidos desde el comportamiento real del sistema, con foco en recepción, caja, consulta y riesgos operativos.

---

## 1. Feature: registro clínico en recepción

```gherkin
Feature: Registro clínico de pacientes en recepción
 Como recepcionista
 Quiero registrar pacientes con identidad consistente
 Para iniciar el flujo clínico sin duplicidades

 Background:
  Given existe una cola operativa disponible
  And el usuario autenticado tiene rol de recepción
  And la solicitud incluye una clave de idempotencia válida

 Scenario: Registro exitoso de un paciente nuevo
  When la recepcionista registra un paciente con identificación única y datos válidos
  Then el sistema acepta el registro
  And genera una referencia de cola operativa
  And deja al paciente en estado inicial de espera administrativa

 Scenario: Rechazo por conflicto de identidad clínica
  Given ya existe un paciente con la misma identificación y un nombre distinto
  When la recepcionista intenta registrar nuevamente al paciente
  Then el sistema responde conflicto de identidad
  And no crea un nuevo ingreso clínico

 Scenario Outline: Validaciones de frontera para identificación del paciente
  When la recepcionista registra un paciente con identificación "<identificacion>"
  Then el sistema responde "<resultado>"

  Examples:
   | identificacion          | resultado |
   | A1                      | rechazo   |
   | ABC-123                 | aceptación |
   | ABCDEFGHIJKLMNOPQRSTU   | rechazo   |

 Scenario: Reintento idempotente del mismo check-in
  Given la primera solicitud ya fue aceptada
  When el cliente reenvía exactamente la misma operación con la misma clave de idempotencia
  Then el sistema devuelve la misma respuesta funcional
  And no duplica el paciente en la cola

 Scenario: Rechazo por rol no autorizado
  Given el usuario autenticado tiene rol de caja
  When intenta registrar un paciente en recepción
  Then el sistema rechaza la operación por autorización

 Scenario: Elevación automática de prioridad por condición clínica
  When la recepcionista registra un paciente embarazado con prioridad normal
  Then el sistema conserva el registro
  And la prioridad operativa resultante es alta
```

## 2. Feature: gestión administrativa de caja

```gherkin
Feature: Gestión administrativa en caja
 Como cajero
 Quiero operar el siguiente paciente pendiente de pago
 Para permitir o bloquear su avance a consulta

 Background:
  Given existe una cola con pacientes pendientes de caja
  And el usuario autenticado tiene rol de caja
  And la solicitud incluye una clave de idempotencia válida

 Scenario: Llamado exitoso del siguiente paciente elegible
  When caja solicita el siguiente paciente
  Then el sistema asigna un único paciente activo en caja
  And devuelve el identificador del paciente llamado

 Scenario: Validación exitosa del pago
  Given existe un paciente activo en caja
  When caja valida el pago del paciente activo
  Then el sistema mueve al paciente a espera de consulta
  And libera el estado activo de caja

 Scenario Outline: Pago pendiente hasta el umbral máximo
  Given existe un paciente activo en caja
  And el paciente acumula <intentosPrevios> intentos pendientes
  When caja marca nuevamente el pago como pendiente
  Then el resultado es "<resultado>"

  Examples:
   | intentosPrevios | resultado |
   | 0               | aceptación |
   | 1               | aceptación |
   | 2               | aceptación |
   | 3               | rechazo   |

 Scenario: Cancelación por impago tras máximo de intentos
  Given existe un paciente activo en caja con el máximo de intentos pendientes alcanzado
  When caja cancela la gestión por impago
  Then el sistema retira al paciente del flujo activo
  And registra la cancelación administrativa

 Scenario: Rechazo por operar sobre paciente no activo
  Given existe un paciente activo en caja
  When caja intenta validar el pago de un paciente distinto
  Then el sistema rechaza la operación por transición inválida

 Scenario: Concurrencia en llamado de caja
  Given dos operadores ejecutan el llamado siguiente casi al mismo tiempo
  When ambas solicitudes llegan a la API
  Then solo una solicitud obtiene el paciente activo
  And la otra recibe conflicto o rechazo coherente
```

## 3. Feature: atención médica y continuidad por consultorio

```gherkin
Feature: Atención médica por consultorio
 Como médico
 Quiero gestionar el siguiente paciente elegible desde un consultorio activo
 Para completar la atención clínica con trazabilidad

 Background:
  Given existe una cola con pacientes en espera de consulta
  And el usuario autenticado tiene rol médico
  And la solicitud incluye una clave de idempotencia válida

 Scenario: Activación exitosa de consultorio
  When el médico activa un consultorio disponible
  Then el sistema deja la estación en estado activo

 Scenario: Rechazo al reclamar siguiente paciente sin consultorio activo
  Given no existe ningún consultorio activo
  When el médico solicita el siguiente paciente
  Then el sistema rechaza la operación
  And explica que se requiere una estación activa

 Scenario: Reclamación y llamado del siguiente paciente
  Given existe al menos un consultorio activo
  When el médico reclama el siguiente paciente elegible
  Then el sistema asigna un paciente activo de consulta
  When el médico llama al paciente reclamado
  Then el sistema mantiene la trazabilidad del turno médico

 Scenario: Finalización exitosa de consulta
  Given existe un paciente activo en consulta
  When el médico finaliza la atención con un resultado clínico
  Then el sistema retira al paciente de la cola activa
  And agrega el evento al historial reciente

 Scenario: Cancelación por ausencia en consulta tras reintentos
  Given existe un paciente reclamado para consulta
  And el paciente ya acumuló el máximo de ausencias permitidas
  When el médico marca una nueva ausencia
  Then el sistema cancela la atención por ausencia

 Scenario: Respuesta degradada del monitor ante proyección inconsistente
  Given la proyección no refleja inmediatamente el estado más reciente
  When el dashboard consulta monitor y cola repetidamente
  Then el sistema expone una señal de degradación o necesidad de refresco
  And no inventa un turno inexistente
```

## 2. Ajustes humanos de QA

| AI Generated Test | Missing Risk | Tester Adjustment | Technical Justification |
| --- | --- | --- | --- |
| Registro exitoso de un paciente nuevo | Consistencia transaccional entre evento y outbox | Verificar que la respuesta exitosa tenga persistencia en event store y mensaje en outbox dentro de la misma unidad transaccional | El flujo real usa Event Sourcing más Outbox; un éxito parcial compromete recuperación y auditoría |
| Reintento idempotente del mismo check-in | Reuso indebido de clave con payload distinto | Añadir prueba donde la misma clave de idempotencia llegue con cuerpo modificado y se valide el comportamiento esperado | La idempotencia debe proteger contra duplicados, pero también contra colisiones semánticas |
| Llamado exitoso del siguiente paciente elegible | Condición de carrera entre dos cajeros | Ejecutar prueba concurrente con dos solicitudes simultáneas y verificar exclusión mutua | El backend controla conflicto de concurrencia en persistencia de eventos |
| Validación exitosa del pago | Latencia en proyección de cola y siguiente turno | Añadir aserciones con espera acotada sobre la actualización del dashboard | El sistema combina write model, worker y proyecciones, por lo que la consistencia es eventual |
| Reclamación y llamado del siguiente paciente | Asignación de consultorio incorrecto en autoasignación | Validar cuál consultorio activo fue elegido y que no existan dos pacientes activos para la misma estación | El command handler médico autoasigna estación cuando no se informa explícitamente |
| Finalización exitosa de consulta | Integridad del historial reciente | Confirmar que el paciente desaparece de la cola y aparece en historial sin duplicación | El read side debe reflejar estados terminales y preservar trazabilidad |
| Rechazo por rol no autorizado | Token local no equivalente a autenticación corporativa | Ejecutar pruebas con token inválido, token expirado y header de rol sin token en ambiente equivalente a producción | El frontend actual crea sesión local y puede ocultar huecos de seguridad si no se valida el backend real |
| Login operativo exitoso | Sesión frontend desvinculada del backend | Verificar que recepción, caja, médico y administración obtienen JWT real desde `/api/auth/token` y que la UI no depende de `X-User-Role` | El flujo de autenticación debe probar el contrato real entre frontend y backend antes de validar autorización clínica |
| Respuesta degradada del monitor ante proyección inconsistente | Persistencia nula de proyecciones en reinicio | Añadir prueba de recuperación posterior a reinicio o rebuild de proyección | Las proyecciones actuales son en memoria y pueden perderse tras reinicio |
