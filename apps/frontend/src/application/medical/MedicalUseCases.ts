/**
 * Casos de uso de la estación médica (consultorio).
 *
 * Flujo de estados del paciente en consultorio:
 *   WaitingAtConsulting → CalledAtConsulting → InConsultation → AttentionCompleted
 *                                            → AbsentAtConsultation → (terminal, máx. 1 ausencia)
 */
import type {
  CallPatientCommand,
  ClaimNextPatientCommand,
  CommandResult,
  CompleteAttentionCommand,
  ICommandGateway,
  MarkAbsentAtMedicalCommand,
} from "../../domain/ports/ICommandGateway";

// ---------------------------------------------------------------------------
// Reclamar el siguiente paciente de la cola (el médico queda asignado)
// ---------------------------------------------------------------------------
export async function claimNextPatient(
  gateway: ICommandGateway,
  input: ClaimNextPatientCommand,
): Promise<CommandResult> {
  return gateway.claimNextPatient(input);
}

// ---------------------------------------------------------------------------
// Llamar al paciente hacia el consultorio (cambia estado a CalledAtConsulting)
// ---------------------------------------------------------------------------
export async function callPatient(
  gateway: ICommandGateway,
  input: CallPatientCommand,
): Promise<CommandResult> {
  return gateway.callPatient(input);
}

// ---------------------------------------------------------------------------
// Completar la atención médica (estado terminal: AttentionCompleted)
// ---------------------------------------------------------------------------
export async function completeAttention(
  gateway: ICommandGateway,
  input: CompleteAttentionCommand,
): Promise<CommandResult> {
  return gateway.completeAttention(input);
}

// ---------------------------------------------------------------------------
// Marcar paciente como ausente en consultorio (máximo 1 ausencia permitida)
// ---------------------------------------------------------------------------
export async function markAbsentAtMedical(
  gateway: ICommandGateway,
  input: MarkAbsentAtMedicalCommand,
): Promise<CommandResult> {
  return gateway.markAbsentAtMedical(input);
}
