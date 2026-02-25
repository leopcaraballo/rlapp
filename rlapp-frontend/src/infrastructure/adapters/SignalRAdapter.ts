import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

import { env } from "@/config/env";
import { Appointment } from "@/domain/Appointment";
import { RealTimePort } from "@/domain/ports/RealTimePort";

export class SignalRAdapter implements RealTimePort {
  private connection: HubConnection | null = null;
  private connected = false;
  /**
   * Contador de generación: se incrementa en cada `connect()` y `disconnect()`.
   * Permite invalidar promesas `start()` obsoletas (escenario HMR / StrictMode).
   */
  private generation = 0;

  private snapshotCb: ((a: Appointment[]) => void) | null = null;
  private updateCb: ((a: Appointment) => void) | null = null;
  private onConnectCb: (() => void) | null = null;
  private onDisconnectCb: (() => void) | null = null;
  private onErrorCb: ((e: Error) => void) | null = null;

  connect(): void {
    // Salida rápida si SignalR está deshabilitado por variable de entorno
    if (env.WS_DISABLED) {
      console.info("SignalRAdapter: deshabilitado por NEXT_PUBLIC_WS_DISABLED.");
      return;
    }

    // Incrementar generación invalida cualquier start() en vuelo de ciclos anteriores
    const gen = ++this.generation;

    // Detener conexión previa si existe (asíncrono; la generación la invalida)
    if (this.connection) {
      void this.connection.stop();
      this.connection = null;
      this.connected = false;
    }

    const base = env.WS_URL || "http://localhost:5000";
    const url = `${base.replace(/\/$/, '')}/ws/waiting-room`;

    const conn = new HubConnectionBuilder()
      .withUrl(url, {
        transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
        // withCredentials requerido porque el backend usa AllowCredentials() en la política CORS.
        withCredentials: true,
      })
      .withAutomaticReconnect([1000, 3000, 5000])
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection = conn;

    conn.on("APPOINTMENTS_SNAPSHOT", (payload: { data: Appointment[] }) => {
      this.snapshotCb?.(payload?.data ?? []);
    });

    conn.on("APPOINTMENT_UPDATED", (payload: { data: Appointment }) => {
      this.updateCb?.(payload?.data as Appointment);
    });

    conn.onclose((err?: unknown) => {
      if (this.connection !== conn) return; // conexión reemplazada, ignorar
      this.connected = false;
      this.onDisconnectCb?.();
      if (err instanceof Error) this.onErrorCb?.(err);
      else if (err != null) this.onErrorCb?.(new Error(String(err)));
    });

    conn.onreconnected(() => {
      if (this.connection !== conn) return;
      this.connected = true;
      this.onConnectCb?.();
    });

    conn.onreconnecting((err?: unknown) => {
      if (this.connection !== conn) return;
      if (err instanceof Error) this.onErrorCb?.(err);
      else if (err != null) this.onErrorCb?.(new Error(String(err)));
    });

    void conn.start().then(() => {
      // Ignorar si esta generación ya fue superada por un disconnect/connect posterior
      if (gen !== this.generation) return;
      this.connected = true;
      this.onConnectCb?.();
    }).catch((err?: unknown) => {
      if (gen !== this.generation) return;
      if (err instanceof Error) this.onErrorCb?.(err);
      else this.onErrorCb?.(new Error(String(err)));
    });
  }

  disconnect(): void {
    // Invalidar cualquier start() en vuelo
    this.generation++;
    if (!this.connection) return;
    void this.connection.stop();
    this.connection = null;
    this.connected = false;
  }

  onSnapshot(callback: (appointments: Appointment[]) => void): void {
    this.snapshotCb = callback;
  }

  onAppointmentUpdated(callback: (appointment: Appointment) => void): void {
    this.updateCb = callback;
  }

  // Backwards-compatible alias
  onAppointmentCalled(callback: (appointment: Appointment) => void): void {
    this.onAppointmentUpdated(callback);
  }

  onConnect(callback: () => void): void {
    this.onConnectCb = callback;
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCb = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCb = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export default SignalRAdapter;
