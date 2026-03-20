# Matriz de Riesgos ASD - rlapp-patient-centric-refactor

## Resumen
- Total riesgos: 10
- Alto: 6
- Medio: 3
- Bajo: 1

## Detalle

| ID | HU | Riesgo | Nivel ASD | Mitigacion | Foco de testing |
|---|---|---|---|---|---|
| R-001 | HU-03 | Error en validacion/cierre de pago genera inconsistencia financiera | Alto | Validaciones de estado y monto inmutable, pruebas de idempotencia en validate-payment y complete | Integracion backend + pruebas de regresion de pago + casos 409/400 |
| R-002 | HU-01/HU-05 | Duplicacion de Paciente por falla de idempotencia o unicidad diaria | Alto | Enforce de unicidad por identidad/dia y llave idempotente obligatoria | Unitarias de VO + integracion registro + pruebas de concurrencia |
| R-003 | HU-02/HU-03 | Transiciones invalidas de maquina de estados rompen flujo clínico | Alto | Reglas de transicion centralizadas en dominio + contratos de error consistentes | Pruebas de dominio, handlers y endpoints con matriz de transiciones |
| R-004 | HU-02/HU-04 | Doble asignacion de Paciente o sobreocupacion de Consultorio en paralelo | Alto | Control de concurrencia optimista por version de evento y validacion de ocupancia | Integracion repos/proyecciones + pruebas de carrera |
| R-005 | HU-04 | Falla de autorizacion por rol habilita acciones no permitidas | Alto | Politicas por rol y pruebas negativas obligatorias 401/403 | HTTP integration por endpoint sensible y rol |
| R-006 | HU-05 | Perdida de consistencia entre Event Store, Outbox y proyecciones | Alto | Reintentos con checkpoint, replay deterministico y monitoreo de lag | Tests de worker/replay + pruebas de recuperacion |
| R-007 | HU-04 | Degradacion UX por desconexion SignalR sin fallback estable | Medio | Fallback polling, mensajes de reconexion y timeout controlado | Tests de servicios frontend SignalR + pruebas exploratorias UX |
| R-008 | HU-01/HU-05 | Exposicion de datos personales en logs o respuestas | Medio | Mascarado y minimizacion de datos sensibles | Revisión de contratos/logs + pruebas de seguridad funcional |
| R-009 | HU-05 | Rebuild de proyecciones lento afecta operación en ventanas críticas | Medio | Rebuild incremental por checkpoint y ventanas controladas | Pruebas de performance sobre replay y lectura |
| R-010 | HU-04 | Inconsistencias menores de visualizacion sin impacto transaccional | Bajo | Validaciones de rendering y regresion visual puntual | Tests frontend de componentes y smoke manual |

## Plan de mitigacion para riesgos Alto (obligatorio)

### R-001 - Integridad de pago
- Mitigacion clave: validar precondiciones de estado, inmutabilidad del monto y cierre idempotente.
- Pruebas obligatorias: flujo feliz completo de caja, doble submit de pago, validacion de errores.
- Bloquea release: Si.

### R-002 - Duplicidad de Paciente
- Mitigacion clave: constraint de identidad por dia + retorno idempotente.
- Pruebas obligatorias: doble registro secuencial y concurrente, con y sin llave idempotente.
- Bloquea release: Si.

### R-003 - Maquina de estados
- Mitigacion clave: tabla de transiciones permitidas y rechazo uniforme de transiciones invalidas.
- Pruebas obligatorias: matriz completa de transiciones por rol.
- Bloquea release: Si.

### R-004 - Paralelismo de consultorios
- Mitigacion clave: control de version y validacion de ocupacion atomica.
- Pruebas obligatorias: simulaciones de asignacion simultanea y reasignacion invalida.
- Bloquea release: Si.

### R-005 - Autorizacion por rol
- Mitigacion clave: enforcement en API y middleware de autorizacion.
- Pruebas obligatorias: casos por rol permitido/no permitido para endpoints críticos.
- Bloquea release: Si.

### R-006 - Consistencia Event Sourcing y Proyecciones
- Mitigacion clave: outbox transaccional, retry seguro, replay validado.
- Pruebas obligatorias: fallo controlado de proyeccion, retry, replay y verificacion de estado final.
- Bloquea release: Si.

## Hallazgos clave
1. Los riesgos de mayor impacto se concentran en pagos, autorización, concurrencia y consistencia eventual.
2. Hay evidencia sólida en pruebas de integración y servicios, pero aún se requiere cierre formal de escenarios E2E extremos y baseline no funcional.
3. La coexistencia temporal con legado queue-centric incrementa el riesgo de regresión semántica y requiere vigilancia adicional en contratos.