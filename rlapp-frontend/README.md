# Frontend — Sistema de Gestion de Turnos (Sala de Espera)

Frontend desarrollado con **Next.js 16 (App Router)** + **React 19** para la gestion completa de una sala de espera medica en tiempo real.
Implementa **Arquitectura Hexagonal** (Ports & Adapters), comunicacion en tiempo real via **SignalR**, y un flujo clinico completo: recepcion, caja, consultorios medicos y pantalla publica de turnos.

## Objetivo

Proveer una interfaz completa, tipada y resiliente para:

- Gestionar el flujo clinico completo de pacientes (recepcion → caja → consultorio → atencion)
- Visualizar turnos en tiempo real (SignalR + polling como fallback)
- Operar estaciones de trabajo especializadas (recepcion, caja, consultorio)
- Mostrar pantalla publica de turnos para pacientes en espera
- Monitorear metricas de la sala de espera (tiempos, capacidad, utilizacion)

## Stack tecnologico

| Tecnologia | Version | Uso |
|---|---|---|
| Next.js | 16.1.6 | Framework principal (App Router) |
| React | 19.2.4 | UI con React Compiler habilitado |
| TypeScript | 5.x | Tipado estatico estricto (`strict: true`) |
| SignalR | 7.0.5 | Comunicacion en tiempo real (WebSocket/SSE/LongPolling) |
| Zod | 4.3.6 | Validacion de formularios |
| React Hook Form | 7.71.2 | Gestion de formularios |
| Jest | 30.2.0 | Testing unitario e integracion |
| Testing Library | 16.3.2 | Testing de componentes React |
| Playwright | 1.58.2 | Testing E2E |
| MSW | 2.4.10 | Mock de API en tests |
| ESLint | 9.39.3 | Calidad de codigo |
| CSS Modules | -- | Estilos encapsulados |

## Arquitectura hexagonal

El proyecto implementa Arquitectura Hexagonal con separacion estricta de capas:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTACION (UI)                           │
│  app/        Rutas y paginas (App Router)                       │
│  components/ Componentes React reutilizables                    │
│  hooks/      Logica de estado y side-effects                    │
│  context/    Inyeccion de dependencias (DependencyContext)       │
├─────────────────────────────────────────────────────────────────┤
│                     APLICACION (Use Cases)                      │
│  application/reception/     CheckInPatientUseCase               │
│  application/cashier/       CashierUseCases (5 operaciones)     │
│  application/medical/       MedicalUseCases (4 operaciones)     │
│  application/consulting-rooms/ ConsultingRoomUseCases           │
├─────────────────────────────────────────────────────────────────┤
│                     DOMINIO (Modelos y Puertos)                 │
│  domain/Appointment.ts         Modelo principal                 │
│  domain/patient/               Value Objects (PatientState,     │
│                                ConsultationType)                │
│  domain/queue/                 Eventos de dominio (QueueEvent)  │
│  domain/ports/                 Interfaces de puertos:           │
│    ├── ICommandGateway.ts        12 comandos CQRS               │
│    ├── IQueryGateway.ts          5 consultas de proyeccion      │
│    ├── AppointmentRepository.ts  CRUD de citas                  │
│    └── RealTimePort.ts           Contrato de tiempo real        │
├─────────────────────────────────────────────────────────────────┤
│                     INFRAESTRUCTURA (Adaptadores)               │
│  infrastructure/adapters/                                       │
│    ├── HttpCommandAdapter.ts   Implementa ICommandGateway       │
│    ├── HttpAppointmentAdapter.ts Implementa AppointmentRepo     │
│    ├── SignalRAdapter.ts       Implementa RealTimePort          │
│    └── SocketIoAdapter.ts      Implementa RealTimePort (alt.)   │
│  lib/httpClient.ts             Circuit Breaker + Retry + Timeout│
│  services/api/                 Cliente REST con traducciones     │
│  services/signalr/             Conexion SignalR Hub              │
└─────────────────────────────────────────────────────────────────┘
```

### Principio clave: Inyeccion de dependencias via Context

```
Produccion:  DependencyProvider → HttpAppointmentAdapter + SignalRAdapter
Tests:       TestDependencyProvider → mockRepository + mockRealTime
```

Los hooks consumen `useDependencies()` sin saber si reciben adaptadores reales o mocks (Principio de Sustitucion de Liskov).

## Flujo clinico del paciente

```
Recepcion          Caja               Consultorio         Fin
   │                │                     │                │
   ▼                ▼                     ▼                ▼
