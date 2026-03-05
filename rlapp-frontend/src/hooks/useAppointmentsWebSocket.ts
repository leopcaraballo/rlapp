"use client";

import { useCallback,useEffect, useState } from "react";

import { useDependencies } from "@/context/DependencyContext";
import { Appointment } from "@/domain/Appointment";

/**
 * Real-time hook using WebSocket (Socket.IO).
 */
export function useAppointmentsWebSocket(
  onUpdate?: (appointment: Appointment) => void,
) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  // 🛡️ HUMAN CHECK - DI: Inject RealTime implementation (SocketIO, SSE, Mock)
  const { realTime } = useDependencies();

  const updateAppointment = useCallback((updatedAppointment: Appointment) => {
    setAppointments((prev) => {
      const index = prev.findIndex((t) => t.id === updatedAppointment.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = updatedAppointment;
        return updated;
      }
      return [...prev, updatedAppointment];
    });
  }, []);

  useEffect(() => {
    // Setup listeners
    realTime.onConnect(() => {
      setConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    realTime.onDisconnect(() => {
      setConnected(false);
      setIsConnecting(true);
    });

    realTime.onError(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_err) => {
        setError("Error de conexión en tiempo real");
        setConnected(false);
        setIsConnecting(false);
      },
    );

    realTime.onSnapshot((data) => {
      setAppointments(data);
    });

    realTime.onAppointmentUpdated((data) => {
      updateAppointment(data);
      if (onUpdate) onUpdate(data);
    });

    // Initialize connection
    realTime.connect();

    return () => {
      realTime.disconnect();
    };
  }, [realTime, updateAppointment, onUpdate]);

  const connectionStatus = connected
    ? "connected"
    : isConnecting
      ? "connecting"
      : "disconnected";

  return { appointments, error, connected, isConnecting, connectionStatus };
}
