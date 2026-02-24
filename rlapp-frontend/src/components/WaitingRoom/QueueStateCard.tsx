"use client";
import React from "react";
import type { QueueStateView } from "../../services/api/types";

type Props = { queueState: QueueStateView | null };

export default function QueueStateCard({ queueState }: Props) {
  if (!queueState) {
    return (
      <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
        <strong>Estado de Cola</strong>
        <div style={{marginTop:8,color:'#6b7280'}}>No hay datos.</div>
      </div>
    );
  }

  return (
    <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
      <strong>Estado de Cola</strong>
      <div style={{marginTop:8}}>
        <div>Conteo actual: <strong>{queueState.currentCount}</strong></div>
        <div>Capacidad máxima: <strong>{queueState.maxCapacity}</strong></div>
        <div>En capacidad: <strong>{queueState.isAtCapacity ? 'Sí' : 'No'}</strong></div>
        <div>Espacios disponibles: <strong>{queueState.availableSpots}</strong></div>
      </div>

      <div style={{marginTop:12}}>
        <div style={{fontSize:13,fontWeight:600}}>Pacientes próximos</div>
        <div style={{marginTop:8,display:'grid',gap:8}}>
          {queueState.patientsInQueue.slice(0,6).map(p => (
            <div key={p.patientId} style={{padding:8,background:'#fff',border:'1px solid #eef2ff',borderRadius:6}}>
              <div style={{fontWeight:600}}>{p.patientName}</div>
              <div style={{fontSize:12,color:'#6b7280'}}>{p.priority} · {p.waitTimeMinutes} min</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