CheckIn ──→ CalledAtCashier ──→ WaitingAtConsulting ──→ AttentionCompleted
   │         │                     │
   │         ├─ PaymentValidated   ├─ CalledAtConsulting
   │         ├─ PaymentPending     ├─ InConsultation
   │         ├─ AbsentAtCashier    └─ AbsentAtConsultation
   │         └─ CancelledByPayment
   │
   └─ 13 estados posibles (ver PatientState.ts)
```

## Rutas de la aplicacion

| Ruta | Descripcion | Componentes principales |
|---|---|---|
| `/` | Pantalla principal de turnos en espera | RealtimeAppointments |
| `/reception` | Estacion de recepcion (check-in de pacientes) | Formulario Zod + QueueState |
| `/cashier` | Estacion de caja (pagos y validaciones) | Lista de pacientes + acciones |
| `/medical` | Estacion medica (consultas) | Selector de consultorio + acciones |
| `/consulting-rooms` | Gestion de consultorios (activar/desactivar) | Grid de 4 consultorios |
| `/display/[queueId]` | Pantalla publica para pacientes | Turno actual + 8 siguientes |
| `/dashboard` | Panel completo con turnos completados | RealtimeAppointments extendido |
| `/waiting-room/[queueId]` | Monitor completo de sala de espera | Monitor + Queue + NextTurn + History |
| `/registration` | Formulario de registro de citas | AppointmentRegistrationForm |
| `/test` | Pagina de prueba de rutas | - |

## Estructura del proyecto

```
src/
├── app/                          # Rutas y paginas (App Router)
│   ├── layout.tsx                #   Layout global (DI + Alerts + Navbar)
│   ├── page.tsx                  #   Pagina principal
│   ├── api/mock/turnos/          #   API mock para desarrollo sin backend
│   ├── reception/                #   Estacion de recepcion
│   ├── cashier/                  #   Estacion de caja
│   ├── medical/                  #   Estacion medica
│   ├── consulting-rooms/         #   Gestion de consultorios
│   ├── display/[queueId]/        #   Pantalla publica de turnos
│   ├── dashboard/                #   Panel de turnos en tiempo real
│   ├── waiting-room/[queueId]/   #   Monitor de sala de espera
│   └── registration/             #   Formulario de registro
├── application/                  # Casos de uso (funciones puras)
│   ├── reception/                #   CheckInPatientUseCase
│   ├── cashier/                  #   5 use cases de caja
│   ├── medical/                  #   4 use cases medicos
│   └── consulting-rooms/         #   Activar/desactivar consultorios
├── domain/                       # Modelos y contratos de negocio
│   ├── Appointment.ts            #   Modelo principal
│   ├── CreateAppointment.ts      #   DTO de creacion
│   ├── patient/                  #   Value Objects (PatientState, ConsultationType)
│   ├── ports/                    #   Interfaces de puertos (4 puertos)
│   └── queue/                    #   Eventos de dominio (QueueEvent)
├── infrastructure/adapters/      # Adaptadores de infraestructura
│   ├── HttpCommandAdapter.ts     #   12 comandos CQRS via REST
│   ├── HttpAppointmentAdapter.ts #   CRUD de citas via REST
│   ├── SignalRAdapter.ts         #   Tiempo real via SignalR
│   └── SocketIoAdapter.ts        #   Tiempo real via Socket.IO (alternativo)
├── hooks/                        # Hooks especializados
│   ├── useCheckIn.ts             #   Registro de pacientes
│   ├── useCashierStation.ts      #   5 operaciones de caja
│   ├── useMedicalStation.ts      #   4 operaciones medicas
│   ├── useConsultingRooms.ts     #   Activar/desactivar consultorios
│   ├── useWaitingRoom.tsx        #   Polling + SignalR + estado de conexion
│   ├── useQueueAsAppointments.ts #   Transformacion de datos
│   ├── useAppointmentsWebSocket.ts # Tiempo real de citas
│   └── useAppointmentRegistration.ts # Registro con proteccion double-submit
├── context/                      # Contextos de React
│   ├── DependencyContext.tsx      #   Inyeccion de dependencias
│   └── AlertContext.tsx           #   Sistema de alertas toast
├── components/                   # Componentes UI
│   ├── AppointmentCard/          #   Tarjetas de turno (3 variantes)
│   ├── AppointmentRegistrationForm/ # Formulario de registro
│   ├── WaitingRoom/              #   4 componentes de monitor
│   ├── RealtimeAppointments/     #   Pantalla de turnos en tiempo real
│   ├── Navbar/                   #   Barra de navegacion
│   ├── Alert.tsx                 #   Componente de alerta toast
│   ├── WebSocketStatus.tsx       #   Indicador de conexion
│   ├── NetworkStatus.tsx         #   Estado de red
│   ├── AppointmentSkeleton.tsx   #   Loading skeleton
│   └── FormLoadingOverlay.tsx    #   Overlay de carga
├── services/                     # Servicios de infraestructura
│   ├── api/types.ts              #   DTOs y view models
│   ├── api/waitingRoom.ts        #   Cliente REST (queries + commands)
│   ├── api/errorTranslations.ts  #   Traduccion de errores API → español
│   ├── signalr/waitingRoomSignalR.ts # Conexion SignalR Hub
│   └── AudioService.ts           #   Notificaciones de audio
├── lib/httpClient.ts             # Cliente HTTP con Circuit Breaker
├── repositories/                 # Repositorios (patron legacy)
├── config/env.ts                 # Variables de entorno tipadas
├── security/sanitize.ts          # Sanitizacion de input
├── styles/                       # Estilos globales y modulos CSS
└── proxi.ts                      # Middleware
```

## Caracteristicas tecnicas

### Resiliencia

- **Circuit Breaker** en `httpClient.ts`: 5 fallos → apertura, cooldown de 10s, half-open con reintento
- **Retry automatico** con backoff exponencial (300ms × 2^intento, hasta 3 reintentos)
- **Timeout configurable** via `AbortController` (default 4s)
- **Proteccion double-submit** en hooks con `inFlightRef`
- **Prevencion de memory leaks** con `isMountedRef` en componentes desmontados
- **Manejo de errores tipificado** (`TIMEOUT`, `RATE_LIMIT`, `SERVER_ERROR`, `CIRCUIT_OPEN`)

### Tiempo real

- **SignalR** como canal principal (WebSocket → SSE → LongPolling, con auto-reconnect)
- **Polling** como fallback (intervalo configurable, default 3s)
- **Estado de conexion** derivado: `connecting` | `online` | `degraded` | `offline`
- **Refresco inmediato** via evento custom `rlapp:command-success` tras cada comando
- **Notificaciones de audio** al cambiar turno (con desbloqueo por interaccion del usuario)

### CQRS (Command Query Responsibility Segregation)

- **12 comandos** via `ICommandGateway` (check-in, pagos, consultas, consultorios)
- **5 queries** via `IQueryGateway` (monitor, estado de cola, siguiente turno, historial, rebuild)
- **Idempotencia** con headers `X-Correlation-Id` y `X-Idempotency-Key`
- **Traduccion de errores** de backend (ingles) a UX (español) via `errorTranslations.ts`

### Seguridad

- Sanitizacion de input (`sanitize.ts`)
- TypeScript estricto (`strict: true`, sin `any` en codigo fuente)
- Validacion de formularios con Zod
- Headers de correlacion e idempotencia en cada comando

## Testing

### Stack de pruebas

| Herramienta | Uso |
|---|---|
| Jest 30 | Test runner principal |
| Testing Library | Renderizado y consultas de componentes |
| MSW 2 | Servidor mock para interceptar peticiones HTTP |
| Playwright | Tests end-to-end |
| `AppointmentFactory` | Factory pattern para datos de test |
| `DependencyContext.mock` | Provider de test con mocks inyectados |

### Estructura de tests

```
test/
├── __mocks__/              # Mocks globales
├── mocks/                  # Dobles de test reutilizables (MSW, DependencyContext)
├── factories/              # Fabricas de datos (AppointmentFactory)
├── app/                    # Tests de paginas
├── components/             # Tests de componentes (8 archivos)
├── hooks/                  # Tests de hooks (2 archivos)
├── services/               # Tests de servicios y adaptadores
├── repositories/           # Tests de repositorios
├── config/                 # Tests de configuracion
├── lib/                    # Tests de httpClient
└── e2e/                    # Tests E2E con Playwright
```

### Comandos

```bash
npm test              # Ejecutar toda la suite
npm run test:watch    # Modo watch (desarrollo TDD)
npm run test:cov      # Tests con reporte de cobertura
npm run lint          # Validar codigo con ESLint
```

### Documentacion de estrategia

Consultar `docs/TESTING_STRATEGY.md` para la guia completa de TDD, verificar vs. validar, mocking y preparacion de auditoria.

## Variables de entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_POLLING_INTERVAL=3000
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_WS_DISABLED=false
NEXT_PUBLIC_DEFAULT_QUEUE_ID=QUEUE-01
```

