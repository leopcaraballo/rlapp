import type { AppointmentPriority } from "../Appointment";
import type { ConsultationType } from "../patient/ConsultationType";

// ---------------------------------------------------------------------------
// Comandos — uno por cada POST del backend
// ---------------------------------------------------------------------------

export interface CheckInPatientCommand {
  serviceId: string;
  patientId: string;
  patientName: string;
  priority: AppointmentPriority;
  consultationType: ConsultationType;
  age?: number | null;
  isPregnant?: boolean | null;
  notes?: string | null;
  actor: string;
}

export interface CallNextAtCashierCommand {
  serviceId: string;
  actor: string;
  cashierDeskId?: string | null;
}

export interface ValidatePaymentCommand {
  serviceId: string;
  patientId: string;
  actor: string;
  paymentReference?: string | null;
}

export interface MarkPaymentPendingCommand {
  serviceId: string;
  patientId: string;
  actor: string;
  reason?: string | null;
}

export interface MarkAbsentAtCashierCommand {
  serviceId: string;
  patientId: string;
  actor: string;
}

export interface CancelByPaymentCommand {
  serviceId: string;
  patientId: string;
  actor: string;
  reason?: string | null;
}

export interface ClaimNextPatientCommand {
  serviceId: string;
  actor: string;
  stationId?: string | null;
}

export interface CallPatientCommand {
  serviceId: string;
  patientId: string;
  actor: string;
  stationId?: string | null;
}

export interface CompleteAttentionCommand {
  serviceId: string;
  patientId: string;
  actor: string;
  outcome?: string | null;
  notes?: string | null;
}

export interface MarkAbsentAtMedicalCommand {
  serviceId: string;
  patientId: string;
  actor: string;
}

export interface ActivateConsultingRoomCommand {
  serviceId: string;
  stationId: string;
  actor: string;
}

export interface DeactivateConsultingRoomCommand {
  serviceId: string;
  stationId: string;
  actor: string;
}

/** Resultado estándar de un comando del backend. */
export interface CommandResult {
  success: boolean;
  message: string;
  correlationId: string;
  eventCount: number;
  patientId?: string;
  /** Consultorio auto-asignado por el backend al llamar siguiente paciente. */
  stationId?: string;
}

/**
 * Puerto de comandos — abstracción del canal HTTP POST hacia el backend.
 * La implementación concreta es HttpCommandAdapter.
 */
export interface ICommandGateway {
  checkInPatient(cmd: CheckInPatientCommand): Promise<CommandResult>;
  callNextAtCashier(cmd: CallNextAtCashierCommand): Promise<CommandResult>;
  validatePayment(cmd: ValidatePaymentCommand): Promise<CommandResult>;
  markPaymentPending(cmd: MarkPaymentPendingCommand): Promise<CommandResult>;
  markAbsentAtCashier(cmd: MarkAbsentAtCashierCommand): Promise<CommandResult>;
  cancelByPayment(cmd: CancelByPaymentCommand): Promise<CommandResult>;
  claimNextPatient(cmd: ClaimNextPatientCommand): Promise<CommandResult>;
  callPatient(cmd: CallPatientCommand): Promise<CommandResult>;
  completeAttention(cmd: CompleteAttentionCommand): Promise<CommandResult>;
  markAbsentAtMedical(cmd: MarkAbsentAtMedicalCommand): Promise<CommandResult>;
  activateConsultingRoom(
    cmd: ActivateConsultingRoomCommand,
  ): Promise<CommandResult>;
  deactivateConsultingRoom(
    cmd: DeactivateConsultingRoomCommand,
  ): Promise<CommandResult>;
}
