"use client";
import React from "react";

import type { WaitingRoomMonitorView } from "../../services/api/types";

type Props = { monitor: WaitingRoomMonitorView | null };

export default function MonitorCard({ monitor }: Props) {
  if (!monitor) {
    return (
      <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
        <strong>Monitor</strong>
        <div style={{marginTop:8,color:'#6b7280'}}>No hay datos disponibles.</div>
      </div>
    );
  }

  return (
    <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
      <strong>Monitor</strong>
      <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
        <Stat label="Total en espera" value={monitor.totalPatientsWaiting} />
        <Stat label="Alta prioridad" value={monitor.highPriorityCount} />
        <Stat label="Promedio espera (min)" value={monitor.averageWaitTimeMinutes} />
        <Stat label="Utilización (%)" value={monitor.utilizationPercentage} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div style={{minWidth:140,background:'#f8fafc',padding:8,borderRadius:6}}>
      <div style={{fontSize:12,color:'#6b7280'}}>{label}</div>
      <div style={{fontSize:18,fontWeight:600,marginTop:6}}>{value ?? '-'}</div>
    </div>
  );
}
