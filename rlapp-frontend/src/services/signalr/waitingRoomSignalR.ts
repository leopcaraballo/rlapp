import { HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState,LogLevel } from "@microsoft/signalr";

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, '');

let connection: HubConnection | null = null;

export type WaitingRoomHandlers = {
  onMonitor?: (payload: unknown) => void;
  onQueueState?: (payload: unknown) => void;
  onNextTurn?: (payload: unknown) => void;
  onRecentHistory?: (payload: unknown) => void;
  onAny?: (event: string, payload: unknown) => void;
  onConnected?: () => void;
};

async function startWithRetry(conn: HubConnection, maxAttempts = 5) {
  let attempt = 0;
  const base = 500;
  while (attempt < maxAttempts) {
    try {
      await conn.start();
      return;
    } catch (err: unknown) {
      attempt++;
      const delay = base * Math.pow(2, attempt);
      const errMsg = err instanceof Error ? err : String(err);
      console.warn(`SignalR start attempt ${attempt} failed, retrying in ${delay}ms`, errMsg);
      // small sleep
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Failed to start SignalR connection after retries");
}

export async function connect(queueId: string, handlers: WaitingRoomHandlers = {}) {
  if (connection) return connection;

  const url = `${WS_BASE}/ws/waiting-room`;
  connection = new HubConnectionBuilder()
    .withUrl(url, {
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  // Known event names (best-effort). Also forward any unknown events via onAny
  connection.on("MonitorUpdated", (payload: unknown) => handlers.onMonitor?.(payload));
  connection.on("QueueStateUpdated", (payload: unknown) => handlers.onQueueState?.(payload));
  connection.on("NextTurn", (payload: unknown) => handlers.onNextTurn?.(payload));
  connection.on("RecentHistoryUpdated", (payload: unknown) => handlers.onRecentHistory?.(payload));

  // Generic handlers
  connection.on("Message", (payload: unknown) => handlers.onAny?.("Message", payload));
  connection.on("Receive", (ev: string, payload: unknown) => handlers.onAny?.(ev, payload));

  connection.onreconnecting((err?: unknown) => {
    const msg = err instanceof Error ? err.message : err != null ? String(err) : "reconnecting";
    console.warn("SignalR reconnecting:", msg);
  });

  connection.onreconnected((connectionId?: string | null) => {
    console.info("SignalR reconnected", connectionId);
    handlers.onConnected?.();
  });

  connection.onclose((err?: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.info("SignalR connection closed with error:", msg);
    } else {
      console.info("SignalR connection closed");
    }
  });

  try {
    await startWithRetry(connection);
    handlers.onConnected?.();
  } catch (err) {
    console.warn("SignalR start failed after retries", err);
  }

  return connection;
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
