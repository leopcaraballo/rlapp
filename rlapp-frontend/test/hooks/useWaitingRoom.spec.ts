/**
 * @jest-environment jsdom
 *
 * 🧪 Tests de cobertura para useWaitingRoom (Bloque B2)
 * Cubre: estado inicial, fetch al montar, datos en estado, connectionState,
 *        refresh manual, error paths, lastUpdated y evento rlapp:command-success.
 */
import { act, renderHook, waitFor } from "@testing-library/react";

// ── mock services/api/waitingRoom ─────────────────────────────────────────
const mockGetMonitor = jest.fn();
const mockGetQueueState = jest.fn();
const mockGetNextTurn = jest.fn();
const mockGetRecentHistory = jest.fn();

jest.mock("@/services/api/waitingRoom", () => ({
  getMonitor: (...args: unknown[]) => mockGetMonitor(...args),
  getQueueState: (...args: unknown[]) => mockGetQueueState(...args),
  getNextTurn: (...args: unknown[]) => mockGetNextTurn(...args),
  getRecentHistory: (...args: unknown[]) => mockGetRecentHistory(...args),
}));

// ── mock services/signalr/waitingRoomSignalR ──────────────────────────────
const mockSignalRConnect = jest.fn().mockResolvedValue(null);
const mockSignalRDisconnect = jest.fn().mockResolvedValue(undefined);
const mockSignalRIsConnected = jest.fn().mockReturnValue(false);

jest.mock("@/services/signalr/waitingRoomSignalR", () => ({
  connect: (...args: unknown[]) => mockSignalRConnect(...args),
  disconnect: (...args: unknown[]) => mockSignalRDisconnect(...args),
  isConnected: () => mockSignalRIsConnected(),
}));

// ── mock context/AlertContext ─────────────────────────────────────────────
const mockShowError = jest.fn();
// Objeto estable: misma referencia en cada llamada a useAlert()
// Necesario para que useCallback([queueId, alert]) no cambie en cada render
const mockAlert = {
  showError: mockShowError,
  showSuccess: jest.fn(),
  showInfo: jest.fn(),
};

jest.mock("@/context/AlertContext", () => ({
  useAlert: () => mockAlert,
}));

import { useWaitingRoom } from "@/hooks/useWaitingRoom";
import type {
  NextTurnView,
  QueueStateView,
  RecentAttentionRecordView,
  WaitingRoomMonitorView,
} from "@/services/api/types";

// ── fixtures ────────────────────────────────────────────────────────────────
const MONITOR: WaitingRoomMonitorView = {
  queueId: "Q1",
  totalPatientsWaiting: 5,
  highPriorityCount: 1,
  normalPriorityCount: 3,
  lowPriorityCount: 1,
  lastPatientCheckedInAt: null,
  averageWaitTimeMinutes: 10,
  utilizationPercentage: 50,
  projectedAt: "2026-03-02T10:00:00Z",
};

const QUEUE_STATE: QueueStateView = {
  queueId: "Q1",
  currentCount: 5,
  maxCapacity: 20,
  isAtCapacity: false,
  availableSpots: 15,
  patientsInQueue: [],
  projectedAt: "2026-03-02T10:00:00Z",
};

const NEXT_TURN: NextTurnView = {
  queueId: "Q1",
  patientId: "p1",
  patientName: "Juan",
  priority: "Medium",
  consultationType: "General",
  status: "Called",
  claimedAt: null,
  calledAt: "2026-03-02T10:00:00Z",
  stationId: null,
  projectedAt: "2026-03-02T10:00:00Z",
};

const HISTORY: RecentAttentionRecordView[] = [
  {
    queueId: "Q1",
    patientId: "p0",
    patientName: "Maria",
    priority: "Low",
    consultationType: "General",
    completedAt: "2026-03-02T09:00:00Z",
  },
];

