// ⚕️ HUMAN CHECK - Domain model synced with backend AppointmentEventPayload
export type AppointmentStatus = "waiting" | "called" | "completed";
export type AppointmentPriority = "high" | "medium" | "low";

export interface Appointment {
  id: string;
  fullName: string;
  idCard: string | number;
  office: string | null;
  timestamp: number;
  completedAt?: number | null;
  status: AppointmentStatus;
  priority: AppointmentPriority;
}
