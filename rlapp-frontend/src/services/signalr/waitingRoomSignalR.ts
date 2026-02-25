import { HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

/** Si es true, todos los intentos de conectar se omiten silenciosamente. */
const WS_DISABLED = process.env.NEXT_PUBLIC_WS_DISABLED === "true";

let connection: HubConnection | null = null;
/** queueId de la última conexión, usado para re-registrar tras reconexión. */
let lastQueueId: string | null = null;

export type WaitingRoomHandlers = {
  onMonitor?: (payload: unknown) => void;
  onQueueState?: (payload: unknown) => void;
  onNextTurn?: (payload: unknown) => void;
  onRecentHistory?: (payload: unknown) => void;
  onAny?: (event: string, payload: unknown) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
};

/**
 * Intenta iniciar la conexión hasta `maxAttempts` veces con retroceso exponencial.
 * Aborta si `isActive()` devuelve false (conexión reemplazada o detenida externamente).
 */
async function startWithRetry(
  conn: HubConnection,
  isActive: () => boolean,
  maxAttempts = 3,
): Promise<void> {
  let attempt = 0;
  const base = 1000;
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
      if (attempt >= maxAttempts) break;
      const delay = base * Math.pow(2, attempt - 1);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`SignalR: intento ${attempt}/${maxAttempts} fallido, reintentando en ${delay}ms —`, errMsg);
      await new Promise<void>((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`SignalR: no se pudo establecer la conexión tras ${maxAttempts} reintentos.`);
}

/**
 * Conecta al Hub de SignalR para la cola indicada.
 * Si la conexión ya existe y está activa, la reutiliza.
 *
 * Los handlers registrados escuchan eventos push del servidor.
 * El polling REST sigue siendo la fuente primaria de datos;
 * SignalR actúa como canal de baja latencia cuando el servidor emite eventos.
 */
export async function connect(queueId: string, handlers: WaitingRoomHandlers = {}): Promise<HubConnection | null> {
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

  lastQueueId = queueId;
  const url = `${WS_BASE}/ws/waiting-room`;
  const newConn = new HubConnectionBuilder()
    .withUrl(url, {
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
      // withCredentials requerido porque el backend usa AllowCredentials() en la política CORS
      withCredentials: true,
      headers: { "X-Queue-Id": queueId },
    })
    .withAutomaticReconnect([1000, 3000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build();

  connection = newConn;

  // ─── Registrar manejadores de eventos push del servidor ───
  // Estos se activarán cuando el backend soporte notificaciones push.
  newConn.on("MonitorUpdated", (payload: unknown) => handlers.onMonitor?.(payload));
  newConn.on("QueueStateUpdated", (payload: unknown) => handlers.onQueueState?.(payload));
  newConn.on("NextTurn", (payload: unknown) => handlers.onNextTurn?.(payload));
  newConn.on("RecentHistoryUpdated", (payload: unknown) => handlers.onRecentHistory?.(payload));

  // Evento genérico de actualización de proyección (emitido tras rebuild u otros cambios)
  newConn.on("projectionUpdated", (payload: unknown) => {
    handlers.onMonitor?.(payload);
    handlers.onAny?.("projectionUpdated", payload);
  });

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
    handlers.onDisconnected?.();
  });

  try {
    // isActive: verifica que esta instancia sigue siendo la conexión vigente
    await startWithRetry(newConn, () => connection === newConn);
    console.info(`SignalR: conectado al hub para la cola ${queueId}`);
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

export async function disconnect(): Promise<void> {
  if (!connection) return;
  try {
    await connection.stop();
  } finally {
    connection = null;
    lastQueueId = null;
  }
}

/** Devuelve el queueId de la conexión activa, o null. */
export function getActiveQueueId(): string | null {
  return lastQueueId;
}

export function isConnected(): boolean {
  if (!connection) return false;
  const connState = (connection as unknown as { state?: HubConnectionState }).state;
  return connState === HubConnectionState.Connected;
}
