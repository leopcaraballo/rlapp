# language: es
Característica: Flujo patient-centric en sala de espera medica RLAPP
  Para asegurar operación clínica segura y trazable
  Como equipo operativo (Recepcionista, Doctor, Cajero, Administrador)
  Queremos gestionar al Paciente con identidad única y estados consistentes

  @smoke @critico @hu01 @happy-path
  Escenario: Registro exitoso de Paciente con identidad válida
    Dado que un Paciente no tiene registro del dia
    Cuando completa su registro con identidad valida, nombre y telefono
    Entonces el sistema registra al Paciente correctamente
    Y el Paciente queda identificable de forma unica

  @error-path @hu01
  Escenario: Rechazo de registro con identidad invalida
    Dado que un Paciente intenta registrarse con identidad vacia o fuera de rango
    Cuando envia el formulario de registro
    Entonces el sistema informa error de validacion
    Y no crea un nuevo Paciente

  @edge-case @hu01 @idempotencia
  Escenario: Reintento de registro idempotente
    Dado que un Paciente ya fue registrado hoy
    Cuando repite la misma solicitud con la misma llave de idempotencia
    Entonces el sistema retorna el mismo resultado del registro previo
    Y no genera duplicados

  @smoke @critico @hu02 @happy-path
  Escenario: Recepcionista asigna Paciente en espera a Consultorio activo
    Dado que un Paciente esta en estado WAITING
    Y existe un Consultorio activo disponible
    Cuando la Recepcionista asigna el Paciente al Consultorio
    Entonces el estado del Paciente cambia a ASSIGNED
    Y la ocupancia del Consultorio se actualiza en la vista operativa

  @error-path @hu02
  Escenario: No se permite asignar a Consultorio inactivo
    Dado que un Consultorio esta inactivo
    Cuando la Recepcionista intenta asignar un Paciente a ese Consultorio
    Entonces el sistema rechaza la operacion
    Y el estado del Paciente no cambia

  @edge-case @hu02 @concurrencia
  Escenario: Prevencion de doble asignacion simultanea
    Dado que un Paciente ya fue asignado a un Consultorio
    Cuando otra Recepcionista intenta asignarlo a un segundo Consultorio
    Entonces el sistema evita la doble asignacion
    Y conserva la asignacion inicial valida

  @smoke @critico @hu03 @happy-path
  Escenario: Flujo completo de consulta, caja y cierre
    Dado que un Paciente esta ASSIGNED a un Consultorio
    Cuando el Doctor inicia y finaliza la consulta
    Y el Paciente llega a caja
    Y el Cajero valida el pago
    Entonces el sistema marca el proceso como COMPLETED
    Y el historial del Paciente queda trazable

  @error-path @hu03
  Escenario: Transicion invalida al iniciar consulta
    Dado que un Paciente sigue en WAITING
    Cuando el Doctor intenta iniciar consulta sin asignacion
    Entonces el sistema rechaza la transicion de estado
    Y no inicia consulta

  @edge-case @hu03
  Escenario: Paciente ausente en consulta
    Dado que un Paciente fue asignado a Consultorio
    Cuando el Doctor registra ausencia del Paciente
    Entonces el sistema marca estado terminal de ausencia
    Y deja evidencia de la razon de salida

  @smoke @critico @hu04 @realtime
  Escenario: Actualizacion operativa en tiempo real
    Dado que una Recepcionista observa la lista de Pacientes en espera
    Cuando otro usuario asigna a uno de esos Pacientes
    Entonces la pantalla operativa se actualiza en tiempo real
    O entra en modo de polling sin bloquear la operación

  @error-path @hu04 @resiliencia
  Escenario: Degradacion controlada ante desconexion de tiempo real
    Dado que se pierde temporalmente la conexion en tiempo real
    Cuando el frontend detecta desconexion
    Entonces muestra estado de reconexion
    Y mantiene capacidad de lectura con reintentos periodicos

  @smoke @critico @hu05 @event-sourcing
  Escenario: Trazabilidad completa por Paciente
    Dado que un Paciente atraveso multiples estados
    Cuando un Administrador consulta su auditoria
    Entonces visualiza la linea temporal completa de eventos
    Y cada evento tiene correlacion y orden temporal

  @error-path @hu05 @proyecciones
  Escenario: Falla de proyeccion no bloquea procesamiento global
    Dado que una proyeccion falla al procesar un evento
    Cuando el worker gestiona la excepcion
    Entonces registra la falla y programa reintento
    Y permite que otras proyecciones continúen

  @edge-case @hu05 @replay
  Escenario: Reconstruccion de proyeccion desde eventos
    Dado que una proyeccion queda inconsistente
    Cuando se ejecuta la reconstruccion desde Event Store
    Entonces la vista se regenera consistentemente
    Y se reanuda la operacion normal

## Datos de prueba sinteticos

| Escenario | Campo | Valido | Invalido | Borde |
|---|---|---|---|---|
| Registro exitoso | identidadPaciente | 12345678 | 123 | 123456 |
| Registro exitoso | nombrePaciente | Ana Torres | vacio | Jose Maria |
| Asignacion consultorio | consultorioId | ROOM-001 activo | ROOM-009 inactivo | ROOM-001 ocupado |
| Flujo consulta-caja-cierre | estadoPaciente | ASSIGNED -> COMPLETED | WAITING -> IN_CONSULTATION | ABSENT_AT_CONSULTATION |
| Idempotencia | llaveIdempotencia | uuid unico | vacia | misma llave repetida |
| Auditoria | correlacion | presente | ausente | correlacion repetida sin duplicar efecto |

## Smoke suite propuesta
- Registro de Paciente
- Asignacion a Consultorio activo
- Inicio y fin de consulta
- Validacion de pago y cierre
- Auditoria de eventos por Paciente