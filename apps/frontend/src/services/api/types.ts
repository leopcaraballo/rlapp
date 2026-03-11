import { z } from "zod";

import type { AppointmentPriority } from "../../domain/Appointment";
import type { ConsultationType } from "../../domain/patient/ConsultationType";

export interface ApiError {
  error?: string;
  message?: string;
  correlationId?: string;
  detail?: string;
  status?: number;
}

export interface CommandSuccess {
  success: boolean;
  message: string;
  correlationId: string;
  eventCount: number;
  patientId?: string;
  queueId?: string;
}

export interface RebuildProjectionResponse {
  message: string;
  queueId: string;
}

export interface WaitingRoomMonitorView {
  queueId: string;
  totalPatientsWaiting: number;
  highPriorityCount: number;
  /** Conteo de pacientes con prioridad Urgente (puede no estar presente en versiones anteriores del backend). */
  urgentPriorityCount?: number;
  normalPriorityCount: number;
  lowPriorityCount: number;
  lastPatientCheckedInAt: string | null;
  averageWaitTimeMinutes: number;
  utilizationPercentage: number;
  projectedAt: string;
}

export interface PatientInQueueDto {
  patientId: string;
  patientName: string;
  priority: string;
  checkInTime: string; // ISO
  waitTimeMinutes: number;
}

export interface QueueStateView {
  queueId: string;
  currentCount: number;
  maxCapacity: number;
  isAtCapacity: boolean;
  availableSpots: number;
  patientsInQueue: PatientInQueueDto[];
  projectedAt: string;
}

export interface NextTurnView {
  queueId: string;
  patientId: string;
  patientName: string;
  priority: string;
  consultationType: string;
  status: string;
  claimedAt: string | null;
  calledAt: string | null;
  stationId: string | null;
  projectedAt: string;
}

export interface RecentAttentionRecordView {
  queueId: string;
  patientId: string;
  patientName: string;
  priority: string;
  consultationType: string;
  completedAt: string;
  outcome?: string | null;
  notes?: string | null;
}

// Command DTOs (subset)
export interface CheckInPatientDto {
  /** Identificador de la cola destino. Cuando se omite, el backend genera uno. */
  queueId?: string | null;
  patientId: string;
  patientName: string;
  priority: AppointmentPriority;
  consultationType: ConsultationType;
  age?: number | null;
  isPregnant?: boolean | null;
  notes?: string | null;
  actor: string;
}

export interface CallNextCashierDto {
  queueId: string;
  actor: string;
  cashierDeskId?: string | null;
}

export interface ValidatePaymentDto {
  queueId: string;
  patientId: string;
  actor: string;
  paymentReference?: string | null;
}

/** DTO para marcar pago pendiente — sincronizado con backend MarkPaymentPendingDto. */
export interface MarkPaymentPendingDto {
  queueId: string;
  patientId: string;
  actor: string;
  /** Razon por la que el pago queda pendiente. */
  reason?: string | null;
}

export interface ClaimNextPatientDto {
  queueId: string;
  actor: string;
  stationId?: string | null;
}

export interface CompleteAttentionDto {
  queueId: string;
  patientId: string;
  actor: string;
  outcome?: string | null;
  notes?: string | null;
}

const nonEmptyStringSchema = z.string().min(1);
const nullableStringSchema = z.string().nullable();

export const commandSuccessSchema = z.object({
  success: z.boolean(),
  message: nonEmptyStringSchema,
  correlationId: nonEmptyStringSchema,
  eventCount: z.number(),
  patientId: z.string().optional(),
  queueId: z.string().optional(),
});

export const rebuildProjectionResponseSchema = z.object({
  message: nonEmptyStringSchema,
  queueId: nonEmptyStringSchema,
});

export const waitingRoomMonitorViewSchema = z.object({
  queueId: nonEmptyStringSchema,
  totalPatientsWaiting: z.number(),
  highPriorityCount: z.number(),
  urgentPriorityCount: z.number().optional(),
  normalPriorityCount: z.number(),
  lowPriorityCount: z.number(),
  lastPatientCheckedInAt: nullableStringSchema,
  averageWaitTimeMinutes: z.number(),
  utilizationPercentage: z.number(),
  projectedAt: nonEmptyStringSchema,
});

export const patientInQueueSchema = z.object({
  patientId: nonEmptyStringSchema,
  patientName: nonEmptyStringSchema,
  priority: nonEmptyStringSchema,
  checkInTime: nonEmptyStringSchema,
  waitTimeMinutes: z.number(),
});

export const queueStateViewSchema = z.object({
  queueId: nonEmptyStringSchema,
  currentCount: z.number(),
  maxCapacity: z.number(),
  isAtCapacity: z.boolean(),
  availableSpots: z.number(),
  patientsInQueue: z.array(patientInQueueSchema),
  projectedAt: nonEmptyStringSchema,
});

export const nextTurnViewSchema = z.object({
  queueId: nonEmptyStringSchema,
  patientId: nonEmptyStringSchema,
  patientName: nonEmptyStringSchema,
  priority: nonEmptyStringSchema,
  consultationType: nonEmptyStringSchema,
  status: nonEmptyStringSchema,
  claimedAt: nullableStringSchema,
  calledAt: nullableStringSchema,
  stationId: nullableStringSchema,
  projectedAt: nonEmptyStringSchema,
});

export const recentAttentionRecordViewSchema = z.object({
  queueId: nonEmptyStringSchema,
  patientId: nonEmptyStringSchema,
  patientName: nonEmptyStringSchema,
  priority: nonEmptyStringSchema,
  consultationType: nonEmptyStringSchema,
  completedAt: nonEmptyStringSchema,
  outcome: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const recentAttentionHistorySchema = z.array(
  recentAttentionRecordViewSchema,
);

function buildContractError(contractName: string, result: z.ZodError): Error {
  const issue = result.issues[0];
  const path = issue?.path.length ? issue.path.join(".") : "payload";
  return new Error(
    `Contrato inválido en ${contractName}: ${path} ${issue?.message ?? "no cumple el esquema esperado"}`,
  );
}

function validateContract<T>(
  contractName: string,
  schema: z.ZodType<T>,
  payload: unknown,
): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw buildContractError(contractName, result.error);
  }

  return result.data;
}

export function parseCommandSuccess(payload: unknown): CommandSuccess {
  return validateContract("CommandSuccess", commandSuccessSchema, payload);
}

export function parseRebuildProjectionResponse(
  payload: unknown,
): RebuildProjectionResponse {
  return validateContract(
    "RebuildProjectionResponse",
    rebuildProjectionResponseSchema,
    payload,
  );
}

export function parseWaitingRoomMonitorView(
  payload: unknown,
): WaitingRoomMonitorView {
  return validateContract(
    "WaitingRoomMonitorView",
    waitingRoomMonitorViewSchema,
    payload,
  );
}

export function parseQueueStateView(payload: unknown): QueueStateView {
  return validateContract("QueueStateView", queueStateViewSchema, payload);
}

export function parseNextTurnView(payload: unknown): NextTurnView {
  return validateContract("NextTurnView", nextTurnViewSchema, payload);
}

export function parseRecentAttentionHistory(
  payload: unknown,
): RecentAttentionRecordView[] {
  return validateContract(
    "RecentAttentionHistory",
    recentAttentionHistorySchema,
    payload,
  );
}
