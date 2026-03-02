/**
 * @jest-environment jsdom
 *
 * 🧪 Tests de cobertura para SignalRAdapter (Bloque B4)
 * Cubre: connect, disconnect, onSnapshot, onAppointmentUpdated, onConnect,
 *        onDisconnect, onError, isConnected, reconexión y WS_DISABLED.
 */

// ── mock @microsoft/signalr ────────────────────────────────────────────────
type EventCapture = Record<string, (...args: unknown[]) => void>;

let capturedHandlers: EventCapture = {};
let mockStart: jest.Mock;
let mockStop: jest.Mock;

function buildMockConn() {
  capturedHandlers = {};
  mockStart = jest.fn().mockResolvedValue(undefined);
  mockStop = jest.fn().mockResolvedValue(undefined);

  return {
    start: mockStart,
    stop: mockStop,
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      capturedHandlers[event] = cb;
    }),
    onclose: jest.fn((cb: (...args: unknown[]) => void) => {
      capturedHandlers["_close"] = cb;
    }),
    onreconnected: jest.fn((cb: (...args: unknown[]) => void) => {
      capturedHandlers["_reconnected"] = cb;
    }),
    onreconnecting: jest.fn((cb: (...args: unknown[]) => void) => {
      capturedHandlers["_reconnecting"] = cb;
    }),
  };
}

const mockBuild = jest.fn();
const mockBuilderInstance = {
  withUrl: jest.fn().mockReturnThis(),
  withAutomaticReconnect: jest.fn().mockReturnThis(),
  configureLogging: jest.fn().mockReturnThis(),
  build: mockBuild,
};

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
  HubConnectionBuilder: jest.fn().mockImplementation(() => mockBuilderInstance),
}));

// ── mock config/env ──────────────────────────────────────────────────────────
jest.mock("@/config/env", () => ({
  env: { WS_DISABLED: false, WS_URL: "http://localhost:5000" },
}));

import { SignalRAdapter } from "@/infrastructure/adapters/SignalRAdapter";

