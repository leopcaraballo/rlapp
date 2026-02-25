import React, { useEffect } from "react";

import { useWaitingRoom } from "../hooks/useWaitingRoom";
import { connect, disconnect } from "../services/signalr/waitingRoomSignalR";

export default function WaitingRoomDemo({ queueId = "default-queue" }: { queueId?: string }) {
  const { monitor, queueState, nextTurn, history, setMonitor, setQueueState, setNextTurn, refresh } = useWaitingRoom(queueId, 8000);

  useEffect(() => {
    let mounted = true;

    // Connect SignalR and register handlers to update React state
    (async () => {
      try {
        const conn = await connect(queueId, {
          onMonitor: (payload) => { if (mounted) setMonitor(payload); },
          onQueueState: (payload) => { if (mounted) setQueueState(payload); },
          onNextTurn: (payload) => { if (mounted) setNextTurn(payload); },
          onAny: () => {},
        });

        // If connection established, request immediate refresh
        if (conn) refresh();
      } catch {
        // ignore connection errors; polling will keep data fresh
      }
    })();

    return () => {
      mounted = false;
      void disconnect();
    };
  }, [queueId, setMonitor, setQueueState, setNextTurn, refresh]);

  return (
    <div style={{ padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h3>Waiting Room Demo — {queueId}</h3>
      <section>
        <h4>Monitor</h4>
        <pre>{monitor ? JSON.stringify(monitor, null, 2) : "Cargando..."}</pre>
      </section>
      <section>
        <h4>Queue State</h4>
        <pre>{queueState ? JSON.stringify(queueState, null, 2) : "Cargando..."}</pre>
      </section>
      <section>
        <h4>Next Turn</h4>
        <pre>{nextTurn ? JSON.stringify(nextTurn, null, 2) : "Cargando..."}</pre>
      </section>
      <section>
        <h4>Recent</h4>
        <pre>{history.length ? JSON.stringify(history, null, 2) : "Cargando..."}</pre>
      </section>
    </div>
  );
}
