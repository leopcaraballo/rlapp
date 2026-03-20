# Plan de Implementación y Seguimiento - Refactor RLAPP

Este documento sirve como hoja de ruta activa y tablero de seguimiento para el proceso de refactorización integral del sistema RLAPP, migrando de una arquitectura de colas genérica a un modelo clínico centrado en el Paciente y Consultorio (Atención).

## Propósito del documento
Proporcionar una visión clara y ejecutable de las tareas pendientes, en progreso y completadas, basándose en el estado actual del código en la rama de trabajo. Este no es un resumen histórico, sino una herramienta de gestión para el cierre del refactor.

## Leyenda de estados
- `[x] HECHO`: Implementado en código y alineado con la nueva arquitectura.
- `[/] EN PROGRESO`: Implementación parcial, inconsistencias detectadas o falta de cierre (ej. falta wiring DI).
- `[ ] PENDIENTE`: No implementado o requiere revisión completa tras cambios en otras capas.
- `(!) BLOQUEADO`: Requiere una tarea previa para avanzar.

## Resumen del Alcance del Refactor
- **Arquitectura**: Transición a Event Sourcing centrado en los agregados `Patient` y `ConsultingRoom`.
- **Backend**: Nuevos endpoints en `/api/patients` y `/api/v1/atencion`, reemplazando la lógica de `WaitingRoom` y `Queue`.
- **Frontend**: Migración de rutas legacy (`/cashier`, `/waiting-room`, `/display`) a rutas clínicas (`/payment`, `/queue`, `/monitor`).
- **Persistencia**: Nuevas tablas en PostgreSQL para proyecciones de estado de paciente y ocupación de consultorios.

---

## Estado General Actual
- **Contratos/API**: Definidos y mayormente implementados en controladores y adaptadores. (HECHO EN CÓDIGO)
- **Dominio**: Agregados `Patient` y `ConsultingRoom` definidos con lógica de transiciones de estado. (HECHO)
- **Frontend**: Estructura de componentes y hooks migrada a los nuevos contratos. (EN PROGRESO - Falta validación E2E)
- **Persistencia**: Scripts de base de datos actualizados. Repositorios de proyecciones en desarrollo. (EN PROGRESO)
- **Compilación/Estabilización**: No hay evidencia de suite de tests verde ni compilación final exitosa con el nuevo wiring. (PENDIENTE)

---

## Plan por Fases

### Fase 1. Cierre de alcance y decisión de arquitectura final
**Objetivo:** Consolidar el modelo de dominio y eliminar ambigüedades entre el modelo viejo y nuevo.
- [x] Definición de Agregado `Patient` y sus estados.
- [x] Definición de Agregado `ConsultingRoom`.
- [x] Mapeo de terminología (Queue -> Atencion/Service).
- [x] Eliminación/Deprecación de `WaitingRoom` genérico en el dominio.
- **Estado actual:** Completado en definición y código base del dominio.

### Fase 2. Backend compilable y consistente
**Objetivo:** Asegurar que todos los nuevos handlers y controladores compilan y están registrados en el contenedor de DI.
- [/] Registro de Command Handlers en MediatR. (EN PROGRESO)
- [/] Registro de Repositorios en el Program.cs / Startup. (EN PROGRESO)
- [/] Implementación de Middlewares de validación y filtros de rol. (HECHO EN CÓDIGO)
- [ ] Resolución de conflictos de nombres entre `Atencion.API` y `WaitingRoom.API`. (EN PROGRESO)
- **Estado actual:** Código escrito pero requiere verificación de compilación integral.

### Fase 3. Persistencia, event store y proyecciones
**Objetivo:** Garantizar que los eventos se guardan y las proyecciones (read models) se actualizan correctamente.
- [x] Actualización de `init.sql` con nuevas tablas de proyecciones e idempotencia.
- [/] Implementación de `PostgresPatientStateRepository`. (HECHO EN CÓDIGO)
- [/] Proyección `ConsultingRoomOccupancyProjectionHandler`. (HECHO EN CÓDIGO)
- [ ] Pipeline de background worker para despacho de eventos a proyectores. (PENDIENTE/Sin evidencia)
- **Estado actual:** Esquema listo, lógica de proyección en código, falta probar flujo completo.

### Fase 4. Flujos clínicos end-to-end del backend
**Objetivo:** Validar que un paciente puede pasar de Registro -> Espera -> Consulta -> Pago -> Completado.
- [ ] Flujo de Registro a Espera (Receptionist).
- [ ] Flujo de Llamado y Inicio de Consulta (Doctor).
- [ ] Flujo de Finalización de Consulta y Arribo a Caja.
- [ ] Flujo de Validación de Pago y Cierre de Turno (Cashier).
- **Estado actual:** Pendiente de validación operacional.

