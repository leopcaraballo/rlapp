# Matriz de casos de prueba generados por IA — RLAPP

Documento que consolida los casos de prueba generados por IA para las historias de usuario HU-001 (Registro de paciente en recepcion), HU-002 (Gestion de pago en caja) y HU-003 (Atencion medica en consultorio), basados en los criterios de aceptacion refinados. Incluye la matriz de casos, tecnicas ISTQB aplicadas y la tabla de ajustes realizados por el probador con justificacion tecnica.

---

## 1. Tecnicas de diseno de casos aplicadas (ISTQB)

| Tecnica | Aplicacion en los casos |
|---------|------------------------|
| Particion de equivalencia | Clases validas e invalidas para campos de entrada (cedula, nombre, prioridad, tipo de consulta, referencia de pago, razon de pendiente, outcome clinico) |
| Valores limite | Longitud de cedula (3-20), rango de edad (0-120), notas (max 500), longitud de campos de texto, limites de reintentos (3 pagos, 2 ausencias caja, 1 ausencia consultorio) |
| Transicion de estados | Validacion de transiciones estrictas entre los 13 estados de la maquina de estados del dominio |
| Reglas de negocio | Limites de reintentos, ordenamiento por prioridad, capacidad de cola, cancelacion condicionada |
| Roles y permisos | Verificacion de acceso por rol (Receptionist, Cashier, Doctor, Admin) con HTTP 403 para no autorizados |
| Combinaciones / Tabla de decision | Flujos completos multi-paso, combinaciones de operaciones validas desde distintos estados |
| Idempotencia | Reintentos con misma clave de idempotencia retornan respuesta cacheada |
| Recuperacion ante fallos | Comportamiento ante indisponibilidad de infraestructura (HTTP 503, reintento via Outbox) |
| Auditoria y cumplimiento | No exposicion de PII en logs, registro de intentos no autorizados |

---

## 2. Casos de prueba en Gherkin — HU-001: Registro de paciente en recepcion (Check-in)

### CA-001.1: Validacion de campos requeridos y opcionales (particion de equivalencia, valores limite)

```gherkin
# TC-001.01 — Registro exitoso con todos los campos validos
Escenario: Registro exitoso con campos minimos y opcionales
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula valida de 10 caracteres alfanumericos
  Y un nombre completo de al menos 2 caracteres
  Y selecciono la prioridad "High"
  Y selecciono el tipo de consulta "General"
  Y especifico una edad de 35
  Y selecciono el indicador de embarazo como falso
  Y escribo una nota de 300 caracteres
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200
  Y el paciente es asignado a la cola "QUEUE-01" en estado EnEsperaTaquilla

# TC-001.02 — Registro exitoso solo con campos requeridos
Escenario: Registro exitoso solo con campos requeridos
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula valida de 6 caracteres alfanumericos
  Y un nombre completo de 2 caracteres
  Y selecciono la prioridad "Low"
  Y selecciono el tipo de consulta "Specialist"
  Y dejo los campos edad, embarazo y notas vacios
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.03 — Cedula menor al minimo permitido
Escenario: Cedula menor al minimo permitido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula de 2 caracteres
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la cedula no cumple con la longitud minima

# TC-001.04 — Cedula mayor al maximo permitido
Escenario: Cedula mayor al maximo permitido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula de 21 caracteres
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la cedula excede la longitud maxima

# TC-001.05 — Cedula con caracteres invalidos
Escenario: Cedula con caracteres distintos de letras, numeros y guiones
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula con caracteres especiales no permitidos (distintos de letras, numeros y guiones)
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la cedula contiene caracteres invalidos

# TC-001.06 — Nombre completo menor al minimo
Escenario: Nombre completo menor al minimo permitido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso un nombre completo de 1 caracter
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que el nombre completo no cumple con la longitud minima

# TC-001.07 — Edad fuera de rango inferior
Escenario: Edad fuera de rango inferior
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una edad de -1
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la edad esta fuera del rango permitido

# TC-001.08 — Edad fuera de rango superior
Escenario: Edad fuera de rango superior
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una edad de 121
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la edad esta fuera del rango permitido

# TC-001.09 — Notas supera el maximo de caracteres
Escenario: Notas supera el maximo de caracteres permitido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una nota de 501 caracteres
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la nota excede el limite de caracteres

# TC-001.10 — Campos opcionales vacios aceptados
Escenario: Campos opcionales vacios
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando dejo vacios los campos edad, embarazo y notas
  Y completo los campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.29 — Cedula en limite inferior valido (3 chars)
Escenario: Cedula en limite inferior valido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula de exactamente 3 caracteres alfanumericos
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.30 — Cedula en limite superior valido (20 chars)
Escenario: Cedula en limite superior valido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula de exactamente 20 caracteres alfanumericos
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.31 — Edad en limite inferior valido (0)
Escenario: Edad en limite inferior valido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una edad de 0
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.32 — Edad en limite superior valido (120)
Escenario: Edad en limite superior valido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una edad de 120
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.33 — Notas en limite superior valido (500 chars)
Escenario: Notas en limite superior valido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una nota de exactamente 500 caracteres
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.34 — Cedula con guiones validos
Escenario: Cedula con guiones como caracteres permitidos
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando ingreso una cedula con formato alfanumerico incluyendo guiones
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200
```

### CA-001.2: Validacion de prioridad (particion de equivalencia)