| Variable | Descripcion | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL base del backend REST | (requerida) |
| `NEXT_PUBLIC_POLLING_INTERVAL` | Intervalo de polling en ms | `3000` |
| `NEXT_PUBLIC_WS_URL` | URL del servidor SignalR | `null` |
| `NEXT_PUBLIC_WS_DISABLED` | Deshabilitar SignalR | `false` |
| `NEXT_PUBLIC_DEFAULT_QUEUE_ID` | ID de cola por defecto | `QUEUE-01` |

## Instalacion

```bash
npm install
```

## Ejecucion en desarrollo

```bash
npm run dev
```

Aplicacion disponible en `http://localhost:3000`.

## Build produccion

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t rlapp-frontend .
docker run -p 3000:3000 rlapp-frontend
```

El Dockerfile ejecuta en modo desarrollo con hot reload (Node 20).

## API mock incluida

El proyecto incluye un endpoint mock para desarrollo sin backend:

```
GET  /api/mock/turnos    # 3 pacientes de ejemplo
POST /api/mock/turnos    # Registro con validacion
```

Para usarlo, configurar `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/mock`.

## Decisiones tecnicas

- **Arquitectura Hexagonal** con puertos e interfaces para desacoplamiento total entre dominio e infraestructura
- **Inyeccion de dependencias via React Context** en lugar de contenedor DI externo (simplicidad del frontend)
- **SignalR como canal de tiempo real** con fallback automatico a SSE y LongPolling
- **CQRS en el frontend** separando comandos (escritura) de queries (lectura) con gateways independientes
- **React Compiler habilitado** para optimizacion automatica de re-renders
- **CSS Modules** para encapsulamiento de estilos sin dependencias adicionales
- **Zod + React Hook Form** para validacion declarativa de formularios con tipado inferido
- **Circuit Breaker en httpClient** para resiliencia ante fallos del backend
- **Sin estado global** (Redux/Zustand): cada hook gestiona su propio estado, el contexto solo inyecta dependencias
- **Traducciones de errores centralizadas** para UX en español consistente
- Despliegue en contenedores
- Multi-pantalla en tiempo real

## Calidad de Código

- Sin memory leaks
- Sin loops duplicados
- Sin re-render innecesario
- Manejo de errores controlado
- Sanitización de inputs
- Código documentado
- Separación de responsabilidades

## Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm start        # Ejecutar build
npm run lint     # Lint
```

## Requisitos

- Node.js 20+
- NPM 9+

## Estado del Proyecto

**MVP funcional — estable — preparado para evolución.**
