// ⚕️ HUMAN CHECK - Frontend DTO synced with backend
export interface CreateAppointmentDTO {
  fullName: string;
  idCard: string | number;
  /** Nivel de prioridad — mapeado al enum Priority del backend. */
  priority?: "Urgent" | "High" | "Medium" | "Low";
}

// ⚕️ HUMAN CHECK - Response synced with backend (ProducerService)
export interface CreateAppointmentResponse {
  id?: string;
  status?: "accepted" | "error";
  message?: string | undefined;
}