```gherkin
# TC-001.11 — Prioridad invalida
Escenario: Prioridad invalida
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando selecciono una prioridad diferente a Low, Medium, High o Urgent
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la prioridad es invalida
```

### CA-001.3: Validacion de tipo de consulta (particion de equivalencia)

```gherkin
# TC-001.12 — Tipo de consulta invalido
Escenario: Tipo de consulta invalido
  Dado que soy un usuario autenticado con rol de recepcionista
  Y tengo el formulario de check-in abierto
  Cuando selecciono un tipo de consulta diferente a General, Specialist o Emergency
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que el tipo de consulta es invalido
```

### CA-001.4: Paciente duplicado en la misma cola (regla de negocio)

```gherkin
# TC-001.13 — Paciente duplicado en cola activa
Escenario: Intento de registrar paciente ya existente en la cola activa
  Dado que soy un usuario autenticado con rol de recepcionista
  Y un paciente con la misma cedula ya esta registrado en la cola activa
  Cuando intento registrar nuevamente al paciente en la misma cola
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que el paciente ya esta registrado
```

### CA-001.5: Cola llena (limite de sistema, regla de negocio)

```gherkin
# TC-001.14 — Cola llena al intentar check-in
Escenario: Intento de registrar cuando la cola esta llena
  Dado que soy un usuario autenticado con rol de recepcionista
  Y la cola ha alcanzado su capacidad maxima configurada
  Cuando intento registrar un nuevo paciente
  Entonces el sistema retorna HTTP 409 con un mensaje indicando la capacidad actual y el limite
```

### CA-001.6: Idempotencia en el registro (control de reintentos)

```gherkin
# TC-001.15 — Reintento con misma Idempotency-Key dentro de 24h
Escenario: Reintento con la misma Idempotency-Key dentro de las 24 horas
  Dado que soy un usuario autenticado con rol de recepcionista
  Y he realizado un registro exitoso de un paciente con una Idempotency-Key especifica
  Cuando reintento el registro con los mismos datos y la misma Idempotency-Key dentro de las 24 horas
  Entonces el sistema retorna la misma respuesta original, sin crear duplicados

# TC-001.16 — Reintento con misma Idempotency-Key despues de 24h
Escenario: Reintento con la misma Idempotency-Key despues de 24 horas
  Dado que soy un usuario autenticado con rol de recepcionista
  Y he realizado un registro de paciente con una Idempotency-Key especifica hace mas de 24 horas
  Cuando intento registrar un paciente nuevo con la misma Idempotency-Key
  Entonces el sistema permite el registro si el paciente ya fue dado de baja
```

### CA-001.7: Estado y orden en la cola tras registro (transicion de estados)

```gherkin
# TC-001.17 — Estado y ubicacion en cola tras registro exitoso
Escenario: Estado y ubicacion en la cola tras registro exitoso
  Dado que soy un usuario autenticado con rol de recepcionista
  Cuando registro un paciente exitosamente
  Entonces el paciente aparece en la cola "QUEUE-01" en estado EnEsperaTaquilla
  Y esta ordenado por prioridad descendente y hora de check-in ascendente dentro de la misma prioridad
```

### CA-001.8: Permisos por rol (combinatoria de roles)

```gherkin
# TC-001.18 — Recepcionista puede registrar paciente
Escenario: Recepcionista puede registrar paciente
  Dado que soy un usuario autenticado con rol de recepcionista
  Cuando intento registrar un paciente con datos validos
  Entonces el sistema permite el registro y retorna HTTP 200

# TC-001.19 — Admin puede registrar paciente
Escenario: Administrador puede registrar paciente
  Dado que soy un usuario autenticado con rol de administrador
  Cuando intento registrar un paciente con datos validos
  Entonces el sistema permite el registro y retorna HTTP 200

# TC-001.20 — Cajero no puede registrar paciente
Escenario: Cajero no puede registrar paciente
  Dado que soy un usuario autenticado con rol de cajero
  Cuando intento registrar un paciente
  Entonces el sistema retorna HTTP 403 con un mensaje de acceso denegado
  Y el intento queda registrado en el log de auditoria

# TC-001.21 — Medico no puede registrar paciente
Escenario: Medico no puede registrar paciente
  Dado que soy un usuario autenticado con rol de medico
  Cuando intento registrar un paciente
  Entonces el sistema retorna HTTP 403 con un mensaje de acceso denegado
  Y el intento queda registrado en el log de auditoria

# TC-001.22 — Paciente no puede registrar paciente
Escenario: Paciente no puede registrar paciente
  Dado que soy un usuario autenticado con rol de paciente
  Cuando intento registrar un paciente
  Entonces el sistema retorna HTTP 403 con un mensaje de acceso denegado
  Y el intento queda registrado en el log de auditoria
```

### CA-001.9: Campos opcionales aceptados (combinacion de valores)

```gherkin
# TC-001.23 — Registro exitoso con solo edad
Escenario: Registro exitoso con solo edad
  Dado que soy un usuario autenticado con rol de recepcionista
  Cuando ingreso edad valida y dejo embarazo y notas vacios
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.24 — Registro exitoso con solo indicador de embarazo
Escenario: Registro exitoso con solo indicador de embarazo
  Dado que soy un usuario autenticado con rol de recepcionista
  Cuando marco el indicador de embarazo y dejo edad y notas vacios
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200

# TC-001.25 — Registro exitoso con solo notas
Escenario: Registro exitoso con solo notas
  Dado que soy un usuario autenticado con rol de recepcionista
  Cuando ingreso una nota de 100 caracteres y dejo edad y embarazo vacios
  Y completo los demas campos requeridos correctamente
  Y envio el formulario
  Entonces el sistema registra al paciente y retorna HTTP 200
```

