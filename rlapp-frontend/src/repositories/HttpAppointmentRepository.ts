import { Appointment } from "@/domain/Appointment";
import { CreateAppointmentDTO } from "@/domain/CreateAppointment";
import { httpGet, httpPost } from "@/lib/httpClient";
import { env } from "@/config/env";

export class HttpAppointmentRepository {
  async getAppointments(): Promise<Appointment[]> {
    const url = `${env.API_BASE_URL}/appointments`;
    return httpGet(url) as Promise<Appointment[]>;
  }

  async createAppointment(dto: CreateAppointmentDTO): Promise<any> {
    const url = `${env.API_BASE_URL}/appointments`;
    return httpPost(url, dto);
  }
}

export default HttpAppointmentRepository;
