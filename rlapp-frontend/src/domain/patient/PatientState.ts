/**
 * Estados del paciente en la máquina de estados del backend.
 * Sincronizado con el enum PatientState del dominio backend.
 *
 * Flujo principal:
 *   WaitingAtReception
 *     → CalledAtCashier → PaymentValidated | PaymentPending | AbsentAtCashier | CancelledByPayment
 *     → WaitingAtConsulting → CalledAtConsulting → InConsultation → AttentionCompleted | AbsentAtConsultation
 */
// ⚕️ HUMAN CHECK - Sincronizado con la máquina de estados WaitingRoom.Domain
export type PatientState =
  | "WaitingAtReception"
  | "WaitingAtCashier"
  | "CalledAtCashier"
  | "PaymentValidated"
  | "PaymentPending"
  | "WaitingAtConsulting"
  | "CalledAtConsulting"
  | "InConsultation"
  | "AttentionCompleted"
  | "AbsentAtCashier"
  | "AbsentAtConsultation"
  | "CancelledByPayment"
  | "Cancelled";

/** Etiquetas en español para mostrar al usuario por estación. */
export const PATIENT_STATE_LABELS: Record<PatientState, string> = {
  WaitingAtReception: "Esperando en recepción",
  WaitingAtCashier: "En cola para caja",
  CalledAtCashier: "Llamado a caja",
  PaymentValidated: "Pago validado",
  PaymentPending: "Pago pendiente",
  WaitingAtConsulting: "En sala de espera",
  CalledAtConsulting: "Llamado a consultorio",
  InConsultation: "En consulta",
  AttentionCompleted: "Atención completada",
  AbsentAtCashier: "Ausente en caja",
  AbsentAtConsultation: "Ausente en consultorio",
  CancelledByPayment: "Cancelado por pago",
  Cancelled: "Cancelado",
};

/** Retorna true si el estado es un estado terminal (no cambia más). */
export function isTerminalState(state: PatientState): boolean {
  return (
    state === "AttentionCompleted" ||
    state === "AbsentAtCashier" ||
    state === "AbsentAtConsultation" ||
    state === "CancelledByPayment" ||
    state === "Cancelled"
  );
}