### CA-001.10: Persistencia y auditoria (trazabilidad, proteccion de datos)

```gherkin
# TC-001.26 — Evento con metadata obligatoria y sin PII en logs
Escenario: Evento de registro contiene metadata obligatoria y no expone datos sensibles en logs
  Dado que soy un usuario autenticado con rol de recepcionista
  Cuando registro exitosamente un paciente
  Entonces el evento "PatientCheckedIn" se persiste en el Event Store con correlation_id, causation_id, actor y fecha de ocurrencia
  Y los datos personales (cedula y nombre) no se almacenan ni exponen en logs o auditoria del sistema
```

### CA-001.11: Manejo de fallos de infraestructura (recuperacion)

```gherkin
# TC-001.27 — Fallo de base de datos durante registro
Escenario: Fallo de base de datos durante registro
  Dado que soy un usuario autenticado con rol de recepcionista
  Y el backend pierde la conexion a la base de datos durante el registro
  Cuando intento registrar un paciente
  Entonces el sistema retorna HTTP 503 con un mensaje generico
  Y el evento queda en la Outbox para reintento automatico

# TC-001.28 — Fallo de mensajeria durante registro
Escenario: Fallo de mensajeria durante registro
  Dado que soy un usuario autenticado con rol de recepcionista
  Y el backend pierde la conexion a RabbitMQ durante el registro
  Cuando intento registrar un paciente
  Entonces el sistema retorna HTTP 503 con un mensaje generico
  Y el evento queda en la Outbox para reintento automatico
```

---

## 3. Casos de prueba en Gherkin — HU-002: Gestion de pago en caja

### CA-002.1: Llamar al siguiente paciente en cola de caja

```gherkin
# TC-002.01 — Llamar al siguiente paciente en caja
Escenario: Llamar al siguiente paciente en caja exitosamente
  Dado que soy un usuario autenticado con rol de cajero
  Y hay pacientes en estado EnEsperaTaquilla en la cola de caja
  Cuando solicito llamar al siguiente paciente
  Entonces el sistema selecciona al paciente con mayor prioridad y menor hora de check-in
  Y el paciente transiciona a estado EnTaquilla
  Y la interfaz muestra al paciente seleccionado

# TC-002.02 — Llamar paciente con cola vacia
Escenario: Llamar paciente cuando la cola esta vacia
  Dado que soy un usuario autenticado con rol de cajero
  Y no hay pacientes en estado EnEsperaTaquilla
  Cuando solicito llamar al siguiente paciente
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que no hay pacientes disponibles

# TC-002.23 — Cola de caja llena (condicional)
Escenario: Cola de caja alcanza capacidad maxima
  Dado que soy un usuario autenticado con rol de cajero
  Y la cola de caja ha alcanzado su capacidad maxima
  Cuando se intenta asignar un nuevo paciente a la cola de caja
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que la cola esta llena
```

### CA-002.2: Solo un paciente activo en caja a la vez

```gherkin
# TC-002.03 — Llamar paciente con caja ocupada
Escenario: Llamar paciente cuando ya hay uno activo en caja
  Dado que soy un usuario autenticado con rol de cajero
  Y ya hay un paciente en estado EnTaquilla
  Cuando solicito llamar al siguiente paciente
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que existe un proceso de caja en curso
```

### CA-002.3: Validar pago con referencia obligatoria

```gherkin
# TC-002.04 — Validar pago con referencia valida
Escenario: Validar pago con referencia de comprobante valida
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla
  Cuando valido el pago ingresando una referencia de comprobante no vacia
  Entonces el paciente transiciona a estado EnEsperaConsulta
  Y los contadores de intentos de pago y ausencia se reinician
  Y el slot de caja activa se libera
  Y se genera el evento PatientPaymentValidated

# TC-002.05 — Validar pago con referencia vacia
Escenario: Validar pago sin referencia de comprobante
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla
  Cuando intento validar el pago con una referencia vacia
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la referencia es obligatoria

# TC-002.19 — Longitud maxima en referencia de comprobante
Escenario: Referencia de comprobante con longitud maxima permitida
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla
  Cuando valido el pago ingresando una referencia con la longitud maxima permitida
  Entonces el sistema acepta y procesa la validacion normalmente

# TC-002.20 — Exceder longitud en referencia de comprobante
Escenario: Referencia de comprobante excede longitud maxima
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla
  Cuando intento validar el pago con una referencia que excede la longitud maxima
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que el dato excede la longitud permitida
```

### CA-002.4: Marcar pago pendiente (maximo 3 intentos)

```gherkin
# TC-002.06 — Marcar pago pendiente con razon valida
Escenario: Marcar pago como pendiente con razon valida
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla o PagoPendiente
  Cuando marco el pago como pendiente ingresando una razon no vacia
  Entonces el contador de intentos de pago se incrementa
  Y el paciente transiciona a estado PagoPendiente
  Y se genera el evento PatientPaymentPending

# TC-002.07 — Marcar pago pendiente con razon vacia
Escenario: Marcar pago como pendiente sin razon
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla
  Cuando intento marcar el pago como pendiente sin ingresar una razon
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que la razon es obligatoria

# TC-002.08 — Exceder limite de pago pendiente (4to intento)
Escenario: Exceder limite de intentos de pago pendiente
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente con 3 intentos de pago pendiente registrados
  Cuando intento marcar el pago como pendiente por cuarta vez
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que se agotaron los intentos de pago
```

