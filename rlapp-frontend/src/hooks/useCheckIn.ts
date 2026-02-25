"use client";
import { useCallback, useState } from "react";

import { checkInPatient } from "@/application/reception/CheckInPatientUseCase";
import type { AppointmentPriority } from "@/domain/Appointment";
import type { ConsultationType } from "@/domain/patient/ConsultationType";
import type { CommandResult } from "@/domain/ports/ICommandGateway";
import { httpCommandAdapter } from "@/infrastructure/adapters/HttpCommandAdapter";

export interface CheckInInput {
  queueId: string;
  patientId: string;
  patientName: string;
  priority?: AppointmentPriority;
  consultationType?: ConsultationType;
  age?: number | null;
  isPregnant?: boolean | null;
  notes?: string | null;
  actor?: string;
}

export interface CheckInState {
  busy: boolean;
  error: string | null;
  lastResult: CommandResult | null;
  checkIn: (input: CheckInInput) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook para el registro de check-in de pacientes.
 * Delega al caso de uso CheckInPatientUseCase.
 */
export function useCheckIn(): CheckInState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  const checkIn = useCallback(async (input: CheckInInput): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await checkInPatient(httpCommandAdapter, {
        queueId: input.queueId,
        patientId: input.patientId,
        patientName: input.patientName,
        priority: input.priority ?? "Medium",
        consultationType: input.consultationType ?? "General",
        age: input.age,
        isPregnant: input.isPregnant,
        notes: input.notes,
        actor: input.actor ?? "reception",
      });
      setLastResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { busy, error, lastResult, checkIn, clearError };
}
