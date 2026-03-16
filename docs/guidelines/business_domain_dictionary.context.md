# Diccionario de Dominio de Negocio

## Términos canónicos

| Término                              | Definición canónica                                                   | Sinónimos aceptados    | Sinónimos rechazados                     | Ejemplo de uso correcto                  |
| ------------------------------------ | --------------------------------------------------------------------- | ---------------------- | ---------------------------------------- | ---------------------------------------- |
| Paciente (`patient`)                 | Persona registrada para ser atendida en el flujo clínico.             | Paciente               | Cliente, usuario final                   | "Registrar un paciente"                  |
| Turno (`queue`)                      | Cola o flujo de atención asignado al Paciente.                        | Cola de atención       | Fila genérica, ticket                    | "Consultar el turno del paciente"        |
| Consultorio (`consulting room`)      | Sala de atención médica habilitada para consulta.                     | Sala médica            | Box, módulo                              | "Asignar consultorio"                    |
| Recepcionista                        | Rol que registra pacientes y gestiona su ingreso.                     | Recepción              | Operador                                 | "Como Recepcionista"                     |
| Cajero                               | Rol que valida pago y llama al siguiente paciente.                    | Caja                   | Operador de pago                         | "El Cajero llama al siguiente paciente"  |
| Doctor                               | Rol que reclama, atiende y finaliza la consulta.                      | Médico                 | Médico tratante genérico                 | "El Doctor inicia la consulta"           |
| Administrador                        | Rol con permisos completos sobre configuración y operación.           | Admin                  | Superusuario                             | "Solo el Administrador configura colas"  |
| `queueId`                            | Identificador de la cola de atención.                                 | Id de turno            | Fila, ticket                             | "El queueId debe existir"                |
| `patientId`                          | Identificador del paciente dentro de la operación del sistema.        | Id del paciente        | ID ambiguo, documento sin contexto       | "El patientId es obligatorio"            |
| `created_at`                         | Marca temporal UTC de creación en contratos o persistencia.           | Fecha de creación      | Fecha alta                               | "Asignar created_at en UTC"              |
| `updated_at`                         | Marca temporal UTC de última actualización.                           | Fecha de actualización | Fecha modificación                       | "Actualizar updated_at en cada cambio"   |

## Reglas semánticas del dominio

1. El término canónico para la entidad operativa principal es **Paciente**; evitar reemplazarlo por "cliente" o "usuario final".
2. `queueId` y `patientId` deben conservarse como identificadores operativos explícitos del dominio.
3. `Dashboard` es una vista de lectura y monitoreo; no debe redefinirse como módulo transaccional.
4. Los atributos `created_at` y `updated_at` son metadatos temporales en UTC cuando existan en contratos o persistencia.

## Ambigüedades comunes a evitar

- "Usuario" cuando realmente se quiere decir Paciente, Recepcionista, Cajero, Doctor o Administrador.
- "Fila" o "ticket" cuando el término correcto es `queue` o `queueId`.
- "Sala" o "box" cuando el término canónico del dominio es Consultorio.