### CA-002.5: Marcar ausente en caja (maximo 2 veces)

```gherkin
# TC-002.09 — Marcar ausente en caja (1er y 2do intento)
Escenario: Marcar paciente como ausente en caja dentro del limite
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla o PagoPendiente
  Cuando marco al paciente como ausente en caja
  Entonces el paciente retorna a estado EnEsperaTaquilla manteniendo su prioridad y hora de check-in
  Y el slot de caja activa se libera
  Y se genera el evento PatientAbsentAtCashier

# TC-002.10 — Exceder limite de ausencias en caja (3er intento)
Escenario: Exceder limite de ausencias en caja
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente con 2 ausencias registradas en caja
  Cuando intento marcar al paciente como ausente por tercera vez
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que se agotaron los intentos de ausencia
```

### CA-002.6: Cancelacion por pago

```gherkin
# TC-002.11 — Cancelar por pago tras agotar intentos
Escenario: Cancelar paciente por pago tras agotar los 3 intentos
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente con 3 intentos de pago agotados
  Cuando cancelo al paciente por incumplimiento de pago
  Entonces el paciente transiciona a estado CanceladoPorPago (estado terminal)
  Y se genera el evento PatientCancelledByPayment

# TC-002.12 — Cancelar por pago antes de agotar intentos
Escenario: Cancelar paciente por pago antes de agotar intentos
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente con menos de 3 intentos de pago
  Cuando intento cancelar al paciente por incumplimiento de pago
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que la cancelacion no esta permitida aun
```

### CA-002.7: Permisos por rol en caja

```gherkin
# TC-002.13 — Operacion de caja con rol no autorizado
Escenario: Operacion de caja con rol no autorizado
  Dado que soy un usuario autenticado con rol de recepcionista o medico
  Cuando intento ejecutar cualquier operacion de caja
  Entonces el sistema retorna HTTP 403 con un mensaje de acceso denegado
```

### CA-002.8: Transiciones de estado estrictas

```gherkin
# TC-002.14 — Transicion de estado invalida
Escenario: Operacion de caja desde un estado no permitido
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en un estado distinto a EnTaquilla o PagoPendiente
  Cuando intento ejecutar una operacion de caja (validar, pendiente, ausencia o cancelar)
  Entonces el sistema retorna HTTP 409 con un mensaje indicando el estado actual y los estados validos

# TC-002.21 — Combinacion de operaciones validas desde EnTaquilla
Escenario: Operaciones validas desde el estado EnTaquilla
  Dado que soy un usuario autenticado con rol de cajero
  Y hay un paciente en estado EnTaquilla
  Cuando ejecuto una operacion valida (validar pago, marcar pendiente o marcar ausencia)
  Entonces el estado del paciente se actualiza correctamente segun la operacion ejecutada
```

### CA-002.9: Auto-seleccion y fallback manual

```gherkin
# TC-002.15 — Seleccion manual por fallo de sincronizacion
Escenario: Seleccion manual cuando no hay nextTurn activo
  Dado que soy un usuario autenticado con rol de cajero
  Y no existe un nextTurn activo por fallo de sincronizacion
  Cuando accedo a la interfaz de caja
  Entonces la interfaz muestra la lista completa de la cola
  Y puedo seleccionar manualmente al paciente a atender
```

### CA-002.10: Persistencia de eventos e idempotencia

```gherkin
# TC-002.16 — Persistencia de eventos de caja
Escenario: Evento de caja persistido en Event Store
  Dado que soy un usuario autenticado con rol de cajero
  Cuando ejecuto una operacion de caja exitosa
  Entonces el evento de dominio correspondiente se persiste de forma inmutable en el Event Store
  Y se despacha via Outbox a RabbitMQ

# TC-002.22 — Idempotencia en operaciones de caja
Escenario: Reintento idempotente en operacion de caja
  Dado que soy un usuario autenticado con rol de cajero
  Y he ejecutado una operacion de caja con una Idempotency-Key especifica
  Cuando reintento la misma operacion con la misma Idempotency-Key
  Entonces el sistema retorna la respuesta original cacheada
  Y no se genera un nuevo evento de dominio
```

### CA-002.11: Fallo de infraestructura

```gherkin
# TC-002.17 — Fallo de infraestructura en caja
Escenario: Fallo de infraestructura durante operacion de caja
  Dado que soy un usuario autenticado con rol de cajero
  Y la base de datos o RabbitMQ no estan disponibles
  Cuando intento ejecutar una operacion de caja
  Entonces el sistema retorna HTTP 503
  Y los eventos pendientes en la Outbox se reintentan automaticamente por el Worker
```

### CA-002.12: Cierre de sesion durante proceso activo

```gherkin
# TC-002.18 — Cierre de sesion durante proceso activo
Escenario: Cierre de sesion del cajero durante un proceso activo
  Dado que hay un paciente en estado EnTaquilla o PagoPendiente
  Y el cajero cierra sesion o su terminal falla
  Cuando otro cajero o administrador recarga la interfaz
  Entonces el paciente permanece en su estado actual
  Y puede ser retomado por el nuevo operador
```

---

