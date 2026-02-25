"use client";
import React from "react";

import styles from "@/styles/page.module.css";

import type { WaitingRoomMonitorView } from "../../services/api/types";

type Props = { monitor: WaitingRoomMonitorView | null };

export default function MonitorCard({ monitor }: Props) {
  if (!monitor) {
    return (
      <div className={styles.infoCard}>
        <span className={styles.cardHeading}>Monitor</span>
        <span className={styles.emptyText}>No hay datos disponibles.</span>
      </div>
    );
  }

  return (
    <div className={styles.infoCard}>
      <span className={styles.cardHeading}>Monitor</span>
      <div className={styles.statGrid}>
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
    <div className={styles.statBox}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value ?? "-"}</span>
    </div>
  );
}
