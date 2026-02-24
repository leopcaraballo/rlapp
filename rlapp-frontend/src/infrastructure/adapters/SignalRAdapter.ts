import { HubConnectionBuilder, LogLevel, HttpTransportType } from "@microsoft/signalr";
import { RealTimePort } from "@/domain/ports/RealTimePort";
import { Appointment } from "@/domain/Appointment";
import { env } from "@/config/env";

export class SignalRAdapter implements RealTimePort {
  private connection: any = null;
  private connected = false;

  private snapshotCb: ((a: Appointment[]) => void) | null = null;
  private updateCb: ((a: Appointment) => void) | null = null;
  private onConnectCb: (() => void) | null = null;
  private onDisconnectCb: (() => void) | null = null;
  private onErrorCb: ((e: Error) => void) | null = null;

  connect(): void {
    if (this.connection) return;

    const base = env.WS_URL || "http://localhost:5000";
    const url = `${base.replace(/\/$/, '')}/ws/waiting-room`;

    this.connection = new HubConnectionBuilder()
      .withUrl(url, { transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.connection.on("APPOINTMENTS_SNAPSHOT", (payload: { data: Appointment[] }) => {
      this.snapshotCb?.(payload?.data ?? []);
    });

    this.connection.on("APPOINTMENT_UPDATED", (payload: { data: Appointment }) => {
      this.updateCb?.(payload?.data as Appointment);
    });

    this.connection.onclose((err: any) => {
      this.connected = false;
      this.onDisconnectCb?.();
      if (err) this.onErrorCb?.(err as Error);
    });

    this.connection.onreconnected(() => {
      this.connected = true;
      this.onConnectCb?.();
    });

    this.connection.onreconnecting((err: any) => {
      this.onErrorCb?.(err as Error);
    });

    // start connection
    void this.connection.start().then(() => {
      this.connected = true;
      this.onConnectCb?.();
    }).catch((err: any) => {
      this.onErrorCb?.(err as Error);
    });
  }

  disconnect(): void {
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