## 4. Casos de prueba en Gherkin — HU-003: Atencion medica en consultorio

### CA-003.1: Reclamar siguiente paciente (prioridad y orden)

```gherkin
# TC-003.01 — Reclamar paciente disponible
Escenario: Reclamar al siguiente paciente disponible en consulta
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta activo
  Y hay pacientes en estado EnEsperaConsulta
  Cuando solicito reclamar al siguiente paciente
  Entonces el sistema asigna al paciente con mayor prioridad y menor hora de check-in
  Y retorna el patientId del paciente reclamado

# TC-003.02 — Reclamar con cola de consulta vacia
Escenario: Reclamar paciente cuando la cola de consulta esta vacia
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta activo
  Y no hay pacientes en estado EnEsperaConsulta
  Cuando solicito reclamar al siguiente paciente
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que la cola de consulta esta vacia

# TC-003.03 — Reclamar con multiples pacientes de igual prioridad
Escenario: Reclamar con pacientes de igual prioridad selecciona por hora de check-in
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta activo
  Y hay 2 pacientes en estado EnEsperaConsulta con la misma prioridad
  Cuando solicito reclamar al siguiente paciente
  Entonces el sistema asigna al paciente con menor hora de check-in

# TC-003.04 — Reclamar con combinacion de 4 prioridades
Escenario: Reclamar con pacientes de 4 prioridades distintas
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta activo
  Y hay pacientes en estado EnEsperaConsulta con prioridades Urgent, High, Medium y Low
  Cuando solicito reclamar al siguiente paciente
  Entonces el sistema asigna al paciente con prioridad Urgent
```

### CA-003.2: Solo un paciente en atencion activa a la vez

```gherkin
# TC-003.06 — Reclamar con atencion activa existente
Escenario: Reclamar paciente cuando ya hay uno en atencion activa
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta activo
  Y ya hay un paciente en atencion activa en la cola
  Cuando solicito reclamar otro paciente
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que existe una atencion en curso
```

### CA-003.3: Consultorio activo requerido para claim

```gherkin
# TC-003.05 — Reclamar desde consultorio inactivo
Escenario: Reclamar paciente desde un consultorio inactivo
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta desactivado
  Cuando solicito reclamar al siguiente paciente
  Entonces el sistema retorna HTTP 409 con un mensaje indicando el identificador del consultorio y que no esta activo

# TC-003.08 — Reclamar desde consultorio inexistente
Escenario: Reclamar paciente desde un consultorio no registrado
  Dado que soy un usuario autenticado con rol de medico
  Y el consultorio especificado no existe en el sistema
  Cuando solicito reclamar al siguiente paciente
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que el consultorio no existe
```

### CA-003.4: Llamar al paciente reclamado (call)

```gherkin
# TC-003.13 — Llamar paciente reclamado correctamente
Escenario: Llamar a consulta al paciente reclamado
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en estado LlamadoConsulta
  Cuando llamo al paciente a consulta
  Entonces el paciente transiciona a estado EnConsulta

# TC-003.14 — Llamar paciente en estado incorrecto
Escenario: Llamar a consulta a un paciente en estado no valido
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en un estado distinto a LlamadoConsulta
  Cuando intento llamar al paciente a consulta
  Entonces el sistema retorna HTTP 409 con un mensaje indicando el estado actual del paciente
```

### CA-003.5: Completar atencion medica

```gherkin
# TC-003.15 — Completar atencion exitosamente
Escenario: Completar atencion medica con resultado clinico
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en estado EnConsulta
  Cuando completo la atencion registrando un resultado clinico (outcome) y notas opcionales
  Entonces el paciente transiciona a estado Finalizado (estado terminal)
  Y los datos clinicos se almacenan de forma segura

# TC-003.16 — Completar atencion sin resultado clinico
Escenario: Completar atencion sin registrar resultado clinico
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en estado EnConsulta
  Cuando intento completar la atencion sin registrar un resultado clinico
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que el resultado clinico es obligatorio

# TC-003.17 — Completar atencion con outcome excediendo limite
Escenario: Completar atencion con texto de resultado que excede longitud maxima
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en estado EnConsulta
  Cuando intento completar la atencion con un outcome que excede la longitud maxima permitida
  Entonces el sistema retorna HTTP 400 con un mensaje indicando que se supero la longitud maxima

# TC-003.18 — Completar atencion en estado incorrecto
Escenario: Completar atencion de un paciente que no esta en consulta
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en un estado distinto a EnConsulta
  Cuando intento completar la atencion
  Entonces el sistema retorna HTTP 409

# TC-003.31 — Outcome con longitud maxima permitida
Escenario: Completar atencion con outcome en longitud maxima valida
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en estado EnConsulta
  Cuando completo la atencion con un outcome de exactamente la longitud maxima permitida
  Entonces el sistema acepta y finaliza la atencion

# TC-003.32 — Notas opcionales con longitud maxima permitida
Escenario: Completar atencion con notas en longitud maxima valida
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en estado EnConsulta
  Cuando completo la atencion con notas de exactamente la longitud maxima permitida
  Entonces el sistema acepta sin errores
```

### CA-003.6: Marcar ausencia en consultorio (1 reintento)

