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
  activate: (queueId: string, stationId: string, actor?: string) => Promise<void>;
  deactivate: (queueId: string, stationId: string, actor?: string) => Promise<void>;
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

  async function execute(fn: () => Promise<CommandResult>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      setLastResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const activate = useCallback(
    (queueId: string, stationId: string, actor = DEFAULT_ACTOR) =>
      execute(() =>
        activateConsultingRoom(httpCommandAdapter, { queueId, stationId, actor }),
      ),
    [],
  );

  const deactivate = useCallback(
    (queueId: string, stationId: string, actor = DEFAULT_ACTOR) =>
      execute(() =>
        deactivateConsultingRoom(httpCommandAdapter, { queueId, stationId, actor }),
      ),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { busy, error, lastResult, activate, deactivate, clearError };
}
