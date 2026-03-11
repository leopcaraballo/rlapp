import { env } from "@/config/env";
import { Appointment, AppointmentPriority } from "@/domain/Appointment";
import type { CreateAppointmentResponse } from "@/domain/CreateAppointment";
import { CreateAppointmentDTO } from "@/domain/CreateAppointment";
import { httpGet, httpPost } from "@/lib/httpClient";
// HUMAN CHECK — Redirigido a endpoints reales del waiting-room.

const DEFAULT_QUEUE_ID = env.DEFAULT_QUEUE_ID;

export class HttpAppointmentRepository {
  async getAppointments(): Promise<Appointment[]> {
    const url = `${env.API_BASE_URL}/api/v1/waiting-room/${encodeURIComponent(DEFAULT_QUEUE_ID)}/queue-state`;
    const data = (await httpGet(url)) as {
      patientsInQueue?: Array<{
        patientId: string;
        patientName: string;
        priority: string;
        checkInTime: string;
        waitTimeMinutes: number;
      }>;
    };
    const patients = data?.patientsInQueue ?? [];
    return patients.map((p) => ({
      id: p.patientId,
      fullName: p.patientName,
      idCard: p.patientId,
      office: null,
      timestamp: new Date(p.checkInTime).getTime(),
      completedAt: null,
      status: "waiting" as const,
      priority: (p.priority || "Medium") as AppointmentPriority,
    }));
  }

  async createAppointment(
    dto: CreateAppointmentDTO,
  ): Promise<CreateAppointmentResponse> {
    const url = `${env.API_BASE_URL}/api/reception/register`;
    const backendDto = {
      queueId: DEFAULT_QUEUE_ID,
      patientId: String(dto.idCard),
      patientName: dto.fullName,
      priority: dto.priority ?? "Medium",
      consultationType: "General",
      actor: "reception",
    };
    const result = (await httpPost(url, backendDto)) as {
      success?: boolean;
      message?: string;
      patientId?: string;
    };
    return {
      id: result?.patientId ?? String(dto.idCard),
      status: result?.success ? "accepted" : "error",
      message: result?.message ?? "Turno registrado exitosamente.",
    };
  }
}

export default HttpAppointmentRepository;