```gherkin
# TC-003.19 — Marcar ausencia primera vez
Escenario: Marcar ausencia en consultorio por primera vez
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en estado LlamadoConsulta
  Cuando marco al paciente como ausente en consultorio (primera vez)
  Entonces el paciente retorna a estado EnEsperaConsulta
  Y puede ser reclamado de nuevo por otro medico

# TC-003.20 — Marcar ausencia segunda vez (cancelacion automatica)
Escenario: Marcar ausencia en consultorio por segunda vez genera cancelacion automatica
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente con 1 ausencia previa, nuevamente en estado LlamadoConsulta
  Cuando marco al paciente como ausente por segunda vez
  Entonces el paciente transiciona a estado CanceladoPorAusencia (estado terminal)

# TC-003.21 — Marcar ausencia en estado incorrecto
Escenario: Marcar ausencia en consultorio desde un estado no valido
  Dado que soy un usuario autenticado con rol de medico
  Y hay un paciente en un estado distinto a LlamadoConsulta
  Cuando intento marcar al paciente como ausente
  Entonces el sistema retorna HTTP 409
```

### CA-003.7: Permisos por rol en consultorio

```gherkin
# TC-003.22 — Operacion medica con rol Doctor
Escenario: Medico puede ejecutar operaciones medicas
  Dado que soy un usuario autenticado con rol de medico
  Cuando intento ejecutar una operacion medica
  Entonces el sistema permite la operacion

# TC-003.23 — Operacion medica con rol Admin
Escenario: Administrador puede ejecutar operaciones medicas
  Dado que soy un usuario autenticado con rol de administrador
  Cuando intento ejecutar una operacion medica
  Entonces el sistema permite la operacion

# TC-003.07 — Reclamar con rol no autorizado
Escenario: Rol no autorizado intenta reclamar paciente
  Dado que soy un usuario autenticado con rol de paciente, recepcionista o cajero
  Cuando intento reclamar un paciente
  Entonces el sistema retorna HTTP 403
  Y el intento queda registrado en el log de auditoria sin exponer PII

# TC-003.24 — Operacion medica con rol no autorizado
Escenario: Rol no autorizado intenta operacion medica
  Dado que soy un usuario autenticado con rol de paciente, recepcionista o cajero
  Cuando intento ejecutar cualquier operacion medica
  Entonces el sistema retorna HTTP 403
  Y el intento queda registrado en el log de auditoria sin exponer PII
```

### CA-003.8: Gestion de consultorios (activar/desactivar)

```gherkin
# TC-003.09 — Activar consultorio inactivo
Escenario: Activar un consultorio inactivo
  Dado que soy un usuario autenticado con rol de administrador
  Y el consultorio esta inactivo
  Cuando activo el consultorio
  Entonces el consultorio queda activo y puede recibir pacientes

# TC-003.10 — Activar consultorio ya activo
Escenario: Intentar activar un consultorio que ya esta activo
  Dado que soy un usuario autenticado con rol de administrador
  Y el consultorio ya esta activo
  Cuando intento activar el consultorio
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que el consultorio ya esta activo

# TC-003.11 — Desactivar consultorio activo
Escenario: Desactivar un consultorio activo
  Dado que soy un usuario autenticado con rol de administrador
  Y el consultorio esta activo
  Cuando desactivo el consultorio
  Entonces el consultorio queda inactivo

# TC-003.12 — Desactivar consultorio ya inactivo
Escenario: Intentar desactivar un consultorio que ya esta inactivo
  Dado que soy un usuario autenticado con rol de administrador
  Y el consultorio ya esta inactivo
  Cuando intento desactivar el consultorio
  Entonces el sistema retorna HTTP 409 con un mensaje indicando que el consultorio ya esta inactivo
```

### CA-003.9: Auto-relleno de patientId

```gherkin
# TC-003.25 — Auto-relleno de patientId tras claim
Escenario: Interfaz auto-rellena el patientId tras un claim exitoso
  Dado que soy un usuario autenticado con rol de medico
  Y he reclamado un paciente exitosamente
  Cuando la interfaz recibe la respuesta del claim
  Entonces el campo patientId se auto-rellena en la pantalla
```

### CA-003.10: Persistencia de eventos e idempotencia

```gherkin
# TC-003.26 — Evento PatientClaimedForAttention generado
Escenario: Evento de claim persistido en Event Store
  Dado que soy un usuario autenticado con rol de medico
  Cuando reclamo un paciente exitosamente
  Entonces el evento PatientClaimedForAttention se persiste de forma inmutable en el Event Store
  Y se despacha via Outbox a RabbitMQ

# TC-003.27 — Evento PatientAttentionCompleted generado
Escenario: Evento de atencion completada persistido en Event Store
  Dado que soy un usuario autenticado con rol de medico
  Cuando finalizo la atencion de un paciente
  Entonces el evento PatientAttentionCompleted se persiste de forma inmutable en el Event Store

# TC-003.28 — Idempotencia en operaciones medicas
Escenario: Reintento idempotente en operacion medica
  Dado que soy un usuario autenticado con rol de medico
  Y he ejecutado una operacion medica con una Idempotency-Key especifica antes de 24 horas
  Cuando reintento la misma operacion con la misma Idempotency-Key
  Entonces el sistema retorna la respuesta original cacheada
  Y no se genera un nuevo evento de dominio
```

### CA-003.11: Fallo de infraestructura

```gherkin
# TC-003.29 — Fallo de infraestructura en consultorio
Escenario: Fallo de infraestructura durante operacion medica
  Dado que soy un usuario autenticado con rol de medico
  Y la base de datos o RabbitMQ no estan disponibles
  Cuando intento ejecutar una operacion medica
  Entonces el sistema retorna HTTP 503
  Y los eventos pendientes en la Outbox se reintentan automaticamente por el Worker
```

