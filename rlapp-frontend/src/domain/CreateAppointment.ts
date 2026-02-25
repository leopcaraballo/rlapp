// ⚕️ HUMAN CHECK - Frontend DTO synced with backend
export interface CreateAppointmentDTO {
  fullName: string;
  idCard: string | number;
  priority?: "high" | "medium" | "low";
}

// ⚕️ HUMAN CHECK - Response synced with backend (ProducerService)
export interface CreateAppointmentResponse {
  id?: string;
  status?: "accepted" | "error";
  message?: string | undefined;
}
