import { HubConnection, HubConnectionBuilder, LogLevel, HttpTransportType } from "@microsoft/signalr";

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, '');

let connection: HubConnection | null = null;

export type WaitingRoomHandlers = {
  onMonitor?: (payload: any) => void;
  onQueueState?: (payload: any) => void;
  onNextTurn?: (payload: any) => void;
  onRecentHistory?: (payload: any) => void;
  onAny?: (event: string, payload: any) => void;
  onConnected?: () => void;
};

async function startWithRetry(conn: HubConnection, maxAttempts = 5) {
  let attempt = 0;
  const base = 500;
  while (attempt < maxAttempts) {
    try {
      await conn.start();
      return;
    } catch (err) {
      attempt++;
      const delay = base * Math.pow(2, attempt);
      // eslint-disable-next-line no-console
      console.warn(`SignalR start attempt ${attempt} failed, retrying in ${delay}ms`, err);
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
  connection.on("MonitorUpdated", (payload: any) => handlers.onMonitor?.(payload));
  connection.on("QueueStateUpdated", (payload: any) => handlers.onQueueState?.(payload));
  connection.on("NextTurn", (payload: any) => handlers.onNextTurn?.(payload));
  connection.on("RecentHistoryUpdated", (payload: any) => handlers.onRecentHistory?.(payload));

  // Generic handlers
  connection.on("Message", (payload: any) => handlers.onAny?.("Message", payload));
  connection.on("Receive", (ev: string, payload: any) => handlers.onAny?.(ev, payload));

  connection.onreconnecting((err) => {
    // eslint-disable-next-line no-console
    console.warn("SignalR reconnecting", err);
  });

  connection.onreconnected((connectionId) => {
    // eslint-disable-next-line no-console
    console.info("SignalR reconnected", connectionId);
    handlers.onConnected?.();
  });

  connection.onclose((err) => {
    // eslint-disable-next-line no-console
    console.info("SignalR connection closed", err);
  });

  try {
    await startWithRetry(connection);
    handlers.onConnected?.();
  } catch (err) {
    // eslint-disable-next-line no-console
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
  return connection && (connection as any).state === 1; // HubConnectionState.Connected === 1
}
