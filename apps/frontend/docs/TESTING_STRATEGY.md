# Testing strategy — rlapp frontend

**Fecha:** 2 de marzo de 2026
**Equipo:** rlapp
**Stack verificado:** Next.js 16 · TypeScript 5 · Jest 30 · Testing Library · MSW 2

---

## 1. Principio central: verificar vs. validar

La suite de pruebas del frontend se organiza en torno a dos responsabilidades explícitas y no
intercambiables:

| Dimensión | Definición | Pregunta que responde |
|---|---|---|
| Verificar | Confirmar que las piezas arquitectónicas se invocan correctamente entre sí (puertos, adaptadores, hooks). La lógica concreta no importa; importa que el contrato se cumpla. | ¿La capa A llama correctamente al puerto B? |
| Validar | Confirmar que las reglas de negocio producen el resultado correcto desde la perspectiva del usuario o del dominio. | ¿El sistema se comporta bien ante este escenario de negocio? |

Ambas categorías son obligatorias. Un test de verificación sustituye a un test de validación sin
eliminar su necesidad, y viceversa.

---

## 2. Tests que verifican la arquitectura (puertos e interfaces)

### 2.1 Definición

Un test de verificación comprueba que una unidad (hook, use case, componente) delega en el puerto
correcto con el payload correcto. El adaptador concreto se reemplaza por un mock tipado a la
interfaz del puerto (`jest.Mocked<InterfaceName>`).

### 2.2 Ejemplo canónico: `useAppointmentRegistration` llama al puerto de repositorio

**Archivo de test:** `test/hooks/useAppointmentRegistration.spec.ts`

```typescript
// Dependencias mockeadas y razón:
//   mockRepository: jest.Mocked<AppointmentRepository>
//     → Se simula el puerto de dominio AppointmentRepository para que el test
//       no dependa de la infraestructura real (fetch, URL, headers).
//       El mock se construye tipado a la interfaz, por lo que cualquier cambio
//       en el puerto rompe el mock en tiempo de compilación. // HUMAN CHECK

jest.mock("@/context/DependencyContext", () => ({
  useDependencies: jest.fn(() => ({
    repository: mockRepository,
    realTime: {},
  })),
}));

it("llama a repository.createAppointment con el payload correcto", async () => {
  const payload: CreateAppointmentDTO = {
    idCard: "123456789",
    fullName: "John Doe",
    priority: "Medium",
  };
  mockRepository.createAppointment.mockResolvedValue({
    id: "apt-001",
    message: "Turno registrado exitosamente.",
  });

  const { result } = renderHook(() => useAppointmentRegistration());
  await act(async () => { await result.current.register(payload); });

  // VERIFICACIÓN ARQUITECTÓNICA: el hook delegó en el puerto, no en un adaptador concreto.
  expect(mockRepository.createAppointment).toHaveBeenCalledTimes(1);
  expect(mockRepository.createAppointment).toHaveBeenCalledWith(
    expect.objectContaining({ idCard: "123456789", fullName: "John Doe" }),
  );
});
```

**Qué se mockea y por qué:**

| Dependencia | Mock | Razón |
|---|---|---|
| `DependencyContext` | `mockRepository: jest.Mocked<AppointmentRepository>` | Aislar la lógica de la capa de aplicación; el test no debe saber si el adaptador usa `fetch`, `axios` o IndexedDB. |
| `realTime` | Objeto vacío `{}` | El hook de registro no requiere tiempo real; inyectar `{}` documenta explícitamente que ese puerto no es relevante para este caso. |

---

### 2.3 Ejemplo canónico: `useWaitingRoom` invoca los cuatro puertos de servicio al montar

**Archivo de test:** `test/hooks/useWaitingRoom.spec.ts`

```typescript
// Dependencias mockeadas y razón:
//   mockGetMonitor, mockGetQueueState, mockGetNextTurn, mockGetRecentHistory
//     → Representan los cuatro puertos de consulta de la sala de espera.
//       Se mockean a nivel de módulo para interceptar todas las llamadas
//       sin modificar la implementación real de services/api/waitingRoom.
//   mockSignalRConnect / mockSignalRDisconnect
//     → Puerto de tiempo real (SignalR). Se mockea para no requerir
//       conexión WebSocket activa ni servidor de Hub en los tests unitarios.
//   mockShowError
//     → Puerto de notificaciones UI. Se mockea para verificar que el hook
//       delega correctamente los errores hacia la capa de presentación.

it("llama a getMonitor, getQueueState, getNextTurn y getRecentHistory al montar", async () => {
  renderHook(() => useWaitingRoom("Q1", 99999));

  await waitFor(() => {
    // VERIFICACIÓN ARQUITECTÓNICA: el hook orquesta los cuatro puertos de lectura.
    expect(mockGetMonitor).toHaveBeenCalledWith("Q1");
    expect(mockGetQueueState).toHaveBeenCalledWith("Q1");
    expect(mockGetNextTurn).toHaveBeenCalledWith("Q1");
    expect(mockGetRecentHistory).toHaveBeenCalledWith("Q1", 100);
  });
});
```

