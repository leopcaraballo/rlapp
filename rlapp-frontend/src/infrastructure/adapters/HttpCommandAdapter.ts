/**
 * HttpCommandAdapter — implementación concreta de ICommandGateway.
 *
 * Rutas sincronizadas con el backend (Program.cs):
 *   Reception:        POST /api/reception/register
 *   Cashier:          POST /api/cashier/{call-next|validate-payment|mark-payment-pending|mark-absent|cancel-payment}
 *   Medical:          POST /api/medical/{call-next|start-consultation|finish-consultation|mark-absent}
 *   Consulting rooms: POST /api/medical/consulting-room/{activate|deactivate}
 */
import type {
  ActivateConsultingRoomCommand,
  CallNextAtCashierCommand,
  CallPatientCommand,
  CancelByPaymentCommand,
  CheckInPatientCommand,
  ClaimNextPatientCommand,
  CommandResult,
  CompleteAttentionCommand,
  DeactivateConsultingRoomCommand,
  ICommandGateway,
  MarkAbsentAtCashierCommand,
  MarkAbsentAtMedicalCommand,
  MarkPaymentPendingCommand,
  ValidatePaymentCommand,
} from "../../domain/ports/ICommandGateway";
import { translateApiError } from "../../services/api/errorTranslations";
import type { ApiError } from "../../services/api/types";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

function correlationId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function idempotencyKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function baseHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Correlation-Id": correlationId(),
  };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
      "X-Idempotency-Key": idempotencyKey(),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const apiErr = (json as ApiError) ?? { error: res.statusText };
    const userMessage = translateApiError(apiErr);
    throw Object.assign(new Error(userMessage), {
      status: res.status,
      body: apiErr,
    });
  }

  // Notificar a los hooks de React que un comando tuvo éxito (refresco inmediato)
  try {
    const queueId = (body as Record<string, unknown>)?.queueId as string | undefined;
    window.dispatchEvent(
      new CustomEvent("rlapp:command-success", { detail: { queueId, path } }),
    );
  } catch {
    // ignorar en entornos sin window (tests, SSR)
  }

  return json as T;
}

export class HttpCommandAdapter implements ICommandGateway {
  async checkInPatient(cmd: CheckInPatientCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/reception/register", cmd);
  }

  async callNextAtCashier(cmd: CallNextAtCashierCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/cashier/call-next", cmd);
  }

  async validatePayment(cmd: ValidatePaymentCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/cashier/validate-payment", cmd);
  }

  async markPaymentPending(cmd: MarkPaymentPendingCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/cashier/mark-payment-pending", cmd);
  }

  async markAbsentAtCashier(cmd: MarkAbsentAtCashierCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/cashier/mark-absent", cmd);
  }

  async cancelByPayment(cmd: CancelByPaymentCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/cashier/cancel-payment", cmd);
  }

  async claimNextPatient(cmd: ClaimNextPatientCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/medical/call-next", cmd);
  }

  async callPatient(cmd: CallPatientCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/medical/start-consultation", cmd);
  }

  async completeAttention(cmd: CompleteAttentionCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/medical/finish-consultation", cmd);
  }

  async markAbsentAtMedical(cmd: MarkAbsentAtMedicalCommand): Promise<CommandResult> {
    return post<CommandResult>("/api/medical/mark-absent", cmd);
  }

  async activateConsultingRoom(cmd: ActivateConsultingRoomCommand): Promise<CommandResult> {
    // El backend espera `consultingRoomId`; el dominio front usa `stationId` como nombre genérico
    const { stationId, ...rest } = cmd;
    return post<CommandResult>("/api/medical/consulting-room/activate", {
      ...rest,
      consultingRoomId: stationId,
    });
  }

  async deactivateConsultingRoom(cmd: DeactivateConsultingRoomCommand): Promise<CommandResult> {
    const { stationId, ...rest } = cmd;
    return post<CommandResult>("/api/medical/consulting-room/deactivate", {
      ...rest,
      consultingRoomId: stationId,
    });
  }
}

/** Instancia singleton para uso en la aplicación (inyectable en Context o hooks). */
export const httpCommandAdapter = new HttpCommandAdapter();
