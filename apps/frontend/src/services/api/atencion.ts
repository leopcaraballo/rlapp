import { getAuthHeaders } from "@/security/auth";
import { dispatchAuthInvalid } from "@/security/authEvents";

import { translateApiError } from "./errorTranslations";
import {
  ApiError,
  AtencionFullStateView,
  AtencionMonitorView,
  AtencionStateView,
  CallNextCashierDto,
  CheckInPatientDto,
  ClaimNextPatientDto,
  CommandSuccess,
  CompleteAttentionDto,
  NextTurnView,
  RecentAttentionRecordView,
  ValidatePaymentDto,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

function correlationId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function idempotencyKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (res.ok) return json as T;
    const apiErr = {
      ...(json as ApiError),
      error: (json as ApiError)?.error ?? res.statusText,
      status: res.status,
    } as ApiError;

    if (res.status === 401) {
      dispatchAuthInvalid({ reason: "unauthorized", status: res.status });
    }
    if (res.status === 403) {
      dispatchAuthInvalid({ reason: "forbidden", status: res.status });
    }

    const userMessage = translateApiError(apiErr);
    throw Object.assign(new Error(userMessage), {
      status: res.status,
      body: apiErr,
    });
  } catch (err) {
    if (res.ok) return {} as T;
    throw err;
  }
}

function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Correlation-Id": correlationId(),
    ...getAuthHeaders(),
  } as Record<string, string>;
}

function commandHeaders() {
  return {
    ...baseHeaders(),
    "Idempotency-Key": idempotencyKey(),
  } as Record<string, string>;
}

// Query endpoints
export async function getMonitor(
  serviceId: string,
): Promise<AtencionMonitorView> {
  const res = await fetch(
    `${API_BASE}/api/v1/atencion/${encodeURIComponent(serviceId)}/monitor`,
    { headers: baseHeaders() },
  );
  return handleResponse<AtencionMonitorView>(res);
}

export async function getQueueState(serviceId: string): Promise<AtencionStateView> {
  const res = await fetch(
    `${API_BASE}/api/v1/atencion/${encodeURIComponent(serviceId)}/queue-state`,
    { headers: baseHeaders() },
  );
  return handleResponse<AtencionStateView>(res);
}

export async function getFullState(serviceId: string): Promise<AtencionFullStateView | null> {
  const res = await fetch(
    `${API_BASE}/api/v1/atencion/${encodeURIComponent(serviceId)}/full-state`,
    { headers: baseHeaders() },
  );
  if (res.status === 404) return null;
  return handleResponse<AtencionFullStateView>(res);
}

export async function getNextTurn(
  serviceId: string,
): Promise<NextTurnView | null> {
  const res = await fetch(
    `${API_BASE}/api/v1/atencion/${encodeURIComponent(serviceId)}/next-turn`,
    { headers: baseHeaders() },
  );
  // 404 es normal cuando no hay turno activo (cola vacía o nadie llamado)
  if (res.status === 404) return null;
  return handleResponse<NextTurnView>(res);
}