**Qué se mockea y por qué:**

| Dependencia | Mock | Razón |
|---|---|---|
| `services/api/waitingRoom` (4 funciones) | `jest.fn()` con datos fixture | Sustitución del adaptador HTTP. El test verifica el contrato de llamada (argumentos, cantidad), no la implementación de red. |
| `services/signalr/waitingRoomSignalR` | `mockSignalRConnect`, `mockSignalRDisconnect` | Sustituye el adaptador SignalR concreto por el puerto abstracto. Si el adaptador cambia de SignalR a WebSocket nativo, el test no debe modificarse: verifica la interfaz, no la tecnología. |
| `context/AlertContext` | `mockShowError` | Puerto de presentación. Se mockea para verificar que los errores se delegan hacia arriba, no para testear la implementación del toast. |

---

## 3. Tests que validan el negocio (reglas de dominio y flujos de usuario)

### 3.1 Definición

Un test de validación comprueba que el sistema produce el resultado correcto ante un escenario
concreto de negocio. Se fija en valores de estado, mensajes visibles en pantalla y transiciones
de estados de dominio.

### 3.2 Ejemplo canónico: el estado de conexión degrada tras tres fallos consecutivos

**Archivo de test:** `test/hooks/useWaitingRoom.spec.ts`

```typescript
// Regla de negocio validada:
//   Un usuario en la sala de espera no debe ver una pantalla de "cargando" indefinida.
//   Tras tres fallos consecutivos de red, el sistema debe informar estado "degraded"
//   para que la UI pueda mostrar un aviso de conectividad y no un spinner infinito.
//   Esta regla protege la experiencia clínica: el paciente sabe si su turno
//   puede estar desactualizado.

it("establece connectionState = 'degraded' tras tres refresh fallidos consecutivos", async () => {
  mockGetMonitor.mockRejectedValue(new Error("network error"));
  mockGetQueueState.mockRejectedValue(new Error("network error"));

  const { result } = renderHook(() => useWaitingRoom("Q1", 99999));

  // Primer fallo al montar → "connecting" (el sistema aún intenta recuperarse)
  await waitFor(() => expect(result.current.connectionState).toBe("connecting"));

  // Segundo y tercer fallo explícitos
  await act(async () => { result.current.refresh(); });
  await waitFor(() => expect(mockGetMonitor).toHaveBeenCalledTimes(2));

  await act(async () => { result.current.refresh(); });
  await waitFor(() => expect(mockGetMonitor).toHaveBeenCalledTimes(3));

  // VALIDACIÓN DE NEGOCIO: tras tres fallos, la degradación es visible en el estado.
  await waitFor(() => {
    expect(result.current.connectionState).toBe("degraded");
  });
});
```

**Por qué es validación y no verificación:**

