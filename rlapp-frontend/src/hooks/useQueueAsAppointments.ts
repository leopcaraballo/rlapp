"use client";
import { useMemo } from "react";

import type { ConnectionStatus } from "@/components/WebSocketStatus";
import type { Appointment, AppointmentPriority } from "@/domain/Appointment";
import type { NextTurnView, QueueStateView, RecentAttentionRecordView } from "@/services/api/types";

import { useWaitingRoom } from "./useWaitingRoom";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapPriority(raw: string | undefined | null): AppointmentPriority {
  switch (raw?.trim().toLowerCase()) {
    case "urgent":
      return "Urgent";
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Medium";
  }
}

function mapConnectionStatus(state: string): ConnectionStatus {
  switch (state) {
    case "online":
      return "connected";
    case "connecting":
      return "connecting";
    default:
      return "disconnected";
  }
}

function buildAppointments(
  queueState: QueueStateView | null,
  nextTurn: NextTurnView | null,
  history: RecentAttentionRecordView[],
): Appointment[] {
  const result: Appointment[] = [];

  // --- Turno en consultorio (llamado / en atención) ---
  if (nextTurn) {
    const calledAt = nextTurn.calledAt
      ? new Date(nextTurn.calledAt).getTime()
      : Date.now();

    result.push({
      id: nextTurn.patientId,
      fullName: nextTurn.patientName,
      idCard: nextTurn.patientId,
      office: nextTurn.stationId ?? null,
      timestamp: calledAt,
      status: "called",
      priority: mapPriority(nextTurn.priority),
    });
  }

  // --- Pacientes en espera ---
  if (queueState) {
    for (const p of queueState.patientsInQueue) {
      // Omitir si ya está representado como "called"
      if (nextTurn?.patientId === p.patientId) continue;

      const checkIn = p.checkInTime
        ? new Date(p.checkInTime).getTime()
        : Date.now() - p.waitTimeMinutes * 60_000;

      result.push({
        id: p.patientId,
        fullName: p.patientName,
        idCard: p.patientId,
        office: null,
        timestamp: checkIn,
        status: "waiting",
        priority: mapPriority(p.priority),
      });
    }
  }

  // --- Historial reciente (completados) ---
  for (const h of history.slice(0, 10)) {
    // Evitar duplicados (IDs repetidos por reintentos)
    const compositeId = `${h.patientId}-${h.attendedAt}`;
    if (result.some((a) => a.id === compositeId)) continue;

    result.push({
      id: compositeId,
      fullName: h.patientName,
      idCard: h.patientId,
      office: null,
      timestamp: new Date(h.attendedAt).getTime(),
      completedAt: new Date(h.attendedAt).getTime(),
      status: "completed",
      priority: "Medium",
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Hook público
// ---------------------------------------------------------------------------

export type QueueAppointmentsState = {
  appointments: Appointment[];
  error: string | null;
  connected: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
};

export function useQueueAsAppointments(
  queueId: string,
  refreshInterval = 5_000,
): QueueAppointmentsState {
  const { queueState, nextTurn, history, connectionState } = useWaitingRoom(
    queueId,
    refreshInterval,
  );

  const appointments = useMemo(
    () => buildAppointments(queueState, nextTurn, history),
    [queueState, nextTurn, history],
  );

  const connected = connectionState === "online";
  const isConnecting = connectionState === "connecting";
  const error =
    connectionState === "degraded"
      ? "Sin conexión con el servidor. Reintentando…"
      : null;

  return {
    appointments,
    error,
    connected,
    isConnecting,
    connectionStatus: mapConnectionStatus(connectionState),
  };
}
