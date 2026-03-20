"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAlert } from "../context/AlertContext";
import { httpQueryAdapter } from "../infrastructure/adapters/HttpQueryAdapter";
import type {
  AtencionFullStateView,
  AtencionMonitorView,
  AtencionStateView,
  NextTurnView,
  RecentAttentionRecordView,
} from "../services/api/types";
import {
  connect as signalRConnect,
  disconnect as signalRDisconnect,
  isConnected as signalRIsConnected,
} from "../services/signalr/atencionSignalR";

export type ConnectionState = "connecting" | "online" | "degraded" | "offline";

export function useAtencion(serviceId: string, refreshInterval = 5000) {
  const [monitor, setMonitor] = useState<AtencionMonitorView | null>(null);
  const [queueState, setQueueState] = useState<AtencionStateView | null>(null);
  const [fullState, setFullState] = useState<AtencionFullStateView | null>(null);
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
        httpQueryAdapter.getMonitor(serviceId),
        httpQueryAdapter.getQueueState(serviceId),
        httpQueryAdapter.getNextTurn(serviceId),
        httpQueryAdapter.getRecentHistory(serviceId, 100),
        httpQueryAdapter.getFullState(serviceId),
      ]);
      if (!mounted.current) return;

      const m = results[0].status === "fulfilled" ? results[0].value : null;
      const q = results[1].status === "fulfilled" ? results[1].value : null;
      const n = results[2].status === "fulfilled" ? results[2].value : null;
      const h = results[3].status === "fulfilled" ? results[3].value : [];
      const f = results[4].status === "fulfilled" ? (results[4].value as AtencionFullStateView | null) : null;

      // Solo marcar error si las vistas principales fallan (monitor + queueState)
      const criticalFailures = [results[0], results[1]].filter(r => r.status === "rejected").length;

      if (m) setMonitor(m);
      if (q) setQueueState(q);
      if (f) setFullState(f);
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
  }, [serviceId, alert]);

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
        const conn = await signalRConnect(serviceId, {
          // Cuando el servidor notifique un cambio, refrescar datos inmediatamente
          onMonitor: () => { if (mounted.current) void fetchAll(); },
          onAtencionState: () => { if (mounted.current) void fetchAll(); },
          onNextTurn: () => { if (mounted.current) void fetchAll(); },
          onRecentHistory: () => { if (mounted.current) void fetchAll(); },
          onAny: () => { if (mounted.current) void fetchAll(); },
          onConnected: () => {
            if (mounted.current && signalRIsConnected()) {
              console.info("useAtencion: SignalR conectado, canal push activo.");
            }
          },
          onDisconnected: () => {
            if (mounted.current) {
              console.info("useAtencion: SignalR desconectado, polling REST continúa.");
            }
          },
        });
        if (conn) {
          signalRCleanup = () => void signalRDisconnect();
        }
      } catch {
        // SignalR no pudo conectar; el polling REST sigue funcionando normalmente.
        console.info("useAtencion: SignalR no disponible, usando solo polling REST.");
      }
    })();

    // ─── Evento custom: refresh inmediato tras comandos exitosos ───
    function onCommand(e: Event) {
      try {
        const q = (e as CustomEvent<{ serviceId?: string }>)?.detail?.serviceId;
        if (!q || q === serviceId) refresh();
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
  }, [serviceId, refreshInterval, fetchAll, refresh]);

  return {
    monitor,
    queueState,
    fullState,
    nextTurn,
    history,
    setMonitor,
    setQueueState,
    setFullState,
    setNextTurn,
    refresh,
    connectionState,
    lastUpdated,
  };
}

export type AtencionSetters = {
  setMonitor: (m: AtencionMonitorView | null) => void;
  setQueueState: (q: AtencionStateView | null) => void;
  setFullState: (f: AtencionFullStateView | null) => void;
  setNextTurn: (n: NextTurnView | null) => void;
  refresh: () => void;
  connectionState: ConnectionState;
  lastUpdated: string | null;
};
