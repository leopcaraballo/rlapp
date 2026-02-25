import { HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState,LogLevel } from "@microsoft/signalr";

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, '');

/** Si es true, todos los intentos de conectar se omiten silenciosamente. */
const WS_DISABLED = process.env.NEXT_PUBLIC_WS_DISABLED === "true";

let connection: HubConnection | null = null;

export type WaitingRoomHandlers = {
  onMonitor?: (payload: unknown) => void;
  onQueueState?: (payload: unknown) => void;
  onNextTurn?: (payload: unknown) => void;
  onRecentHistory?: (payload: unknown) => void;
  onAny?: (event: string, payload: unknown) => void;
  onConnected?: () => void;
};

/**
 * Intenta iniciar la conexión hasta `maxAttempts` veces con retroceso exponencial.
 * Aborta si `isActive()` devuelve false (conexión reemplazada o detenida externamente).
 */
async function startWithRetry(
  conn: HubConnection,
  isActive: () => boolean,
  maxAttempts = 2,
): Promise<void> {
  let attempt = 0;
  const base = 500;
  while (attempt < maxAttempts) {
    if (!isActive()) {
      throw new Error("SignalR: conexión detenida externamente, se abortan los reintentos.");
    }
    try {
      await conn.start();
      return;
    } catch (err: unknown) {
      attempt++;
      if (!isActive()) {
        throw new Error("SignalR: conexión detenida externamente durante reintento, se aborta.");
      }
      const delay = base * Math.pow(2, attempt);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`SignalR: intento ${attempt} fallido, reintentando en ${delay}ms —`, errMsg);
      await new Promise<void>((r) => setTimeout(r, delay));
    }
  }
  throw new Error("SignalR: no se pudo establecer la conexión tras los reintentos.");
}

export async function connect(queueId: string, handlers: WaitingRoomHandlers = {}) {
  // Salida rápida si SignalR está deshabilitado por variable de entorno
  if (WS_DISABLED) {
    console.info("SignalR: deshabilitado por NEXT_PUBLIC_WS_DISABLED. Usando solo polling REST.");
    return null;
  }

  // Reutilizar conexión activa; descartar si está en estado caído/deteniendo
  if (connection) {
    const state = (connection as unknown as { state?: HubConnectionState }).state;
    if (
      state === HubConnectionState.Connected ||
      state === HubConnectionState.Connecting ||
      state === HubConnectionState.Reconnecting
    ) {
      return connection;
    }
    // Conexión en estado Disconnected o Disconnecting — limpiar para reconectar
    connection = null;
  }

  const url = `${WS_BASE}/ws/waiting-room`;
  const newConn = new HubConnectionBuilder()
    .withUrl(url, {
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
      // withCredentials requerido porque el backend usa AllowCredentials() en la política CORS
      withCredentials: true,
      headers: { "X-Queue-Id": queueId },
    })
    .withAutomaticReconnect([1000, 3000, 5000])
    .configureLogging(LogLevel.Warning)
    .build();

  connection = newConn;

  // Registrar manejadores de eventos conocidos
  newConn.on("MonitorUpdated", (payload: unknown) => handlers.onMonitor?.(payload));
  newConn.on("QueueStateUpdated", (payload: unknown) => handlers.onQueueState?.(payload));
  newConn.on("NextTurn", (payload: unknown) => handlers.onNextTurn?.(payload));
  newConn.on("RecentHistoryUpdated", (payload: unknown) => handlers.onRecentHistory?.(payload));

  // Manejadores genéricos
  newConn.on("Message", (payload: unknown) => handlers.onAny?.("Message", payload));
  newConn.on("Receive", (ev: string, payload: unknown) => handlers.onAny?.(ev, payload));

  newConn.onreconnecting((err?: unknown) => {
    const msg = err instanceof Error ? err.message : err != null ? String(err) : "reconectando";
    console.warn("SignalR reconectando:", msg);
  });

  newConn.onreconnected((connectionId?: string | null) => {
    console.info("SignalR reconectado", connectionId);
    handlers.onConnected?.();
  });

  newConn.onclose((err?: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.info("SignalR: conexión cerrada con error:", msg);
    } else {
      console.info("SignalR: conexión cerrada.");
    }
  });

  try {
    // isActive: verifica que esta instancia sigue siendo la conexión vigente
    await startWithRetry(newConn, () => connection === newConn);
    handlers.onConnected?.();
  } catch (err) {
    console.warn("SignalR: fallo definitivo al iniciar la conexión:", err);
    // Limpiar para que futuros llamados a connect() puedan crear una nueva instancia
    if (connection === newConn) {
      connection = null;
    }
  }

  return connection ?? newConn;
}

export async function disconnect() {
  if (!connection) return;
  try {
    await connection.stop();
  } finally {
    connection = null;
  }
}

export function isConnected() {
  if (!connection) return false;
  // HubConnection does not always expose `state` in all typings, so narrow safely
  const connState = (connection as unknown as { state?: HubConnectionState }).state;
  return connState === HubConnectionState.Connected;
}
