import type { AppointmentPriority } from "../../domain/Appointment";
import type { ConsultationType } from "../../domain/patient/ConsultationType";
import type {
  CheckInPatientCommand,
  CommandResult,
  ICommandGateway,
} from "../../domain/ports/ICommandGateway";

export interface CheckInInput {
  queueId: string;
  patientId: string;
  patientName: string;
  priority: AppointmentPriority;
  consultationType: ConsultationType;
  age?: number | null;
  isPregnant?: boolean | null;
  notes?: string | null;
  /** ID del actor (recepcionista) que ejecuta el registro. */
  actor: string;
}

/**
 * Caso de uso: registrar check-in de paciente.
 *
 * Reglas de negocio del backend:
 *   - La cola no puede superar su capacidad máxima.
 *   - No se permite duplicar el check-in de un mismo paciente en la misma cola.
 *   - Los menores de 18 años, mayores de 65 y pacientes embarazadas
 *     tienen su prioridad auto-escalada por el backend.
 */
export async function checkInPatient(
  gateway: ICommandGateway,
  input: CheckInInput,
): Promise<CommandResult> {
  const cmd: CheckInPatientCommand = {
    queueId: input.queueId,
    patientId: input.patientId,
    patientName: input.patientName.trim(),
    priority: input.priority,
    consultationType: input.consultationType,
    age: input.age ?? null,
    isPregnant: input.isPregnant ?? null,
    notes: input.notes ?? null,
    actor: input.actor,
  };
  return gateway.checkInPatient(cmd);
}
