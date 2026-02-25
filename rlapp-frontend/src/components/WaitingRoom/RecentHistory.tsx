"use client";
import React from "react";

import styles from "@/styles/page.module.css";

import type { RecentAttentionRecordView } from "../../services/api/types";

type Props = { history: RecentAttentionRecordView[] };

export default function RecentHistory({ history }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className={styles.infoCard}>
        <span className={styles.cardHeading}>Historial reciente</span>
        <span className={styles.emptyText}>No hay atenciones recientes.</span>
      </div>
    );
  }

  return (
    <div className={styles.infoCard}>
      <span className={styles.cardHeading}>Historial reciente</span>
      <ol className={styles.historyList}>
        {history.slice(0, 8).map(h => (
          <li key={`${h.queueId}-${h.patientId}`} className={styles.historyItem}>
            <div className={styles.historyName}>{h.patientName}</div>
            <div className={styles.historyDate}>{new Date(h.attendedAt).toLocaleString()}</div>
            {h.outcome && <div className={styles.historyOutcome}>Resultado: {h.outcome}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