// ── suite ────────────────────────────────────────────────────────────────────
describe("useWaitingRoom", () => {
  beforeEach(() => {
    mockGetMonitor.mockResolvedValue(MONITOR);
    mockGetQueueState.mockResolvedValue(QUEUE_STATE);
    mockGetNextTurn.mockResolvedValue(NEXT_TURN);
    mockGetRecentHistory.mockResolvedValue(HISTORY);
    mockSignalRConnect.mockResolvedValue(null);
    mockShowError.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Estado inicial ─────────────────────────────────────────────────────
  it("inicia con monitor, queueState, nextTurn null e history vacía", () => {
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    expect(result.current.monitor).toBeNull();
    expect(result.current.queueState).toBeNull();
    expect(result.current.nextTurn).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.connectionState).toBe("connecting");
  });

  // ── 2. Llama a los cuatro servicios al montar ─────────────────────────────
  it("llama a getMonitor, getQueueState, getNextTurn y getRecentHistory al montar", async () => {
    renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => {
      expect(mockGetMonitor).toHaveBeenCalledWith("Q1");
      expect(mockGetQueueState).toHaveBeenCalledWith("Q1");
      expect(mockGetNextTurn).toHaveBeenCalledWith("Q1");
      expect(mockGetRecentHistory).toHaveBeenCalledWith("Q1", 100);
    });
  });

  // ── 3. Actualiza estado con datos del fetch exitoso ───────────────────────
  it("actualiza monitor, queueState, nextTurn e history tras fetch exitoso", async () => {
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => {
      expect(result.current.monitor).toEqual(MONITOR);
      expect(result.current.queueState).toEqual(QUEUE_STATE);
      expect(result.current.nextTurn).toEqual(NEXT_TURN);
      expect(result.current.history).toEqual(HISTORY);
    });
  });

  // ── 4. connectionState = online tras fetch exitoso ────────────────────────
  it("establece connectionState = 'online' cuando monitor y queueState responden bien", async () => {
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => {
      expect(result.current.connectionState).toBe("online");
    });
  });

  // ── 5. Refresh manual activa re-fetch ─────────────────────────────────────
  it("llama de nuevo a los servicios al invocar refresh()", async () => {
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => expect(result.current.connectionState).toBe("online"));

    mockGetMonitor.mockClear();
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(mockGetMonitor).toHaveBeenCalledTimes(1));
  });

  // ── 6. lastUpdated es un string ISO tras fetch exitoso ────────────────────
  it("establece lastUpdated como string ISO tras fetch exitoso", async () => {
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => {
      expect(typeof result.current.lastUpdated).toBe("string");
      expect(result.current.lastUpdated).not.toBeNull();
    });
  });

  // ── 7. connectionState = connecting tras primer fallo de monitor ──────────
  it("establece connectionState = 'connecting' cuando monitor y queueState fallan (primer intento)", async () => {
    mockGetMonitor.mockRejectedValue(new Error("500 error"));
    mockGetQueueState.mockRejectedValue(new Error("500 error"));
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => {
      expect(result.current.connectionState).toBe("connecting");
    });
  });

  // ── 8. connectionState = degraded tras tres fallos consecutivos (via refresh manual) ─
  it("establece connectionState = 'degraded' tras tres refresh fallidos consecutivos", async () => {
    mockGetMonitor.mockRejectedValue(new Error("network error"));
    mockGetQueueState.mockRejectedValue(new Error("network error"));

    // Intervalo grande para evitar polling automático en tests
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => expect(result.current.connectionState).toBe("connecting"));

    // Segundo y tercer fallo via refresh manual
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(mockGetMonitor).toHaveBeenCalledTimes(2));

    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(mockGetMonitor).toHaveBeenCalledTimes(3));

    await waitFor(() => {
      expect(result.current.connectionState).toBe("degraded");
    });
  });

  // ── 9. Evento rlapp:command-success con mismo queueId dispara refresh ──────
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

  // ── 10. Evento con queueId diferente no dispara refresh ───────────────────
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
    expect(mockGetMonitor).not.toHaveBeenCalled();
  });

  // ── 11. nextTurn queda null si getNextTurn responde null ──────────────────
  it("nextTurn queda null cuando getNextTurn devuelve null (sin turno activo)", async () => {
    mockGetNextTurn.mockResolvedValue(null);
    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => expect(result.current.connectionState).toBe("online"));
    expect(result.current.nextTurn).toBeNull();
  });

  // ── 12. desmontaje limpia el intervalo y los listeners ─────────────────────
  it("no lanza errores al desmontar el hook", async () => {
    const { unmount } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => expect(mockGetMonitor).toHaveBeenCalled());
    expect(() => unmount()).not.toThrow();
  });

  // ── 13. SignalR onConnected dispara console.info y registra cleanup ────────
  it("registra signalRCleanup cuando connect retorna un objeto no-nulo", async () => {
    const fakeConn = { stop: jest.fn() };
    mockSignalRConnect.mockImplementation(
      async (_queueId: string, handlers: Record<string, (() => void) | undefined>) => {
        mockSignalRIsConnected.mockReturnValue(true);
        handlers.onConnected?.();
        return fakeConn;
      },
    );
    const { unmount } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => expect(mockSignalRConnect).toHaveBeenCalled());
    // Desmontar debe llamar a disconnect (signalRCleanup es truthy)
    unmount();
    await waitFor(() => expect(mockSignalRDisconnect).toHaveBeenCalled());
  });

  // ── 14. SignalR onDisconnected escribe en console pero no falla ────────────
  it("no lanza errores cuando signalR llama a onDisconnected", async () => {
    mockSignalRConnect.mockImplementation(
      async (_queueId: string, handlers: Record<string, (() => void) | undefined>) => {
        handlers.onDisconnected?.();
        return null;
      },
    );
    const { unmount } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => expect(mockSignalRConnect).toHaveBeenCalled());
    expect(() => unmount()).not.toThrow();
  });

  // ── 15. fetchAll outer-catch: throws sincrónicamente (lines 77-87) ──────────
  it("establece connectionState = 'connecting' cuando un servicio lanza síncronamente", async () => {
    mockGetMonitor.mockImplementation(() => { throw new Error("sync error"); });

    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() =>
      expect(result.current.connectionState).toMatch(/connecting|degraded/),
    );
    expect(result.current.monitor).toBeNull();
  });

  // ── 16. fetchAll outer-catch: showError tras 3 fallos síncronos (lines 82-87) ─
  it("llama a showError cuando failureCount alcanza 3 con errores síncronos", async () => {
    mockGetMonitor.mockImplementation(() => { throw new Error("sync error"); });

    const { result } = renderHook(() => useWaitingRoom("Q1", 99999));
    await waitFor(() => expect(result.current.connectionState).toMatch(/connecting|degraded/));

    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(mockGetMonitor).toHaveBeenCalledTimes(2));

    await act(async () => { result.current.refresh(); });
    await waitFor(() => {
      expect(result.current.connectionState).toBe("degraded");
    });
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining("Problemas de red"),
    );
  });

  // ── 17. SignalR callbacks (lines 115-119) + signalRCleanup (132) ────────────
  it("registra cleanup y ejecuta callbacks SignalR cuando conecta con éxito", async () => {
    const fakeConn = {};
    mockSignalRConnect.mockImplementation(
      async (_queueId: string, handlers: Record<string, (() => void) | undefined>) => {
        mockSignalRIsConnected.mockReturnValue(true);
        // Llamar los 5 callbacks de datos: cubre líneas 115-119 (cuerpos de arrow fn)
        handlers.onMonitor?.();
        handlers.onQueueState?.();
        handlers.onNextTurn?.();
        handlers.onRecentHistory?.();
        handlers.onAny?.();
        handlers.onConnected?.();
        return fakeConn;
      },
    );
    const { unmount } = renderHook(() => useWaitingRoom("Q1", 99999));
    // Carga inicial + al menos un disparo por los callbacks de arriba → observable
    await waitFor(() =>
      expect(mockGetMonitor.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    // Dar tiempo a que el IIFE async complete (fakeConn → signalRCleanup asignado)
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
    });
    unmount();
    await waitFor(() => expect(mockSignalRDisconnect).toHaveBeenCalled());
  });

  // ── 18. SignalR IIFE catch (line 136): connect lanza excepción ─────────────
  it("no falla cuando signalRConnect lanza una excepción (catch del IIFE)", async () => {
    mockSignalRConnect.mockRejectedValue(new Error("connection refused"));
    const { result, unmount } = renderHook(() => useWaitingRoom("Q1", 99999));
    // El polling REST sigue activo incluso si SignalR falla
    await waitFor(() => expect(result.current.connectionState).toBe("online"));
    expect(() => unmount()).not.toThrow();
  });
});
