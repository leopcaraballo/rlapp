import { translateApiError } from "./errorTranslations";
import {
  ApiError,
  CallNextCashierDto,
  CheckInPatientDto,
  ClaimNextPatientDto,
  CommandSuccess,
  CompleteAttentionDto,
  NextTurnView,
  QueueStateView,
  RecentAttentionRecordView,
  ValidatePaymentDto,
  WaitingRoomMonitorView,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

function correlationId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function idempotencyKey() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (res.ok) return json as T;
    const apiErr = (json as ApiError) || { error: res.statusText };
    const userMessage = translateApiError(apiErr);
    throw Object.assign(new Error(userMessage), { status: res.status, body: apiErr });
  } catch (err) {
    if (res.ok) return ({} as T);
    throw err;
  }
}

function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Correlation-Id": correlationId(),
  } as Record<string, string>;
}

function commandHeaders() {
  return {
    ...baseHeaders(),
    "X-Idempotency-Key": idempotencyKey(),
  } as Record<string, string>;
}

// Query endpoints
export async function getMonitor(queueId: string): Promise<WaitingRoomMonitorView> {
  const res = await fetch(`${API_BASE}/api/v1/waiting-room/${encodeURIComponent(queueId)}/monitor`, { headers: baseHeaders() });
  return handleResponse<WaitingRoomMonitorView>(res);
}

export async function getQueueState(queueId: string): Promise<QueueStateView> {
  const res = await fetch(`${API_BASE}/api/v1/waiting-room/${encodeURIComponent(queueId)}/queue-state`, { headers: baseHeaders() });
  return handleResponse<QueueStateView>(res);
}

export async function getNextTurn(queueId: string): Promise<NextTurnView | null> {
  const res = await fetch(`${API_BASE}/api/v1/waiting-room/${encodeURIComponent(queueId)}/next-turn`, { headers: baseHeaders() });
  // 404 es normal cuando no hay turno activo (cola vacía o nadie llamado)
  if (res.status === 404) return null;
  return handleResponse<NextTurnView>(res);
}

export async function getRecentHistory(queueId: string, limit = 20): Promise<RecentAttentionRecordView[]> {
  const res = await fetch(`${API_BASE}/api/v1/waiting-room/${encodeURIComponent(queueId)}/recent-history?limit=${limit}`, { headers: baseHeaders() });
  return handleResponse<RecentAttentionRecordView[]>(res);
}

export async function rebuildProjection(queueId: string): Promise<{ message: string; queueId: string }> {
  const res = await fetch(`${API_BASE}/api/v1/waiting-room/${encodeURIComponent(queueId)}/rebuild`, { method: "POST", headers: commandHeaders() });
  return handleResponse<{ message: string; queueId: string }>(res);
}

// Command endpoints (write operations)
async function postCommand<T, R>(path: string, dto: T): Promise<R> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers: commandHeaders(), body: JSON.stringify(dto) });
  const result = await handleResponse<R>(res);
  try {
    // Notify frontend listeners that a command succeeded so hooks can refresh
    const queueId = (dto as unknown as { queueId?: string })?.queueId;
    window.dispatchEvent(new CustomEvent("rlapp:command-success", { detail: { queueId, path } }));
  } catch {
    // ignore dispatch failures (e.g., non-browser environments)
  }
  return result;
}

export async function checkInPatient(dto: CheckInPatientDto): Promise<CommandSuccess> {
  return postCommand<CheckInPatientDto, CommandSuccess>(`/api/waiting-room/check-in`, dto);
}

export async function registerReception(dto: CheckInPatientDto): Promise<CommandSuccess> {
  return postCommand<CheckInPatientDto, CommandSuccess>(`/api/reception/register`, dto);
}

export async function callNextCashier(dto: CallNextCashierDto): Promise<CommandSuccess> {
  return postCommand<CallNextCashierDto, CommandSuccess>(`/api/cashier/call-next`, dto);
}

export async function validatePayment(dto: ValidatePaymentDto): Promise<CommandSuccess> {
  return postCommand<ValidatePaymentDto, CommandSuccess>(`/api/cashier/validate-payment`, dto);
}

export async function markPaymentPending(dto: ValidatePaymentDto): Promise<CommandSuccess> {
  return postCommand<ValidatePaymentDto, CommandSuccess>(`/api/cashier/mark-payment-pending`, dto);
}

export async function markAbsentAtCashier(dto: { queueId: string; patientId: string; actor: string }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/cashier/mark-absent`, dto);
}

export async function cancelByPayment(dto: { queueId: string; patientId: string; actor: string; reason?: string }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/cashier/cancel-payment`, dto);
}

export async function claimNextPatient(dto: ClaimNextPatientDto): Promise<CommandSuccess> {
  return postCommand<ClaimNextPatientDto, CommandSuccess>(`/api/waiting-room/claim-next`, dto);
}

export async function callPatient(dto: { queueId: string; patientId: string; actor: string }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/waiting-room/call-patient`, dto);
}

export async function completeAttention(dto: CompleteAttentionDto): Promise<CommandSuccess> {
  return postCommand<CompleteAttentionDto, CommandSuccess>(`/api/waiting-room/complete-attention`, dto);
}

// Cashier / Reception aliases kept for compatibility
export async function markAbsent(dto: { queueId: string; patientId: string; actor: string }): Promise<CommandSuccess> {
  return markAbsentAtCashier(dto);
}

export async function cancelPayment(dto: { queueId: string; patientId: string; actor: string; reason?: string }): Promise<CommandSuccess> {
  return cancelByPayment(dto);
}

// Medical endpoints
export async function callNextMedical(dto: { queueId: string; actor: string }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/medical/call-next`, dto);
}

export async function activateConsultingRoom(dto: { queueId: string; actor: string; stationId?: string | null }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/medical/consulting-room/activate`, dto);
}

export async function deactivateConsultingRoom(dto: { queueId: string; actor: string; stationId?: string | null }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/medical/consulting-room/deactivate`, dto);
}

export async function startConsultation(dto: { queueId: string; patientId: string; actor: string; stationId?: string | null }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/medical/start-consultation`, dto);
}

export async function finishConsultation(dto: { queueId: string; patientId: string; actor: string; stationId?: string | null }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/medical/finish-consultation`, dto);
}

export async function markAbsentMedical(dto: { queueId: string; patientId: string; actor: string }): Promise<CommandSuccess> {
  return postCommand<typeof dto, CommandSuccess>(`/api/medical/mark-absent`, dto);
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
