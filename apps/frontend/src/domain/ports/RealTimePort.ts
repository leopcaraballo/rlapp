import { Appointment } from "@/domain/Appointment";

export interface RealTimePort {
  connect(): void;
  disconnect(): void;
  onSnapshot(callback: (appointments: Appointment[]) => void): void;
  onAppointmentUpdated(callback: (appointment: Appointment) => void): void;
  // Backwards-compatible alias: some tests and older adapters expect
  // `onAppointmentCalled`. It should behave like `onAppointmentUpdated`.
  onAppointmentCalled?(callback: (appointment: Appointment) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  isConnected(): boolean;
}
