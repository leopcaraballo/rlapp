import type { AppointmentPriority } from "../../domain/Appointment";
import type { ConsultationType } from "../../domain/patient/ConsultationType";

export interface ApiError {
  error: string;
  message?: string;
  correlationId?: string;
  detail?: string;
}

export interface CommandSuccess {
  success: boolean;
  message: string;
  correlationId: string;
  eventCount: number;
  patientId?: string;
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
  attendedAt: string;
  outcome?: string | null;
}

// Command DTOs (subset)
export interface CheckInPatientDto {
  queueId: string;
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