### CA-003.12: Proteccion de datos personales en logs

```gherkin
# TC-003.30 — No exposicion de PII en logs
Escenario: Datos clinicos no se exponen en los logs del sistema
  Dado que se ejecuta una operacion medica sobre un paciente
  Cuando el sistema registra el log de la operacion
  Entonces solo se incluyen correlation_id, causation_id, actor, fecha y version
  Y no se exponen nombre, cedula ni resultado de atencion en los logs
```

### Flujos end-to-end

```gherkin
# TC-003.33 — Flujo completo de reclamo a finalizacion
Escenario: Flujo completo desde reclamo hasta finalizacion de atencion
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta activo
  Y hay un paciente en estado EnEsperaConsulta
  Cuando reclamo al paciente
  Y lo llamo a consulta
  Y completo la atencion con un resultado clinico
  Entonces el paciente transiciona por: LlamadoConsulta → EnConsulta → Finalizado

# TC-003.34 — Flujo de ausencia y reintento completo
Escenario: Flujo completo de ausencias hasta cancelacion automatica
  Dado que soy un usuario autenticado con rol de medico
  Y mi consultorio esta activo
  Y hay un paciente en estado EnEsperaConsulta
  Cuando reclamo al paciente y lo marco como ausente (primera vez)
  Entonces el paciente retorna a estado EnEsperaConsulta
  Cuando reclamo al paciente nuevamente y lo marco como ausente (segunda vez)
  Entonces el paciente transiciona a estado CanceladoPorAusencia (terminal)
```

---

## 5. Tabla de ajustes realizados por el probador

La siguiente tabla documenta los ajustes aplicados por el probador humano sobre los casos de prueba generados por la IA, con la justificacion tecnica de cada modificacion.

### 5.1. Ajustes HU-001 (Check-in)

| ID ajuste | Caso(s) afectado(s) | Ajuste realizado | Justificacion tecnica |
|-----------|---------------------|------------------|-----------------------|
| AJ-001.01 | TC-001.03, TC-001.04 | Se agregaron casos de cedula en los limites validos (3 y 20 caracteres) que la IA no genero. | La IA cubrio los limites invalidos (2 y 21) pero no los limites justo en la frontera valida. Segun ISTQB, el analisis de valores limite requiere cubrir ambos lados de la frontera. Se agregaron TC-001.29 y TC-001.30. |
| AJ-001.02 | TC-001.07, TC-001.08 | Se agregaron casos de edad en los limites validos (0 y 120) que la IA no genero. | Misma razon que AJ-001.01: la IA cubrio -1 y 121 pero no 0 y 120. Se agregaron TC-001.31 y TC-001.32. |
| AJ-001.03 | TC-001.09 | Se agrego caso de notas en limite valido (500 chars) que la IA no genero. | La IA genero el caso de 501 caracteres (invalido) pero no el de exactamente 500 (limite valido). Se agrego TC-001.33. |
| AJ-001.04 | TC-001.05 | Se preciso que los caracteres invalidos son aquellos distintos de letras, numeros y guiones. | El criterio CA-001.1 define explicitamente que la cedula acepta "solo letras, numeros y guiones". La IA menciono "caracteres especiales" sin definir cuales son validos. Se ajusto la descripcion para alinear con la regla de dominio. |
| AJ-001.05 | TC-001.34 | Se agrego caso positivo de cedula con guiones. | La IA no genero un caso que validara el uso de guiones como caracter valido en la cedula. Dado que CA-001.1 los permite explicitamente, se requiere un caso que verifique su aceptacion. |
| AJ-001.06 | TC-001.15, TC-001.16 | Se separaron los casos de idempotencia en dos escenarios: dentro y fuera de las 24h. | La IA genero ambos escenarios pero no distinguio el comportamiento post-expiracion con claridad. Se preciso que tras 24h el registro se permite solo si el paciente fue dado de baja, conforme a CA-001.6. |

### 5.2. Ajustes HU-002 (Caja)

| ID ajuste | Caso(s) afectado(s) | Ajuste realizado | Justificacion tecnica |
|-----------|---------------------|------------------|-----------------------|
| AJ-002.01 | TC-002.05, TC-002.07 | El codigo HTTP de validacion de campos vacios se ajusto de HTTP 422 a HTTP 400. | El backend ASP.NET Core Minimal API utiliza HTTP 400 (Bad Request) para errores de validacion de entrada, no HTTP 422. Se verifica en el middleware `RequestValidationFilter` que retorna `Results.BadRequest()`. |
| AJ-002.02 | TC-002.19, TC-002.20 | Se agregaron casos de limite de longitud para referencia de pago y razon de pendiente que la IA definio sin valores concretos. | Los criterios refinados no definen longitudes maximas explicitas para estos campos. Se recomienda al equipo de desarrollo definir limites concretos. Mientras tanto, los casos validan el comportamiento generico de aceptar o rechazar por longitud. |
| AJ-002.03 | TC-002.22 | Se consolidaron los casos de idempotencia que la IA presento como escenarios separados por operacion en un solo caso generico. | La idempotencia se implementa a nivel de middleware (`IdempotencyKeyMiddleware`) y aplica de forma transversal a todos los endpoints de comando. No requiere un caso por cada operacion individual; un caso generico por flujo es suficiente para validar el comportamiento. |
| AJ-002.04 | TC-002.23 | Se marco el caso "cola de caja llena" como condicional. | La limitacion de capacidad maxima aplica al momento del check-in (HU-001, invariante `ValidateCapacity`), no al asignar pacientes a la sub-cola de caja. La cola de caja es una proyeccion del estado de los pacientes ya registrados. Este caso solo aplica si se implementa un limite especifico para la sub-cola de caja, lo cual no esta definido en los criterios actuales. |
| AJ-002.05 | TC-002.09 | Se ajusto la descripcion de "retorna al final de la cola" por precision. | El dominio reinicia el estado a `WaitingCashierState` pero no reordena la posicion del paciente. El paciente mantiene su prioridad original y hora de check-in, por lo que su posicion en la cola depende del algoritmo de seleccion (prioridad DESC, check-in ASC), no de un "final" literal. |
| AJ-002.06 | TC-002.15 | Se aclaro que la seleccion manual es un fallback de interfaz, no un endpoint distinto. | La IA presento este caso como si existiera un endpoint de seleccion manual. En realidad, la interfaz de caja siempre muestra la lista de pacientes; el auto-select via `nextTurn` es una conveniencia de UX que se degrada a seleccion manual cuando no hay `nextTurn` activo. No requiere un endpoint adicional. |

