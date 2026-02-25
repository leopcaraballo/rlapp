"use client";
import React from "react";

import styles from "@/styles/page.module.css";

import type { QueueStateView } from "../../services/api/types";

type Props = { queueState: QueueStateView | null };

export default function QueueStateCard({ queueState }: Props) {
  if (!queueState) {
    return (
      <div className={styles.infoCard}>
        <span className={styles.cardHeading}>Estado de Cola</span>
        <span className={styles.emptyText}>No hay datos.</span>
      </div>
    );
  }

  return (
    <div className={styles.infoCard}>
      <span className={styles.cardHeading}>Estado de Cola</span>
      <div className={styles.infoList}>
        <div className={styles.infoLine}>Conteo actual: <strong>{queueState.currentCount}</strong></div>
        <div className={styles.infoLine}>Capacidad máxima: <strong>{queueState.maxCapacity}</strong></div>
        <div className={styles.infoLine}>En capacidad: <strong>{queueState.isAtCapacity ? 'Sí' : 'No'}</strong></div>
        <div className={styles.infoLine}>Espacios disponibles: <strong>{queueState.availableSpots}</strong></div>
      </div>

      <div>
        <div className={styles.subHeading}>Pacientes próximos</div>
        <div className={styles.patientList}>
          {queueState.patientsInQueue.slice(0, 6).map(p => (
            <div key={p.patientId} className={styles.patientItem}>
              <div className={styles.patientName}>{p.patientName}</div>
              <div className={styles.patientMeta}>{p.priority} · {p.waitTimeMinutes} min</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
