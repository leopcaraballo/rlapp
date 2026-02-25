"use client";
import React from "react";

import styles from "@/styles/page.module.css";

import type { NextTurnView } from "../../services/api/types";

type Props = { nextTurn: NextTurnView | null };

export default function NextTurnCard({ nextTurn }: Props) {
  if (!nextTurn) {
    return (
      <div className={styles.infoCard}>
        <span className={styles.cardHeading}>Siguiente Turno</span>
        <span className={styles.emptyText}>No hay paciente en curso.</span>
      </div>
    );
  }

  return (
    <div className={styles.infoCard}>
      <span className={styles.cardHeading}>Siguiente Turno</span>
      <div className={styles.infoList}>
        <div className={styles.nextPatientName}>{nextTurn.patientName}</div>
        <div className={styles.patientMeta}>{nextTurn.priority} · {nextTurn.consultationType}</div>
        <div className={styles.infoLine}>Estado: <strong>{nextTurn.status}</strong></div>
        {nextTurn.stationId && (
          <div className={styles.infoLine}>Estación: <strong>{nextTurn.stationId}</strong></div>
        )}
      </div>
    </div>
  );
}