### 5.3. Ajustes HU-003 (Consultorio)

| ID ajuste | Caso(s) afectado(s) | Ajuste realizado | Justificacion tecnica |
|-----------|---------------------|------------------|-----------------------|
| AJ-003.01 | TC-003.16 | Se agrego el caso "completar atencion sin resultado clinico" que la IA no genero inicialmente. | El criterio refinado CA-003.5 indica que el outcome es texto libre pero la descripcion de la HU implica que registrar un resultado es parte del completar atencion. Se valida en el dominio que `CompleteAttentionRequest.Outcome` no puede ser nulo/vacio. |
| AJ-003.02 | TC-003.08 | Se ajusto el codigo esperado de HTTP 404 a HTTP 409. | El sistema no distingue entre consultorio inexistente e inactivo a nivel de API; la invariante `ValidateConsultingRoomActive` lanza `DomainException` que se traduce a HTTP 409, no HTTP 404. Se verifico en `ExceptionHandlerMiddleware`. |
| AJ-003.03 | TC-003.17, TC-003.31, TC-003.32 | Se agregaron casos de limite de longitud para outcome y notas que la IA definio sin valores concretos. | Los criterios refinados no definen longitudes maximas explicitas para estos campos. Se recomienda al equipo de desarrollo definir limites concretos (por ejemplo, 500 caracteres para outcome similar al campo notas de HU-001). Mientras tanto, los casos validan el comportamiento generico de aceptar o rechazar por longitud. |
| AJ-003.04 | TC-003.28 | Se consolido el caso de idempotencia en un solo caso generico. | Misma razon que AJ-002.03: la idempotencia opera a nivel de middleware transversal. |
| AJ-003.05 | TC-003.19, TC-003.20, TC-003.21 | Se ajusto la precondicion de "paciente en EnConsulta" a "paciente en LlamadoConsulta" para marcar ausencia. | Segun el dominio (`MarkAbsentAtConsultation`), la ausencia se marca desde el estado `ClaimedState` (LlamadoConsulta), no desde `CalledState` (EnConsulta). La IA genero la precondicion incorrecta basandose en la descripcion general en lugar del codigo fuente del agregado `WaitingQueue`. |
| AJ-003.06 | TC-003.06 | Se preciso que la restriccion de "un paciente en atencion activa" es por cola completa, no por consultorio individual. | La invariante `ValidateNoActiveAttention(CurrentAttentionPatientId)` opera a nivel del agregado `WaitingQueue` (la cola completa), no por consultorio. La IA interpreto que era por consultorio individual. Se verifica en el codigo fuente del agregado. |

---

## 6. Resumen de cobertura

| Dimension | HU-001 (Check-in) | HU-002 (Caja) | HU-003 (Consultorio) | Total |
|-----------|-------------------|---------------|----------------------|-------|
| Casos basicos | 7 | 6 | 8 | 21 |
| Casos alternos | 0 | 3 | 2 | 5 |
| Casos de excepcion | 3 | 5 | 7 | 15 |
| Casos de limite | 11 | 4 | 5 | 20 |
| Casos de seguridad/roles | 3 | 1 | 2 | 6 |
| Casos de idempotencia | 2 | 1 | 1 | 4 |
| Casos de recuperacion | 2 | 2 | 1 | 5 |
| Casos de cumplimiento/auditoria | 1 | 1 | 1 | 3 |
| Casos E2E (flujo completo) | 0 | 1 | 2 | 3 |
| Casos de combinacion | 3 | 1 | 1 | 5 |
| Casos de UX | 0 | 1 | 1 | 2 |
| **Total de casos** | **34** | **23** | **34** | **91** |
| Criterios de aceptacion cubiertos | 11/11 | 12/12 | 12/12 | 35/35 |
| Ajustes del probador | 6 | 6 | 6 | 18 |

Todos los criterios de aceptacion refinados de las tres historias de usuario quedan cubiertos por al menos un caso de prueba. Los 18 ajustes del probador corrigen imprecisiones de la IA en codigos HTTP, precondiciones de estado, valores limite incompletos, alcance de invariantes y comportamiento real del sistema verificado contra el codigo fuente.