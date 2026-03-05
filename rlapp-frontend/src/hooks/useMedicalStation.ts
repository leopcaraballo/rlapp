"use client";
import { useCallback, useState } from "react";

import {
  callPatient,
  claimNextPatient,
  completeAttention,
  markAbsentAtMedical,
} from "@/application/medical/MedicalUseCases";
import type {
  CallPatientCommand,
  ClaimNextPatientCommand,
  CommandResult,
  CompleteAttentionCommand,
  MarkAbsentAtMedicalCommand,
} from "@/domain/ports/ICommandGateway";
import { httpCommandAdapter } from "@/infrastructure/adapters/HttpCommandAdapter";

export interface MedicalStationState {
  busy: boolean;
  error: string | null;
  lastResult: CommandResult | null;
  claim: (cmd: Omit<ClaimNextPatientCommand, "actor"> & { actor?: string }) => Promise<void>;
  call: (cmd: Omit<CallPatientCommand, "actor"> & { actor?: string }) => Promise<void>;
  complete: (cmd: Omit<CompleteAttentionCommand, "actor"> & { actor?: string }) => Promise<void>;
  markAbsent: (cmd: Omit<MarkAbsentAtMedicalCommand, "actor"> & { actor?: string }) => Promise<void>;
  clearError: () => void;
}

const DEFAULT_ACTOR = "doctor";

/**
 * Hook de estación médica.
 * Encapsula todas las operaciones del consultorio delegando a la capa de aplicación.
 */
export function useMedicalStation(): MedicalStationState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  async function execute(fn: () => Promise<CommandResult>): Promise<void> {
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

  const claim = useCallback(
    (cmd: Omit<ClaimNextPatientCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        claimNextPatient(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const call = useCallback(
    (cmd: Omit<CallPatientCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        callPatient(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const complete = useCallback(
    (cmd: Omit<CompleteAttentionCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        completeAttention(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const markAbsent = useCallback(
    (cmd: Omit<MarkAbsentAtMedicalCommand, "actor"> & { actor?: string }) =>
      execute(() =>
        markAbsentAtMedical(httpCommandAdapter, { ...cmd, actor: cmd.actor ?? DEFAULT_ACTOR }),
      ),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { busy, error, lastResult, claim, call, complete, markAbsent, clearError };
}
