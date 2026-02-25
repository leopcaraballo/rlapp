import { env } from "@/config/env";
import { Appointment } from "@/domain/Appointment";
import type { CreateAppointmentResponse } from "@/domain/CreateAppointment";
import { CreateAppointmentDTO } from "@/domain/CreateAppointment";
import { httpGet, httpPost } from "@/lib/httpClient";

export class HttpAppointmentRepository {
  async getAppointments(): Promise<Appointment[]> {
    const url = `${env.API_BASE_URL}/appointments`;
    return httpGet(url) as Promise<Appointment[]>;
  }

  async createAppointment(dto: CreateAppointmentDTO): Promise<CreateAppointmentResponse> {
    const url = `${env.API_BASE_URL}/appointments`;
    return httpPost(url, dto);
  }
}

export default HttpAppointmentRepository;