### Fase 5. Frontend conectado a contratos nuevos
**Objetivo:** Migrar la UI para usar los nuevos adaptadores y rutas.
- [x] Creación de `HttpCommandAdapter` y `HttpQueryAdapter` con nuevas rutas.
- [x] Migración de `/reception` para usar `/api/patients/register`.
- [/] Pantalla de Médico (`/medical`) actualizada para usar pacientes. (HECHO EN CÓDIGO)
- [x] Renombramiento de `/cashier` a `/payment`.
- [x] Renombramiento de `/display` a `/monitor`.
- [ ] Ajuste de estilos en componentes compartidos post-migración. (EN PROGRESO)
- **Estado actual:** Gran parte de los componentes actualizados, falta testing manual de navegación.

### Fase 6. Tiempo real / SignalR / polling
**Objetivo:** Asegurar que las pantallas de monitor y espera se actualizan sin refresco manual.
- [x] Implementación de `atencionSignalR.ts`.
- [x] Hook `useAtencion` con soporte para polling y SignalR.
- [ ] Configuración del Hub en el backend para emitir eventos de los nuevos agregados. (PENDIENTE)
- **Estado actual:** Infraestructura frontend lista, falta cerrar el círculo en el backend.

### Fase 7. Tests y estabilización
**Objetivo:** Recuperar la cobertura de tests y asegurar estabilidad.
- [/] Actualización de Unit Tests de Dominio (Patient/ConsultingRoom). (EN PROGRESO)
- [ ] Actualización de Integration Tests (API/Handlers). (PENDIENTE)
- [/] Ajuste de tests E2E (Playwright) para nuevas rutas. (HECHO EN CÓDIGO / FALTA VALIDAR)
- **Estado actual:** Hay tests tocados pero la suite no está en verde.

### Fase 8. Limpieza técnica
**Objetivo:** Eliminar código muerto y archivos legacy.
- [/] Eliminación de carpetas `waiting-room` y `display` antiguas en frontend. (HECHO)
- [ ] Eliminación de lógica `WaitingRoom` antigua en backend. (PENDIENTE - Coexistencia actual)
- [ ] Limpieza de variables de entorno obsoletas en Docker. (PENDIENTE)
- **Estado actual:** Iniciado, coexistencia de modelos detectada.

### Fase 9. Hardening y salida a integración
**Objetivo:** Preparar el sistema para un entorno de pruebas real.
- [ ] Auditoría de seguridad sobre endpoints de `/api/patients`.
- [ ] Validación de performance del proyector de SQL bajo carga.
- [ ] Documentación final de la nueva API.
- **Estado actual:** Pendiente.

---

## Matriz de Componentes

| Capa | Componente | Estado | Nota |
| :--- | :--- | :---: | :--- |
| **Backend Domain** | Aggregate: `Patient` | [x] | Lógica completa. |
| **Backend Domain** | Aggregate: `ConsultingRoom` | [x] | Lógica completa. |
| **Backend App** | Handlers: `RegisterPatient`, `StartConsultation`, etc. | [x] | Implementados. |
| **Backend API** | Endpoints: `/api/patients/*` | [x] | Implementados. |
| **Backend API** | Endpoints: `/api/v1/atencion/*` | [x] | Proyecciones integradas. |
| **Infrastructure** | Repositories: Postgres Projections | [/] | Falta probar persistencia real. |
| **Frontend Pages** | `/reception`, `/medical`, `/payment` | [x] | Rutas y lógica migrada. |
| **Frontend Pages** | `/monitor`, `/queue` | [x] | Rutas y lógica migrada. |
| **Frontend Hooks** | `useAtencion`, `useMedicalStation` | [x] | Refactorizados. |
| **Base de Datos** | `init.sql`, IDs de idempotencia | [x] | Actualizado. |
| **Tests** | E2E Hardening | [/] | Adaptado a nuevas rutas, falta correr. |
| **Docker** | `docker-compose.yml` (port 3011, dev mode) | [x] | Configurado. |

---

## Orden recomendado de ejecución
1. **Compilación Backend**: Resolver cualquier error de tipos o referencias en `Atencion.API`.
2. **Wiring DI**: Asegurar que MediatR y los repositorios estén registrados.
3. **Pruebas de Proyección**: Ejecutar un comando y verificar que las tablas de read-model en Postgres se llenen.
4. **Verificación Frontend**: Iniciar el contenedor, loguearse y probar el flujo de recepción.
5. **Cierre de Coexistencia**: Una vez validado el flujo nuevo, borrar definitivamente los controladores legacy.

## Definición de Terminado (DoD)
- [ ] El código compila sin warnings de arquitectura.
- [ ] Un paciente puede ser registrado, llamado a consulta y pasar a pago sin errores 500.
- [ ] Todas las proyecciones en base de datos reflejan el estado del Event Store.
- [ ] Los tests E2E de Playwright pasan en su totalidad.
- [ ] No existen referencias a `/display` o `/waiting-room` en el código productivo.

## Próxima Actualización Recomendada
Este archivo debe ser actualizado inmediatamente después de:
- Lograr la primera compilación exitosa del backend refactorizado.
- Cerrar el primer ciclo de pruebas manuales exitoso.
- Finalizar el cableado de SignalR para los nuevos eventos.
