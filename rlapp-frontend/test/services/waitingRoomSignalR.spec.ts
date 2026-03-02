/**
 * @jest-environment jsdom
 *
 * 🧪 Tests de cobertura para services/signalr/waitingRoomSignalR (Bloque B5)
 * Cubre: connect, disconnect, handlers de eventos push, reconexión,
 *        onConnected, onDisconnected, isConnected y getActiveQueueId.
 */

// ── mock @microsoft/signalr ────────────────────────────────────────────────
type EventCapture = Record<string, (...args: unknown[]) => void>;

let capturedEvents: EventCapture = {};
let mockStart: jest.Mock;
let mockStop: jest.Mock;

function buildConn(state = "Connected") {
  capturedEvents = {};
  mockStart = jest.fn().mockResolvedValue(undefined);
  mockStop = jest.fn().mockResolvedValue(undefined);

  return {
    start: mockStart,
    stop: mockStop,
    state,
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      capturedEvents[event] = cb;
    }),
    onclose: jest.fn((cb: (...args: unknown[]) => void) => {
      capturedEvents["_onclose"] = cb;
    }),
    onreconnected: jest.fn((cb: (...args: unknown[]) => void) => {
      capturedEvents["_onreconnected"] = cb;
    }),
    onreconnecting: jest.fn((cb: (...args: unknown[]) => void) => {
      capturedEvents["_onreconnecting"] = cb;
    }),
  };
}

const mockBuildFn = jest.fn();
const mockWithUrlFn = jest.fn().mockReturnThis();
const mockAutoReconnectFn = jest.fn().mockReturnThis();
const mockConfigLoggingFn = jest.fn().mockReturnThis();

jest.mock("@microsoft/signalr", () => ({
  HttpTransportType: { WebSockets: 1, ServerSentEvents: 2, LongPolling: 4 },
  HubConnectionState: {
    Connected: "Connected",
    Connecting: "Connecting",
    Reconnecting: "Reconnecting",
    Disconnected: "Disconnected",
    Disconnecting: "Disconnecting",
  },
  LogLevel: { Warning: 2 },
  HubConnectionBuilder: jest.fn().mockImplementation(() => ({
    withUrl: mockWithUrlFn,
    withAutomaticReconnect: mockAutoReconnectFn,
    configureLogging: mockConfigLoggingFn,
    build: mockBuildFn,
  })),
}));

process.env.NEXT_PUBLIC_WS_DISABLED = "false";
process.env.NEXT_PUBLIC_WS_URL = "http://localhost:5000";
process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000";

import {
  connect,
  disconnect,
  getActiveQueueId,
  isConnected,
} from "@/services/signalr/waitingRoomSignalR";

