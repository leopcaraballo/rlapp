import { env } from "@/config/env";
import { Appointment } from "@/domain/Appointment";
import {
  CreateAppointmentDTO,
  CreateAppointmentResponse,
} from "@/domain/CreateAppointment";
import { AppointmentRepository } from "@/domain/ports/AppointmentRepository";
// 🛡️ HUMAN CHECK - Adapter uses raw HTTP Client (Infrastructure)
const headers = { "Content-Type": "application/json" };

export class HttpAppointmentAdapter implements AppointmentRepository {
  async getAppointments(): Promise<Appointment[]> {
    const res = await fetch(`${env.API_BASE_URL}/appointments`);
    if (!res.ok) throw new Error("HTTP_ERROR");
    return res.json();
  }

  async createAppointment(
    data: CreateAppointmentDTO,
  ): Promise<CreateAppointmentResponse> {
    const res = await fetch(`${env.API_BASE_URL}/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // Propagar el mensaje de error real del backend al hook
      let errorCode = "HTTP_ERROR";
      if (res.status === 429) errorCode = "RATE_LIMIT";
      else if (res.status >= 500) errorCode = "SERVER_ERROR";
      const body = await res.json().catch(() => ({}));
      const err = new Error(errorCode) as Error & { serverMessage?: string };
      err.serverMessage = body?.message ?? errorCode;
      throw err;
    }
    return res.json();
  }
}
