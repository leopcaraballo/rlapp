"use client";
import { useEffect, useRef,useState } from "react";

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
    // When tests render components without AlertProvider, provide a no-op fallback
    alert = { showError: (_m: string) => {}, showSuccess: (_m: string) => {}, showInfo: (_m: string) => {} };
  }

  useEffect(() => {
    mounted.current = true;

    async function fetchAll() {
      setConnectionState("connecting");
      try {
        const [m, q, n, h] = await Promise.all([
          getMonitor(queueId),
          getQueueState(queueId),
          getNextTurn(queueId),
          getRecentHistory(queueId, 10),
        ]);
        if (!mounted.current) return;
        setMonitor(m);
        setQueueState(q);
        setNextTurn(n);
        setHistory(h);
        setLastUpdated(new Date().toISOString());
        failureCount.current = 0;
        setConnectionState("online");
      } catch {
        failureCount.current += 1;
        if (failureCount.current >= 3) {
          setConnectionState("degraded");
          try {
            alert.showError("Problemas de red: no se pudo actualizar la sala de espera.");
          } catch {}
        } else {
          setConnectionState("connecting");
        }
      }
    }

    fetchAll();
    const id = setInterval(fetchAll, refreshInterval);

    function onCommand(e: Event) {
      try {
        const q = (e as CustomEvent<{ queueId?: string }>)?.detail?.queueId;
        if (!q || q === queueId) refresh();
      } catch {
        // ignore
      }
    }
    window.addEventListener("rlapp:command-success", onCommand as EventListener);
    return () => {
      mounted.current = false;
      clearInterval(id);
      window.removeEventListener("rlapp:command-success", onCommand as EventListener);
    };
  }, [queueId, refreshInterval, alert]);

  const refresh = () => {
    // fire-and-forget
    void (async () => {
      try {
        const [m, q, n, h] = await Promise.all([
          getMonitor(queueId),
          getQueueState(queueId),
          getNextTurn(queueId),
          getRecentHistory(queueId, 10),
        ]);
        setMonitor(m);
        setQueueState(q);
        setNextTurn(n);
        setHistory(h);
        setLastUpdated(new Date().toISOString());
        failureCount.current = 0;
        setConnectionState("online");
      } catch {
        failureCount.current += 1;
        if (failureCount.current >= 3) {
          setConnectionState("degraded");
          try {
            alert.showError("Problemas de red: no se pudo actualizar la sala de espera.");
          } catch {}
        }
      }
    })();
  };

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
