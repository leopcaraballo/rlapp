"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWaitingRoom } from "../../../hooks/useWaitingRoom";
import MonitorCard from "../../../components/WaitingRoom/MonitorCard";
import QueueStateCard from "../../../components/WaitingRoom/QueueStateCard";
import NextTurnCard from "../../../components/WaitingRoom/NextTurnCard";
import RecentHistory from "../../../components/WaitingRoom/RecentHistory";
import NetworkStatus from "../../../components/NetworkStatus";

type Props = { params: { queueId: string } };

export default function WaitingRoomPage({ params }: Props) {
  const { queueId } = params;
  const { monitor, queueState, nextTurn, history, refresh, connectionState, lastUpdated } = useWaitingRoom(queueId);

  useEffect(() => {
    // initial refresh when mounting
    refresh();
  }, [queueId]);

  return (
    <main style={{padding:20,maxWidth:1100,margin:'0 auto'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <h1 style={{margin:0,fontSize:20}}>Sala de espera — {queueId}</h1>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <NetworkStatus connectionState={connectionState} lastUpdated={lastUpdated} onForceRefresh={refresh} />
        </div>
      </header>

      <section style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <MonitorCard monitor={monitor} />
          <QueueStateCard queueState={queueState} />
          <NextTurnCard nextTurn={nextTurn} />
          <RecentHistory history={history} />
        </div>

        <aside style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
            <strong>Acciones rápidas</strong>
            <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:8}}>
              <Link href={`/reception?queue=${encodeURIComponent(queueId)}`} style={{padding:8,background:'#f3f4f6',borderRadius:6,textDecoration:'none'}}>Registrar check-in</Link>
              <Link href={`/cashier?queue=${encodeURIComponent(queueId)}`} style={{padding:8,background:'#f3f4f6',borderRadius:6,textDecoration:'none'}}>Ir a caja</Link>
              <Link href={`/medical?queue=${encodeURIComponent(queueId)}`} style={{padding:8,background:'#f3f4f6',borderRadius:6,textDecoration:'none'}}>Ir a área médica</Link>
              <button onClick={() => { void (async ()=>{ await fetch(`/api/v1/waiting-room/${encodeURIComponent(queueId)}/rebuild`, { method: 'POST' }); refresh(); })(); }} style={{padding:8,borderRadius:6}}>Reconstruir proyección</button>
            </div>
          </div>

          <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
            <strong>Detalles</strong>
            <div style={{marginTop:8,color:'#6b7280'}}>Última actualización: {monitor?.projectedAt ?? '—'}</div>
          </div>
        </aside>
      </section>
    </main>
  );
}
