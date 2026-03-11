import { env } from "@/config/env";
import { Appointment, AppointmentPriority } from "@/domain/Appointment";
import {
  CreateAppointmentDTO,
  CreateAppointmentResponse,
} from "@/domain/CreateAppointment";
import { AppointmentRepository } from "@/domain/ports/AppointmentRepository";
import { getAuthHeaders } from "@/security/auth";
// HUMAN CHECK — Adapter redirige al API real de waiting-room (ya no usa /appointments fantasma).

/**
 * Genera Idempotency-Key unico para operaciones de cambio de estado.
 * Requerido por el backend para garantizar procesamiento idempotente.
 */
function idempotencyKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function correlationId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

const DEFAULT_QUEUE_ID = env.DEFAULT_QUEUE_ID;

export class HttpAppointmentAdapter implements AppointmentRepository {
  /**
   * Obtiene los pacientes en cola mapeados al formato Appointment.
   * Delegado al endpoint real: GET /api/v1/waiting-room/{queueId}/queue-state
   */
  async getAppointments(): Promise<Appointment[]> {
    const url = `${env.API_BASE_URL}/api/v1/waiting-room/${encodeURIComponent(DEFAULT_QUEUE_ID)}/queue-state`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId(),
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error("HTTP_ERROR");
    const data = await res.json();
    const patients = data?.patientsInQueue ?? [];
    return patients.map(
      (p: {
        patientId: string;
        patientName: string;
        priority: string;
        checkInTime: string;
        waitTimeMinutes: number;
      }) => ({
        id: p.patientId,
        fullName: p.patientName,
        idCard: p.patientId,
        office: null,
        timestamp: new Date(p.checkInTime).getTime(),
        completedAt: null,
        status: "waiting" as const,
        priority: (p.priority || "Medium") as AppointmentPriority,
      }),
    );
  }

  /**
   * Registra un paciente en la cola.
   * Delegado al endpoint real: POST /api/reception/register
   */
  async createAppointment(
    data: CreateAppointmentDTO,
  ): Promise<CreateAppointmentResponse> {
    const dto = {
      queueId: DEFAULT_QUEUE_ID,
      patientId: String(data.idCard),
      patientName: data.fullName,
      priority: data.priority ?? "Medium",
      consultationType: "General",
      actor: "reception",
    };
    const res = await fetch(`${env.API_BASE_URL}/api/reception/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId(),
        "Idempotency-Key": idempotencyKey(),
        ...getAuthHeaders(),
      },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      let errorCode = "HTTP_ERROR";
      if (res.status === 429) errorCode = "RATE_LIMIT";
      else if (res.status >= 500) errorCode = "SERVER_ERROR";
      const body = await res.json().catch(() => ({}));
      const err = new Error(errorCode) as Error & { serverMessage?: string };
      err.serverMessage =
        (body as { message?: string })?.message ??
        (body as { Error?: string })?.Error ??
        errorCode;
      throw err;
    }
    const result = await res.json();
    return {
      id: result?.patientId ?? String(data.idCard),
      status: result?.success ? "accepted" : "error",
      message: result?.message ?? "Turno registrado exitosamente.",
    };
  }
}
