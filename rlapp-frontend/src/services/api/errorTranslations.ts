import type { ApiError } from "./types";

/**
 * Traduce mensajes de error de la API al español para el usuario final.
 *
 * Estrategia:
 * 1. Mapear el campo `message` (descripción en inglés) a una traducción española.
 * 2. Si no hay traducción exacta, usar fallback por código de error (`error`).
 * 3. Si no hay código conocido, devolver el `message` original como último recurso.
 */

// ---------------------------------------------------------------------------
// Traducciones de mensajes de dominio (campo `message` del backend)
// ---------------------------------------------------------------------------

const DOMAIN_MESSAGE_TRANSLATIONS: Record<string, string> = {
  // Capacidad y cola
  "Queue is at maximum capacity": "La sala de espera ha alcanzado su capacidad máxima. No se pueden agregar más pacientes.",
  "No patients available in queue": "No hay pacientes disponibles en la cola.",
  "No patient in waiting state is available for claim": "No hay pacientes en espera disponibles para llamar a consulta.",
  "No patient in waiting-cashier state is available for call": "No hay pacientes en espera disponibles para llamar a taquilla.",

  // Paciente en cola
  "is already in the queue": "El paciente ya está registrado en la cola.",
  "not found in queue": "No se encontró el paciente en la cola.",

  // Estados activos
  "There is already a patient in active attention": "Ya hay un paciente en atención activa. Finalice la atención actual antes de llamar al siguiente.",
  "There is already a patient in active cashier processing": "Ya hay un paciente en taquilla. Finalice el proceso actual antes de llamar al siguiente.",
  "No patient is currently in active attention": "No hay ningún paciente en atención activa.",
  "No patient is currently in active cashier processing": "No hay ningún paciente en taquilla activa.",
  "is not the active attention patient": "Este paciente no es el que está actualmente en atención.",
  "is not the active cashier patient": "Este paciente no es el que está actualmente en taquilla.",

  // Pagos
  "Payment attempts exceeded maximum of": "Se superó el número máximo de intentos de pago. El turno será anulado.",
  "Cannot cancel by payment before reaching": "No se puede anular por pago antes de agotar el número máximo de intentos permitidos.",

  // Ausencias
  "Cashier absence retries exceeded maximum of": "Se superó el número máximo de ausencias en taquilla. El turno será anulado.",

  // Transiciones de estado
  "Invalid state transition for mark-payment-pending": "El paciente no está en un estado válido para registrar pago pendiente.",
  "Invalid state transition for mark-absent-cashier": "El paciente no está en un estado válido para registrar ausencia en taquilla.",
  "Invalid state transition for cancel-by-payment": "El paciente no está en un estado válido para anular por pago.",
  "Invalid state transition for call-patient": "El paciente no está en un estado válido para ser llamado a consulta.",
  "Invalid state transition for complete-attention": "El paciente no está en un estado válido para finalizar la atención.",
  "Invalid state transition for mark-absent-consultation": "El paciente no está en un estado válido para registrar ausencia en consulta.",

  // Salas de consulta
  "ConsultingRoomId is required": "El identificador de la sala de consulta es requerido.",
  "is not active": "La sala de consulta no está activa.",
  "is already active": "La sala de consulta ya está activa.",
  "is already inactive": "La sala de consulta ya está inactiva.",

  // Validaciones básicas
  "Patient name cannot be empty": "El nombre del paciente no puede estar vacío.",
  "PatientId cannot be empty": "El ID del paciente no puede estar vacío.",
  "WaitingQueueId cannot be empty": "El ID de la cola no puede estar vacío.",
  "Queue name cannot be empty": "El nombre de la cola no puede estar vacío.",
  "MaxCapacity must be greater than 0": "La capacidad máxima debe ser mayor a 0.",
  "Priority cannot be empty": "La prioridad no puede estar vacía.",
  "ConsultationType cannot be empty": "El tipo de consulta no puede estar vacío.",
  "ConsultationType must be between 2 and 100 characters": "El tipo de consulta debe tener entre 2 y 100 caracteres.",
  "Invalid priority": "La prioridad indicada no es válida. Los valores aceptados son: Low, Medium, High, Urgent.",

  // Aggregate not found
  "not found in event store": "No se encontró la cola indicada. Verifique el identificador e intente de nuevo.",

  // Concurrencia
  "The resource was modified by another request. Please retry.": "La operación fue modificada por otra solicitud simultánea. Por favor, intente de nuevo.",
};

// ---------------------------------------------------------------------------
// Fallbacks por código de error (`error` del backend)
// ---------------------------------------------------------------------------

const ERROR_CODE_FALLBACKS: Record<string, string> = {
  DomainViolation: "La operación no es válida en el estado actual del paciente.",
  AggregateNotFound: "No se encontró la cola indicada. Verifique el identificador e intente de nuevo.",
  ConcurrencyConflict: "La operación fue modificada por otra solicitud simultánea. Por favor, intente de nuevo.",
  InternalServerError: "Ocurrió un error inesperado en el servidor. Por favor, intente de nuevo o contacte soporte.",
};

// ---------------------------------------------------------------------------
// Función principal de traducción
// ---------------------------------------------------------------------------

export function translateApiError(apiError: ApiError): string {
  const raw = apiError.message ?? "";

  // Búsqueda exacta o parcial en el diccionario de mensajes
  for (const [key, translation] of Object.entries(DOMAIN_MESSAGE_TRANSLATIONS)) {
    if (raw.includes(key)) {
      return translation;
    }
  }

  // Fallback por código de error
  if (apiError.error && ERROR_CODE_FALLBACKS[apiError.error]) {
    return ERROR_CODE_FALLBACKS[apiError.error];
  }

  // Último recurso: devolver el mensaje original (puede estar en inglés)
  return raw || apiError.error || "Error desconocido.";
}
