"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAlert } from "../context/AlertContext";
import type {
  NextTurnView,
  QueueStateView,
  RecentAttentionRecordView,
  WaitingRoomMonitorView,
} from "../services/api/types";
import {
  getMonitor,
  getNextTurn,
  getQueueState,
  getRecentHistory,
} from "../services/api/waitingRoom";
import {
  connect as signalRConnect,
  disconnect as signalRDisconnect,
  isConnected as signalRIsConnected,
} from "../services/signalr/waitingRoomSignalR";

export type ConnectionState = "connecting" | "online" | "degraded" | "offline";

export function useWaitingRoom(queueId: string, refreshInterval = 5000) {
  const [monitor, setMonitor] = useState<WaitingRoomMonitorView | null>(null);
  const [queueState, setQueueState] = useState<QueueStateView | null>(null);
  const [nextTurn, setNextTurn] = useState<NextTurnView | null>(null);
  const [history, setHistory] = useState<RecentAttentionRecordView[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const failureCount = useRef(0);
  const mounted = useRef(true);
  let alert: { showError: (m: string) => void; showSuccess: (m: string) => void; showInfo: (m: string) => void };
  try {
    alert = useAlert();
  } catch {
    // Cuando los tests renderizan sin AlertProvider, se usa un fallback no-op
    alert = { showError: (_m: string) => {}, showSuccess: (_m: string) => {}, showInfo: (_m: string) => {} };
  }

  // ─── Función reutilizable de fetch que evita duplicación ───
  // Usa Promise.allSettled para que un 404 parcial (e.g. next-turn sin turno activo)
  // no impida actualizar el resto de vistas.
  const fetchAll = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        getMonitor(queueId),
        getQueueState(queueId),
        getNextTurn(queueId),
        getRecentHistory(queueId, 100),
      ]);
      if (!mounted.current) return;

      const m = results[0].status === "fulfilled" ? results[0].value : null;
      const q = results[1].status === "fulfilled" ? results[1].value : null;
      const n = results[2].status === "fulfilled" ? results[2].value : null;
      const h = results[3].status === "fulfilled" ? results[3].value : [];

      // Solo marcar error si las vistas principales fallan (monitor + queueState)
      const criticalFailures = [results[0], results[1]].filter(r => r.status === "rejected").length;

      if (m) setMonitor(m);
      if (q) setQueueState(q);
      setNextTurn(n);
      setHistory(h);
      setLastUpdated(new Date().toISOString());

      if (criticalFailures === 0) {
        failureCount.current = 0;
        setConnectionState("online");
      } else {
        failureCount.current += 1;
        setConnectionState(failureCount.current >= 3 ? "degraded" : "connecting");
      }
    } catch {
      if (!mounted.current) return;
      failureCount.current += 1;
      if (failureCount.current >= 3) {
        setConnectionState("degraded");
        try {
          alert.showError("Problemas de red: no se pudo actualizar la sala de espera.");
        } catch {
          // ignorar
        }
      } else {
        setConnectionState("connecting");
      }
    }
  }, [queueId, alert]);

  // ─── Refresh público: dispara un fetch inmediato (fire-and-forget) ───
  const refresh = useCallback(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    mounted.current = true;

    // ─── Carga inicial ───
    setConnectionState("connecting");
    void fetchAll();

    // ─── Polling periódico como base de datos en tiempo real ───
    const pollingId = setInterval(() => void fetchAll(), refreshInterval);

    // ─── SignalR: canal de baja latencia (complementario al polling) ───
    // Si el servidor emite eventos push, se dispara un refresh inmediato
    // para reducir la latencia de actualización sin depender solo del intervalo.
    let signalRCleanup: (() => void) | null = null;
    void (async () => {
      try {
        const conn = await signalRConnect(queueId, {
          // Cuando el servidor notifique un cambio, refrescar datos inmediatamente
          onMonitor: () => { if (mounted.current) void fetchAll(); },
          onQueueState: () => { if (mounted.current) void fetchAll(); },
          onNextTurn: () => { if (mounted.current) void fetchAll(); },
          onRecentHistory: () => { if (mounted.current) void fetchAll(); },
          onAny: () => { if (mounted.current) void fetchAll(); },
          onConnected: () => {
            if (mounted.current && signalRIsConnected()) {
              console.info("useWaitingRoom: SignalR conectado, canal push activo.");
            }
          },
          onDisconnected: () => {
            if (mounted.current) {
              console.info("useWaitingRoom: SignalR desconectado, polling REST continúa.");
            }
          },
        });
        if (conn) {
          signalRCleanup = () => void signalRDisconnect();
        }
      } catch {
        // SignalR no pudo conectar; el polling REST sigue funcionando normalmente.
        console.info("useWaitingRoom: SignalR no disponible, usando solo polling REST.");
      }
    })();

    // ─── Evento custom: refresh inmediato tras comandos exitosos ───
    function onCommand(e: Event) {
      try {
        const q = (e as CustomEvent<{ queueId?: string }>)?.detail?.queueId;
        if (!q || q === queueId) refresh();
      } catch {
        // ignorar
      }
    }
    window.addEventListener("rlapp:command-success", onCommand as EventListener);

    return () => {
      mounted.current = false;
      clearInterval(pollingId);
      window.removeEventListener("rlapp:command-success", onCommand as EventListener);
      signalRCleanup?.();
    };
  }, [queueId, refreshInterval, fetchAll, refresh]);

  return {
    monitor,
    queueState,
    nextTurn,
    history,
    setMonitor,
    setQueueState,
    setNextTurn,
    refresh,
    connectionState,
    lastUpdated,
  };
}

export type WaitingRoomSetters = {
  setMonitor: (m: WaitingRoomMonitorView | null) => void;
  setQueueState: (q: QueueStateView | null) => void;
  setNextTurn: (n: NextTurnView | null) => void;
  refresh: () => void;
  connectionState: ConnectionState;
  lastUpdated: string | null;
};