El test no comprueba si se llamó a un puerto; comprueba que el *valor semántico* del estado
`connectionState` es `"degraded"`. Esa regla proviene del dominio ("tres fallos = servicio
degradado") y sería igual aunque el adaptador de red cambiara completamente.

---

### 3.3 Ejemplo canónico: `nextTurn` queda nulo cuando no hay turno activo (saldo fantasma)

**Archivo de test:** `test/hooks/useWaitingRoom.spec.ts`

```typescript
// Regla de negocio validada:
//   Cuando la proyección de la fila no tiene ningún paciente con turno activo,
//   el campo nextTurn debe ser null. Mostrar un turno inexistente sería un
//   "turno fantasma": el sistema le indicaría al staff llamar a alguien
//   que no existe o que ya fue atendido, comprometiendo la integridad
//   operativa de la clínica. // HUMAN CHECK — corresponde al ADR-004 (event-sourcing).

it("nextTurn queda null cuando getNextTurn devuelve null (sin turno activo)", async () => {
  // Escenario: la proyección consultada confirma que la fila está vacía.
  mockGetNextTurn.mockResolvedValue(null);

  const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
  await waitFor(() => expect(result.current.connectionState).toBe("online"));

  // VALIDACIÓN DE NEGOCIO: ningún turno fantasma llega al componente visual.
  expect(result.current.nextTurn).toBeNull();
});
```

---

### 3.4 Ejemplo canónico: evento externo dispara refetch sólo para la fila correcta

**Archivo de test:** `test/hooks/useWaitingRoom.spec.ts`

```typescript
// Regla de negocio validada:
//   Al ejecutar un comando (ej. "llamar siguiente"), el sistema debe refrescar
//   únicamente la vista de la fila afectada, no la de todas las filas abiertas.
//   Impide actualizaciones cruzadas entre salas de espera de distintos consultorios.

it("dispara un refresh al recibir rlapp:command-success con el mismo queueId", async () => {
  const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
  await waitFor(() => expect(result.current.connectionState).toBe("online"));
  mockGetMonitor.mockClear();

  await act(async () => {
    window.dispatchEvent(
      new CustomEvent("rlapp:command-success", { detail: { queueId: "Q1" } }),
    );
  });

  await waitFor(() => expect(mockGetMonitor).toHaveBeenCalledTimes(1));
});

it("no dispara refresh al recibir rlapp:command-success con queueId diferente", async () => {
  const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
  await waitFor(() => expect(result.current.connectionState).toBe("online"));
  mockGetMonitor.mockClear();

  await act(async () => {
    window.dispatchEvent(
      new CustomEvent("rlapp:command-success", { detail: { queueId: "OTRO-ID" } }),
    );
    await Promise.resolve();
  });

  // VALIDACIÓN DE NEGOCIO: cero refetch para la sala equivocada.
  expect(mockGetMonitor).not.toHaveBeenCalled();
});
```

---

## 4. Mapa completo de mocks por capa

| Capa | Dependencia mockeada | Tipo de mock | Razón |
|---|---|---|---|
| Dominio | `AppointmentRepository` | `jest.Mocked<AppointmentRepository>` | Puerto de dominio; aislar la aplicación de la infraestructura de datos |
| Dominio | `RealTimePort` | `jest.Mocked<RealTimePort>` | Puerto de tiempo real; aislar la aplicación del adaptador de transporte (Socket.IO / SignalR) |
| Infraestructura | `services/api/waitingRoom` | `jest.fn()` por función exportada | Adaptador HTTP; sustituir fetch real por respuestas controladas |
| Infraestructura | `services/signalr/waitingRoomSignalR` | `jest.fn()` por función exportada | Adaptador SignalR; eliminar dependencia de HubConnection real en tests unitarios |
| Infraestructura | `global.fetch` | `jest.fn()` via `mockFetchOk` / `mockFetchError` | Tests de integración de servicios API con respuestas simuladas sin servidor |
| Presentación | `context/AlertContext` (`showError`) | `jest.fn()` | Puerto de notificación UI; verificar que los errores se delegan sin testear el toast concreto |
| Presentación | `context/DependencyContext` | `jest.fn()` que retorna mocks tipados | Contenedor de inyección de dependencias; proveer mocks en lugar de adaptadores reales |
| Tiempo real (integración) | MSW `http.get` / `http.post` handlers | Interceptor de red a nivel proceso | Tests de integración de servicios; el código real hace fetch pero la red está interceptada |

---

## 5. Clasificación de la suite por tipo

| Tipo | Patron de archivo | Cantidad aproximada | Herramientas |
|---|---|---|---|
| Unitario de dominio | `test/domain/**` | Bajo | Jest puro |
| Unitario de aplicación (verificación) | `test/hooks/**`, `test/application/**` | Alto | Jest + Testing Library + mocks tipados |
| Unitario de componente (validación UI) | `test/components/**`, `test/app/**` | Alto | Jest + Testing Library + MSW |
| Integración de servicio (verificación + validación) | `test/services/**` | Medio | Jest + `global.fetch` mock / MSW |
| Integración de adaptador (verificación) | `test/infrastructure/**` | Medio | Jest + mocks de `@microsoft/signalr` |
| Extremo a extremo | `test/e2e/**` | Bajo | Playwright |

**Proporción objetivo:** >85% pruebas unitarias y de integración; <15% E2E.

---

## 6. Comandos de ejecución

```bash
# Ejecutar suite completa
npm test

# Ejecutar con cobertura (genera test-results/coverage/index.html)
npm run test:cov

# Generar reporte JSON exportable (test-results/jest-results.json)
npm run test:report

# Modo CI — sin interactividad, fuerza salida al terminar
npm run test:ci

# Filtrar por dominio
npx jest --testPathPattern="registration|waiting-room"
npx jest --testPathPattern="hooks/useWaitingRoom"
```

**Umbral mínimo de cobertura:**

| Métrica | Umbral |
|---|---|
| Líneas | 80% |
| Sentencias | 80% |
| Funciones | 80% |
| Ramas | 70% |

---

## 7. Reglas de calidad de la suite

- Prohibido usar `any` en archivos de test; todos los mocks se tipan a la interfaz del puerto.
- Cada mock debe tener un comentario de una línea explicando por qué se simula esa dependencia.
- Los tests de verificación afirman sobre llamadas (`toHaveBeenCalledWith`).
- Los tests de validación afirman sobre estado o salida visible (`toEqual`, `toBeInTheDocument`, `toBe`).
- Un test no debe afirmar sobre ambas dimensiones simultáneamente; separar en dos `it` si es necesario.
- Los fixtures de datos se definen con `const` tipado en el bloque de módulo, fuera de los `describe`.

---

## 8. Trazabilidad

Cada bloque de implementación TDD se registra en [docs/AI_WORKFLOW.md](../AI_WORKFLOW.md) con las
fases Red / Green / Refactor, commit hash y métricas de cobertura resultantes.
