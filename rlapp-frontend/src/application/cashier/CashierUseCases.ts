/**
 * Casos de uso de la estación de taquilla (caja).
 *
 * Flujo de estados del paciente en taquilla:
 *   WaitingAtCashier → CalledAtCashier → PaymentValidated → WaitingAtConsulting
 *                                       → PaymentPending   → (reintento, máx. 3)
 *                                       → AbsentAtCashier  → (terminal)
 *                                       → CancelledByPayment → (terminal)
 */
import type {
  CallNextAtCashierCommand,
  CancelByPaymentCommand,
  CommandResult,
  ICommandGateway,
  MarkAbsentAtCashierCommand,
  MarkPaymentPendingCommand,
  ValidatePaymentCommand,
} from "../../domain/ports/ICommandGateway";

// ---------------------------------------------------------------------------
// Llamar al siguiente paciente en caja
// ---------------------------------------------------------------------------
export async function callNextAtCashier(
  gateway: ICommandGateway,
  input: CallNextAtCashierCommand,
): Promise<CommandResult> {
  return gateway.callNextAtCashier(input);
}

// ---------------------------------------------------------------------------
// Validar pago del paciente actual
// ---------------------------------------------------------------------------
export async function validatePayment(
  gateway: ICommandGateway,
  input: ValidatePaymentCommand,
): Promise<CommandResult> {
  return gateway.validatePayment(input);
}

// ---------------------------------------------------------------------------
// Marcar pago como pendiente (máximo 3 reintentos antes de cancelar)
// ---------------------------------------------------------------------------
export async function markPaymentPending(
  gateway: ICommandGateway,
  input: MarkPaymentPendingCommand,
): Promise<CommandResult> {
  return gateway.markPaymentPending(input);
}

// ---------------------------------------------------------------------------
// Marcar paciente como ausente en caja
// ---------------------------------------------------------------------------
export async function markAbsentAtCashier(
  gateway: ICommandGateway,
  input: MarkAbsentAtCashierCommand,
): Promise<CommandResult> {
  return gateway.markAbsentAtCashier(input);
}

// ---------------------------------------------------------------------------
// Cancelar atención por falta de pago
// ---------------------------------------------------------------------------
export async function cancelByPayment(
  gateway: ICommandGateway,
  input: CancelByPaymentCommand,
): Promise<CommandResult> {
  return gateway.cancelByPayment(input);
}
