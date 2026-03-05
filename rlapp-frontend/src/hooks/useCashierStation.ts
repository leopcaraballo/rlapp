"use client";
import { useCallback, useState } from "react";

import {
  callNextAtCashier,
  cancelByPayment,
  markAbsentAtCashier,
  markPaymentPending,
  validatePayment,
} from "@/application/cashier/CashierUseCases";
import type {
  CancelByPaymentCommand,
  CommandResult,
  MarkAbsentAtCashierCommand,
  MarkPaymentPendingCommand,
  ValidatePaymentCommand,
} from "@/domain/ports/ICommandGateway";
import { httpCommandAdapter } from "@/infrastructure/adapters/HttpCommandAdapter";

export interface CashierStationState {
  busy: boolean;
  error: string | null;
  lastResult: CommandResult | null;
  callNext: (queueId: string, actor?: string, cashierDeskId?: string) => Promise<void>;
  validate: (cmd: Omit<ValidatePaymentCommand, "actor"> & { actor?: string }) => Promise<void>;
  markPending: (cmd: Omit<MarkPaymentPendingCommand, "actor"> & { actor?: string }) => Promise<void>;
  markAbsent: (cmd: Omit<MarkAbsentAtCashierCommand, "actor"> & { actor?: string }) => Promise<void>;
  cancel: (cmd: Omit<CancelByPaymentCommand, "actor"> & { actor?: string }) => Promise<void>;
  clearError: () => void;
}

const DEFAULT_ACTOR = "cashier";

/**
 * Hook de estación de taquilla.
 * Encapsula todas las operaciones de caja delegando a la capa de aplicación.
 */
export function useCashierStation(): CashierStationState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  async function execute(
    fn: () => Promise<CommandResult>,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      setLastResult(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const callNext = useCallback(
    (queueId: string, actor = DEFAULT_ACTOR, cashierDeskId?: string) =>
      execute(() =>
        callNextAtCashier(httpCommandAdapter, { queueId, actor, cashierDeskId: cashierDeskId ?? null }),
      ),
    [],
  );

  const validate = useCallback(
    (cmd: Omit<ValidatePaymentCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        validatePayment(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const markPending = useCallback(
    (cmd: Omit<MarkPaymentPendingCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        markPaymentPending(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const markAbsent = useCallback(
    (cmd: Omit<MarkAbsentAtCashierCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        markAbsentAtCashier(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const cancel = useCallback(
    (cmd: Omit<CancelByPaymentCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        cancelByPayment(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { busy, error, lastResult, callNext, validate, markPending, markAbsent, cancel, clearError };
}
