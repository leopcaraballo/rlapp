"use client";
import { useCallback, useState } from "react";

import {
  activateConsultingRoom,
  deactivateConsultingRoom,
} from "@/application/consulting-rooms/ConsultingRoomUseCases";
import type { CommandResult } from "@/domain/ports/ICommandGateway";
import { httpCommandAdapter } from "@/infrastructure/adapters/HttpCommandAdapter";

export interface ConsultingRoomsState {
  busy: boolean;
  error: string | null;
  lastResult: CommandResult | null;
  activate: (serviceId: string, stationId: string, actor?: string) => Promise<boolean>;
  deactivate: (serviceId: string, stationId: string, actor?: string) => Promise<boolean>;
  clearError: () => void;
}

const DEFAULT_ACTOR = "admin";

/**
 * Hook de gestión de consultorios.
 * Permite activar y desactivar consultorios por estación.
 */
export function useConsultingRooms(): ConsultingRoomsState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  async function execute(fn: () => Promise<CommandResult>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      setLastResult(result);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const activate = useCallback(
    (serviceId: string, stationId: string, actor = DEFAULT_ACTOR) =>
      execute(() =>
        activateConsultingRoom(httpCommandAdapter, { serviceId, stationId, actor }),
      ),
    [],
  );

  const deactivate = useCallback(
    (serviceId: string, stationId: string, actor = DEFAULT_ACTOR) =>
      execute(() =>
        deactivateConsultingRoom(httpCommandAdapter, { serviceId, stationId, actor }),
      ),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { busy, error, lastResult, activate, deactivate, clearError };
}
