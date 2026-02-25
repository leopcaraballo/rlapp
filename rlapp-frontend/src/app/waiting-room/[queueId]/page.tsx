"use client";
import Link from "next/link";
import React, { useEffect } from "react";

import styles from "@/styles/page.module.css";

import NetworkStatus from "../../../components/NetworkStatus";
import MonitorCard from "../../../components/WaitingRoom/MonitorCard";
import NextTurnCard from "../../../components/WaitingRoom/NextTurnCard";
import QueueStateCard from "../../../components/WaitingRoom/QueueStateCard";
import RecentHistory from "../../../components/WaitingRoom/RecentHistory";
import { useWaitingRoom } from "../../../hooks/useWaitingRoom";

type Props = { params: { queueId: string } };

export default function WaitingRoomPage({ params }: Props) {
  const { queueId } = params;
  const { monitor, queueState, nextTurn, history, refresh, connectionState, lastUpdated } = useWaitingRoom(queueId);

  useEffect(() => {
    refresh();
  }, [queueId]);

  return (
    <main className={styles.dashboardSplitLayout}>
      <section className={styles.leftPanel}>
        <header className={styles.stickyHeader}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h1 className={styles.title}>Sala de espera — {queueId}</h1>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <NetworkStatus connectionState={connectionState} lastUpdated={lastUpdated} onForceRefresh={refresh} />
            </div>
          </div>
          <div style={{marginTop:8,color:'#6b7280'}}>Última actualización: {lastUpdated ?? '—'}</div>
        </header>

        <div className={styles.sectionBlock}>
          <div className={styles.cardGrid}>
            <MonitorCard monitor={monitor} />
            <QueueStateCard queueState={queueState} />
            <NextTurnCard nextTurn={nextTurn} />
            <RecentHistory history={history} />
          </div>
        </div>
      </section>

      <aside className={styles.rightPanel}>
        <div className={styles.queueCard}>
          <strong>Acciones rápidas</strong>
          <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:8}}>
            <Link href={`/reception?queue=${encodeURIComponent(queueId)}`}>Registrar check-in</Link>
            <Link href={`/cashier?queue=${encodeURIComponent(queueId)}`}>Ir a caja</Link>
            <Link href={`/medical?queue=${encodeURIComponent(queueId)}`}>Ir a área médica</Link>
            <button onClick={() => { void (async ()=>{ await fetch(`/api/v1/waiting-room/${encodeURIComponent(queueId)}/rebuild`, { method: 'POST' }); refresh(); })(); }} style={{padding:8,borderRadius:6}}>Reconstruir proyección</button>
          </div>
        </div>

        <div className={styles.queueCard}>
          <strong>Detalles</strong>
          <div style={{marginTop:8,color:'#6b7280'}}>Última actualización: {monitor?.projectedAt ?? '—'}</div>
        </div>
      </aside>
    </main>
  );
}