// ── suite ─────────────────────────────────────────────────────────────────────
describe("SignalRAdapter", () => {
  let adapter: SignalRAdapter;

  beforeEach(() => {
    const conn = buildMockConn();
    mockBuild.mockReturnValue(conn);
    adapter = new SignalRAdapter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Estado inicial ──────────────────────────────────────────────────────
  it("isConnected() devuelve false antes de llamar connect()", () => {
    expect(adapter.isConnected()).toBe(false);
  });

  // ── 2. connect() inicia la conexión ───────────────────────────────────────
  it("connect() llama a HubConnectionBuilder y start()", async () => {
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockBuild).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
  });

  // ── 3. isConnected = true tras start exitoso ──────────────────────────────
  it("isConnected() devuelve true después de que start() resuelve y onConnect es invocado", async () => {
    const connectCb = jest.fn();
    adapter.onConnect(connectCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));
    expect(connectCb).toHaveBeenCalled();
    expect(adapter.isConnected()).toBe(true);
  });

  // ── 4. disconnect() llama a stop() ───────────────────────────────────────
  it("disconnect() llama a stop() y deja isConnected = false", async () => {
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));
    adapter.disconnect();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockStop).toHaveBeenCalled();
    expect(adapter.isConnected()).toBe(false);
  });

  // ── 5. onSnapshot registra y recibe datos ─────────────────────────────────
  it("onSnapshot recibe datos al dispararse APPOINTMENTS_SNAPSHOT", async () => {
    const snapshotCb = jest.fn();
    adapter.onSnapshot(snapshotCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));

    const handler = capturedHandlers["APPOINTMENTS_SNAPSHOT"] as (p: { data: unknown[] }) => void;
    handler?.({ data: [{ id: "a1", fullName: "Test" }] });
    expect(snapshotCb).toHaveBeenCalledWith([{ id: "a1", fullName: "Test" }]);
  });

  // ── 6. onSnapshot con payload sin data ────────────────────────────────────
  it("onSnapshot devuelve array vacío cuando el payload no tiene data", async () => {
    const snapshotCb = jest.fn();
    adapter.onSnapshot(snapshotCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));

    const handler = capturedHandlers["APPOINTMENTS_SNAPSHOT"] as (p: unknown) => void;
    handler?.({});
    expect(snapshotCb).toHaveBeenCalledWith([]);
  });

  // ── 7. onAppointmentUpdated registra y recibe datos ───────────────────────
  it("onAppointmentUpdated recibe el objeto al dispararse APPOINTMENT_UPDATED", async () => {
    const updateCb = jest.fn();
    adapter.onAppointmentUpdated(updateCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));

    const handler = capturedHandlers["APPOINTMENT_UPDATED"] as (p: { data: unknown }) => void;
    handler?.({ data: { id: "a2", fullName: "Otro" } });
    expect(updateCb).toHaveBeenCalledWith({ id: "a2", fullName: "Otro" });
  });

  // ── 8. onError se invoca cuando start() falla ─────────────────────────────
  it("onError se invoca cuando start() rechaza con un Error", async () => {
    const err = new Error("connection refused");
    mockStart.mockRejectedValueOnce(err);
    const errCb = jest.fn();
    adapter.onError(errCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 10));
    expect(errCb).toHaveBeenCalledWith(err);
  });

  // ── 9. onError convierte string en Error cuando start() falla con string ──
  it("onError envuelve el fallo en un Error si start() rechaza con string", async () => {
    mockStart.mockRejectedValueOnce("network error");
    const errCb = jest.fn();
    adapter.onError(errCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 10));
    expect(errCb).toHaveBeenCalledWith(expect.any(Error));
  });

  // ── 10. onDisconnect se invoca en onclose ─────────────────────────────────
  it("onDisconnect se invoca cuando la conexión se cierra", async () => {
    const disconnectCb = jest.fn();
    adapter.onDisconnect(disconnectCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));

    const closeHandler = capturedHandlers["_close"] as (err?: unknown) => void;
    closeHandler?.();
    expect(disconnectCb).toHaveBeenCalled();
  });

  // ── 11. onError se invoca desde onclose con Error ────────────────────────
  it("onError se invoca cuando onclose recibe un Error", async () => {
    const errCb = jest.fn();
    adapter.onError(errCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));

    const closeHandler = capturedHandlers["_close"] as (err?: unknown) => void;
    closeHandler?.(new Error("closed with error"));
    expect(errCb).toHaveBeenCalledWith(new Error("closed with error"));
  });

  // ── 12. onConnect se invoca en reconexión ────────────────────────────────
  it("onConnect se invoca de nuevo al reconectarse (onreconnected)", async () => {
    const connectCb = jest.fn();
    adapter.onConnect(connectCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));
    connectCb.mockClear();

    const reconnectedHandler = capturedHandlers["_reconnected"] as () => void;
    reconnectedHandler?.();
    expect(connectCb).toHaveBeenCalledTimes(1);
  });

  // ── 13. onAppointmentCalled es alias de onAppointmentUpdated ─────────────
  it("onAppointmentCalled registra el mismo callback que onAppointmentUpdated", async () => {
    const calledCb = jest.fn();
    adapter.onAppointmentCalled(calledCb);
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));

    const handler = capturedHandlers["APPOINTMENT_UPDATED"] as (p: { data: unknown }) => void;
    handler?.({ data: { id: "a3" } });
    expect(calledCb).toHaveBeenCalled();
  });

  // ── 14. Doble connect reemplaza conexión anterior ────────────────────────
  it("un segundo connect() detiene la conexión anterior y crea una nueva", async () => {
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));
    // Segunda llamada
    adapter.connect();
    await new Promise((r) => setTimeout(r, 0));
    // stop() se llama en el segundo connect para limpiar la primera conexión
    expect(mockStop).toHaveBeenCalled();
  });
});