// ── suite ─────────────────────────────────────────────────────────────────────
describe("waitingRoomSignalR", () => {
  beforeEach(() => {
    const conn = buildConn("Disconnected");
    mockBuildFn.mockReturnValue(conn);
  });

  afterEach(async () => {
    await disconnect();
    jest.clearAllMocks();
  });

  // ── 1. connect() crea una conexión ────────────────────────────────────────
  it("connect() devuelve una conexión no nula", async () => {
    const conn = await connect("Q1");
    expect(conn).not.toBeNull();
    expect(mockBuildFn).toHaveBeenCalled();
  });

  // ── 2. connect() llama a start() ─────────────────────────────────────────
  it("connect() llama a start() en la nueva conexión", async () => {
    await connect("Q1");
    expect(mockStart).toHaveBeenCalled();
  });

  // ── 3. getActiveQueueId almacena el queueId ───────────────────────────────
  it("getActiveQueueId() devuelve el queueId usado en connect()", async () => {
    await connect("Q1");
    expect(getActiveQueueId()).toBe("Q1");
  });

  // ── 4. isConnected refleja estado Connected ───────────────────────────────
  it("isConnected() devuelve true si el estado de la conexión es Connected", async () => {
    const connectedConn = buildConn("Connected");
    mockBuildFn.mockReturnValue(connectedConn);
    await connect("Q1");
    expect(isConnected()).toBe(true);
  });

  // ── 5. handler onMonitor — MonitorUpdated ─────────────────────────────────
  it("onMonitor handler se invoca al recibir MonitorUpdated", async () => {
    const onMonitor = jest.fn();
    await connect("Q1", { onMonitor });
    const handler = capturedEvents["MonitorUpdated"] as (p: unknown) => void;
    handler?.({ data: "monitor-payload" });
    expect(onMonitor).toHaveBeenCalledWith({ data: "monitor-payload" });
  });

  // ── 6. handler onQueueState — QueueStateUpdated ───────────────────────────
  it("onQueueState handler se invoca al recibir QueueStateUpdated", async () => {
    const onQueueState = jest.fn();
    await connect("Q1", { onQueueState });
    const handler = capturedEvents["QueueStateUpdated"] as (p: unknown) => void;
    handler?.({ count: 3 });
    expect(onQueueState).toHaveBeenCalledWith({ count: 3 });
  });

  // ── 7. handler onNextTurn — NextTurn ──────────────────────────────────────
  it("onNextTurn handler se invoca al recibir NextTurn", async () => {
    const onNextTurn = jest.fn();
    await connect("Q1", { onNextTurn });
    const handler = capturedEvents["NextTurn"] as (p: unknown) => void;
    handler?.({ patientId: "p1" });
    expect(onNextTurn).toHaveBeenCalledWith({ patientId: "p1" });
  });

  // ── 8. handler onRecentHistory — RecentHistoryUpdated ────────────────────
  it("onRecentHistory handler se invoca al recibir RecentHistoryUpdated", async () => {
    const onRecentHistory = jest.fn();
    await connect("Q1", { onRecentHistory });
    const handler = capturedEvents["RecentHistoryUpdated"] as (p: unknown) => void;
    handler?.([{ patientId: "p0" }]);
    expect(onRecentHistory).toHaveBeenCalled();
  });

  // ── 9. handler onAny vía projectionUpdated ────────────────────────────────
  it("onAny handler se invoca al recibir projectionUpdated con nombre del evento", async () => {
    const onAny = jest.fn();
    await connect("Q1", { onAny });
    const handler = capturedEvents["projectionUpdated"] as (p: unknown) => void;
    handler?.({ queueId: "Q1" });
    expect(onAny).toHaveBeenCalledWith("projectionUpdated", { queueId: "Q1" });
  });

  // ── 10. onMonitor también se invoca vía projectionUpdated ────────────────
  it("onMonitor también se invoca al recibir projectionUpdated", async () => {
    const onMonitor = jest.fn();
    await connect("Q1", { onMonitor });
    const handler = capturedEvents["projectionUpdated"] as (p: unknown) => void;
    handler?.({ queueId: "Q1" });
    expect(onMonitor).toHaveBeenCalledWith({ queueId: "Q1" });
  });

  // ── 11. onConnected tras start() exitoso ─────────────────────────────────
  it("onConnected se invoca tras start() exitoso", async () => {
    const onConnected = jest.fn();
    await connect("Q1", { onConnected });
    expect(onConnected).toHaveBeenCalled();
  });

  // ── 12. onConnected en reconexión ────────────────────────────────────────
  it("onConnected se invoca al reconectarse (onreconnected)", async () => {
    const onConnected = jest.fn();
    await connect("Q1", { onConnected });
    onConnected.mockClear();

    const reconnectedHandler = capturedEvents["_onreconnected"] as (id?: string) => void;
    reconnectedHandler?.("new-conn-id");
    expect(onConnected).toHaveBeenCalled();
  });

  // ── 13. onDisconnected al cerrar ─────────────────────────────────────────
  it("onDisconnected se invoca cuando la conexión se cierra sin error", async () => {
    const onDisconnected = jest.fn();
    await connect("Q1", { onDisconnected });
    const closeHandler = capturedEvents["_onclose"] as (err?: unknown) => void;
    closeHandler?.();
    expect(onDisconnected).toHaveBeenCalled();
  });

  // ── 14. disconnect() limpia la conexión ──────────────────────────────────
  it("disconnect() llama a stop() y deja getActiveQueueId = null", async () => {
    await connect("Q1");
    await disconnect();
    expect(mockStop).toHaveBeenCalled();
    expect(getActiveQueueId()).toBeNull();
  });

  // ── 15. connect() no lanza si start() falla (captura internamente) ────────
  it("connect() no lanza al llamador si start() falla tras maxAttempts", async () => {
    mockStart.mockRejectedValue(new Error("connection refused"));
    await expect(connect("Q1")).resolves.not.toThrow();
  });

  // ── 16. Reutiliza conexión activa ─────────────────────────────────────────
  it("connect() reutiliza la conexión si ya está en estado Connected", async () => {
    // Primera conexión
    const connectedConn = buildConn("Connected");
    mockBuildFn.mockReturnValue(connectedConn);
    const first = await connect("Q1");

    mockBuildFn.mockClear();
    // Segunda conexión: debe reutilizar
    const second = await connect("Q1");
    expect(mockBuildFn).not.toHaveBeenCalled();
    expect(first).toBe(second);
  });

  // ── 17. onReconnecting logging sin error ─────────────────────────────────
  it("onreconnecting no lanza cuando err es undefined", async () => {
    await connect("Q1");
    const reconnectingHandler = capturedEvents["_onreconnecting"] as (err?: unknown) => void;
    expect(() => reconnectingHandler?.()).not.toThrow();
  });
});
