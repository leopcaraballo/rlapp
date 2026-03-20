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
  serviceId?: string;
  turnNumber?: number;
}

export interface AtencionMonitorView {
  serviceId: string;
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
  turnNumber: number;
}

export interface AtencionStateView {
  serviceId: string;
  currentCount: number;
  maxCapacity: number;
  isAtCapacity: boolean;
  availableSpots: number;
  patientsInQueue: PatientInQueueDto[];
  projectedAt: string;
}

export interface AtencionFullStateView {
  serviceId: string;
  waiting: PatientInQueueDto[];
  inConsultation: NextTurnView[];
  waitingPayment: NextTurnView[];
  projectedAt: string;
}

export interface NextTurnView {
  serviceId: string;
  patientId: string;
  patientName: string;
  turnNumber: number;
  priority: string;
  consultationType: string;
  status: string;
  claimedAt: string | null;
  calledAt: string | null;
  stationId: string | null;
  projectedAt: string;
}

export interface RecentAttentionRecordView {
  serviceId: string;
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
  serviceId?: string | null;
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
  serviceId: string;
  actor: string;
  cashierDeskId?: string | null;
}

export interface ValidatePaymentDto {
  serviceId: string;
  patientId: string;
  actor: string;
  paymentReference: string;
}

export interface ClaimNextPatientDto {
  serviceId: string;
  actor: string;
  stationId?: string | null;
}

export interface CompleteAttentionDto {
  serviceId: string;
  patientId: string;
  actor: string;
  outcome: string;
  notes?: string | null;
}
