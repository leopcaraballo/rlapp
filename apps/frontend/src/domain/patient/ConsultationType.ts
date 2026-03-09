/**
 * Tipo de consulta — sincronizado con el enum ConsultationType del backend.
 * Se envía en el campo consultationType del CheckInPatientDto.
 */
// ⚕️ HUMAN CHECK - Sincronizado con WaitingRoom.Domain ConsultationType
export type ConsultationType = "General" | "Specialist" | "Emergency";

/** Etiquetas en español para el selector del formulario. */
export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  General: "Consulta general",
  Specialist: "Especialista",
  Emergency: "Urgencias",
};
