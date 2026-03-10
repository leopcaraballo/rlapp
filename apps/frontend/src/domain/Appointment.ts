// ⚕️ HUMAN CHECK - Domain model synced with backend AppointmentEventPayload
export type AppointmentStatus = "waiting" | "called" | "completed";
/** Nivel de prioridad — sincronizado con el enum Priority del backend (4 = Urgent, 3 = High, 2 = Medium, 1 = Low). */
export type AppointmentPriority = "Urgent" | "High" | "Medium" | "Low";

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
