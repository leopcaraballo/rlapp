/**
 * Casos de uso de gestión de consultorios.
 * Permite activar/desactivar consultorios para recibir pacientes.
 */
import type {
  ActivateConsultingRoomCommand,
  CommandResult,
  DeactivateConsultingRoomCommand,
  ICommandGateway,
} from "../../domain/ports/ICommandGateway";

// ---------------------------------------------------------------------------
// Activar consultorio (el médico está disponible para recibir pacientes)
// ---------------------------------------------------------------------------
export async function activateConsultingRoom(
  gateway: ICommandGateway,
  input: ActivateConsultingRoomCommand,
): Promise<CommandResult> {
  return gateway.activateConsultingRoom(input);
}

// ---------------------------------------------------------------------------
// Desactivar consultorio (el médico no acepta más pacientes temporalmente)
// ---------------------------------------------------------------------------
export async function deactivateConsultingRoom(
  gateway: ICommandGateway,
  input: DeactivateConsultingRoomCommand,
): Promise<CommandResult> {
  return gateway.deactivateConsultingRoom(input);
}
