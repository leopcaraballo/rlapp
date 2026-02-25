"use client";
import React from "react";

import type { RecentAttentionRecordView } from "../../services/api/types";

type Props = { history: RecentAttentionRecordView[] };

export default function RecentHistory({ history }: Props) {
  if (!history || history.length === 0) {
    return (
      <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
        <strong>Historial reciente</strong>
        <div style={{marginTop:8,color:'#6b7280'}}>No hay atenciones recientes.</div>
      </div>
    );
  }

  return (
    <div style={{padding:12,border:'1px solid #e5e7eb',borderRadius:8}}>
      <strong>Historial reciente</strong>
      <ol style={{marginTop:8,paddingLeft:18}}>
        {history.slice(0,8).map(h => (
          <li key={`${h.queueId}-${h.patientId}`} style={{marginBottom:8}}>
            <div style={{fontWeight:600}}>{h.patientName}</div>
            <div style={{fontSize:12,color:'#6b7280'}}>{new Date(h.attendedAt).toLocaleString()}</div>
            {h.outcome && <div style={{fontSize:13,marginTop:4}}>Resultado: {h.outcome}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