export async function getRecentHistory(
  serviceId: string,
  limit = 20,
): Promise<RecentAttentionRecordView[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/atencion/${encodeURIComponent(serviceId)}/recent-history?limit=${limit}`,
    { headers: baseHeaders() },
  );
  return handleResponse<RecentAttentionRecordView[]>(res);
}

export async function rebuildProjection(
  serviceId: string,
): Promise<{ message: string; serviceId: string }> {
  const res = await fetch(
    `${API_BASE}/api/v1/atencion/${encodeURIComponent(serviceId)}/rebuild`,
    { method: "POST", headers: commandHeaders() },
  );
  return handleResponse<{ message: string; serviceId: string }>(res);
}

// Command endpoints (write operations)
async function postCommand<T, R>(path: string, dto: T): Promise<R> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: commandHeaders(),
    body: JSON.stringify(dto),
  });
  const result = await handleResponse<R>(res);
  try {
    // Notify frontend listeners that a command succeeded so hooks can refresh
    const serviceId = (dto as unknown as { serviceId?: string })?.serviceId;
    window.dispatchEvent(
      new CustomEvent("rlapp:command-success", { detail: { serviceId, path } }),
    );
  } catch {
    // ignore dispatch failures (e.g., non-browser environments)
  }
  return result;
}

export async function checkInPatient(
  dto: CheckInPatientDto,
): Promise<CommandSuccess> {
  return postCommand<CheckInPatientDto, CommandSuccess>(
    `/api/waiting-room/check-in`,
    dto,
  );
}

export async function registerReception(
  dto: CheckInPatientDto,
): Promise<CommandSuccess> {
  return postCommand<CheckInPatientDto, CommandSuccess>(
    `/api/reception/register`,
    dto,
  );
}

export async function callNextCashier(
  dto: CallNextCashierDto,
): Promise<CommandSuccess> {
  return postCommand<CallNextCashierDto, CommandSuccess>(
    `/api/cashier/call-next`,
    dto,
  );
}

export async function validatePayment(
  dto: ValidatePaymentDto,
): Promise<CommandSuccess> {
  return postCommand<ValidatePaymentDto, CommandSuccess>(
    `/api/cashier/validate-payment`,
    dto,
  );
}

export async function markPaymentPending(
  dto: ValidatePaymentDto,
): Promise<CommandSuccess> {
  return postCommand<ValidatePaymentDto, CommandSuccess>(
    `/api/cashier/mark-payment-pending`,
    dto,
  );
}

export async function markAbsentAtCashier(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
}): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(
    `/api/cashier/mark-absent`,
    dto,
  );
}

export async function cancelByPayment(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
  reason?: string;
}): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(
    `/api/cashier/cancel-payment`,
    dto,
  );
}

export async function claimNextPatient(
  dto: ClaimNextPatientDto,
): Promise<CommandSuccess> {
  return postCommand<ClaimNextPatientDto, CommandSuccess>(
    `/api/medical/call-next`,
    dto,
  );
}

export async function callPatient(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
}): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(
    `/api/medical/start-consultation`,
    dto,
  );
}

export async function completeAttention(
  dto: CompleteAttentionDto,
): Promise<CommandSuccess> {
  return postCommand<CompleteAttentionDto, CommandSuccess>(
    `/api/medical/finish-consultation`,
    dto,
  );
}

// Cashier / Reception aliases kept for compatibility
export async function markAbsent(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
}): Promise<CommandSuccess> {
  return markAbsentAtCashier(dto);
}

export async function cancelPayment(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
  reason?: string;
}): Promise<CommandSuccess> {
  return cancelByPayment(dto);
}

// Medical endpoints
export async function callNextMedical(dto: {
  serviceId: string;
  actor: string;
}): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/medical/call-next`, dto);
}

export async function activateConsultingRoom(dto: {
  serviceId: string;
  actor: string;
  stationId?: string | null;
}): Promise<CommandSuccess> {
  const { stationId, ...rest } = dto;
  return postCommand<object, CommandSuccess>(
    `/api/medical/consulting-room/activate`,
    { ...rest, consultingRoomId: stationId ?? null },
  );
}

export async function deactivateConsultingRoom(dto: {
  serviceId: string;
  actor: string;
  stationId?: string | null;
}): Promise<CommandSuccess> {
  const { stationId, ...rest } = dto;
  return postCommand<object, CommandSuccess>(
    `/api/medical/consulting-room/deactivate`,
    { ...rest, consultingRoomId: stationId ?? null },
  );
}

export async function startConsultation(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
  stationId?: string | null;
}): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(
    `/api/medical/start-consultation`,
    dto,
  );
}

export async function finishConsultation(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
  stationId?: string | null;
}): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(
    `/api/medical/finish-consultation`,
    dto,
  );
}

export async function markAbsentMedical(dto: {
  serviceId: string;
  patientId: string;
  actor: string;
}): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(
    `/api/medical/mark-absent`,
    dto,
  );
}

/** HU-R5: Fetch the active/inactive state of all known consulting rooms. */
export async function getConsultingRoomsState(
  serviceId: string,
): Promise<{ activeRooms: string[]; allRooms: string[] }> {
  const res = await fetch(
    `${API_BASE}/api/v1/atencion/${encodeURIComponent(serviceId)}/consulting-rooms`,
    { headers: baseHeaders() },
  );
  if (res.status === 404) return { activeRooms: [], allRooms: [] };
  const data = await handleResponse<{ activeRooms: string[]; allRooms: string[] }>(res);
  return data;
}

export default {
  getMonitor,
  getQueueState,
  getNextTurn,
  getRecentHistory,
  rebuildProjection,
  checkInPatient,
  registerReception,
  callNextCashier,
  validatePayment,
  markPaymentPending,
  markAbsentAtCashier,
  cancelByPayment,
  claimNextPatient,
  callPatient,
  completeAttention,
};
