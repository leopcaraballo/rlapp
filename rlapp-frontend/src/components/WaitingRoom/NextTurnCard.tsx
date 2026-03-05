"use client";
import React from "react";
import type { NextTurnView } from "../../services/api/types";

type Props = { nextTurn: NextTurnView | null };

export default function NextTurnCard({ nextTurn }: Props) {
  if (!nextTurn) {
    return (
      <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
        <strong>Siguiente Turno</strong>
        <div style={{marginTop:8,color:'#6b7280'}}>No hay paciente en curso.</div>
      </div>
    );
  }

  return (
    <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
      <strong>Siguiente Turno</strong>
      <div style={{marginTop:8}}>
        <div style={{fontSize:18,fontWeight:700}}>{nextTurn.patientName}</div>
        <div style={{color:'#6b7280',marginTop:6}}>{nextTurn.priority} · {nextTurn.consultationType}</div>
        <div style={{marginTop:10}}>Estado: <strong>{nextTurn.status}</strong></div>
        {nextTurn.stationId && <div>Estación: <strong>{nextTurn.stationId}</strong></div>}
      </div>
    </div>
  );
}
