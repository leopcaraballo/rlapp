import { io, Socket } from "socket.io-client";

import { env } from "@/config/env";
import { Appointment } from "@/domain/Appointment";
import { RealTimePort } from "@/domain/ports/RealTimePort";

export class SocketIoAdapter implements RealTimePort {
  private socket: Socket | null = null;
  private isConnectedFlag = false;

  // Callbacks
  private onSnapshotCallback: ((data: Appointment[]) => void) | null = null;
  private onUpdateCallback: ((data: Appointment) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  connect(): void {
    if (this.socket) return;

    this.socket = io(`${env.WS_URL}/ws/appointments`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[SocketIoAdapter] Connected");
      this.isConnectedFlag = true;
      this.onConnectCallback?.();
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[SocketIoAdapter] Disconnected: ${reason}`);
      this.isConnectedFlag = false;
      this.onDisconnectCallback?.();
    });

    this.socket.on("connect_error", (err) => {
      console.error("[SocketIoAdapter] Connection error:", err);
      this.onErrorCallback?.(err);
    });

    this.socket.on(
      "APPOINTMENTS_SNAPSHOT",
      (payload: { data: Appointment[] }) => {
        this.onSnapshotCallback?.(payload.data);
      },
    );

    this.socket.on("APPOINTMENT_UPDATED", (payload: { data: Appointment }) => {
      this.onUpdateCallback?.(payload.data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnectedFlag = false;
    }
  }

  onSnapshot(callback: (appointments: Appointment[]) => void): void {
    this.onSnapshotCallback = callback;
  }

  onAppointmentUpdated(callback: (appointment: Appointment) => void): void {
    this.onUpdateCallback = callback;
  }

  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }
}
