/**
 * Eventos de dominio emitidos por el backend (Event Sourcing).
 * Se usarán cuando el SignalR hub WaitingRoomHub esté implementado.
 *
 * Ref: WaitingRoom.Domain — 14 domain events.
 */
// ⚕️ HUMAN CHECK - Sincronizado con los DomainEvent derivados de WaitingRoom.Domain
export type QueueEventType =
  | "PatientCheckedIn"
  | "PatientCalledAtCashier"
  | "PaymentValidated"
  | "PaymentMarkedAsPending"
  | "PatientMarkedAbsentAtCashier"
  | "AttentionCancelledByPayment"
  | "PatientCalledToConsultingRoom"
  | "PatientClaimedByDoctor"
  | "PatientCalledByDoctor"
  | "AttentionCompleted"
  | "PatientMarkedAbsentAtConsultation"
  | "PatientPriorityEscalated"
  | "ConsultingRoomActivated"
  | "ConsultingRoomDeactivated";

/** Estructura base de un evento recibido por SignalR. */
export interface QueueEvent {
  eventType: QueueEventType;
  queueId: string;
  patientId?: string;
  patientName?: string;
  occurredAt: string; // ISO
  correlationId?: string;
  // Payload adicional según el tipo de evento
  payload?: Record<string, unknown>;
}
