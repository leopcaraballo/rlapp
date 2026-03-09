"use client";
import React from "react";

import { useWaitingRoom } from "@/hooks/useWaitingRoom";

import styles from "./page.module.css";

type Props = { params: Promise<{ queueId: string }> };

export default function DisplayPage({ params }: Props) {
  const { queueId } = React.use(params);
  const { nextTurn, queueState, lastUpdated } = useWaitingRoom(queueId, 3000);

  return (
    <main className={styles.displayRoot}>
      {/* Cabecera con nombre de la sala */}
      <header className={styles.header}>
        <h1 className={styles.queueTitle}>Sala de Espera</h1>
        <span className={styles.queueId}>{queueId}</span>
      </header>

      {/* Turno llamado actualmente */}
      <section className={styles.currentCall}>
        {nextTurn ? (
          <>
            <div className={styles.callLabel}>Turno llamado</div>
            <div className={styles.callName}>{nextTurn.patientName}</div>
            {nextTurn.stationId && (
              <div className={styles.callStation}>
                Diríjase al consultorio{" "}
                <strong>{nextTurn.stationId}</strong>
              </div>
            )}
          </>
        ) : (
          <div className={styles.noCall}>Sin turno activo</div>
        )}
      </section>

      {/* Lista de próximos en espera */}
      <section className={styles.waitingList}>
        <h2 className={styles.waitingTitle}>En espera</h2>
        {queueState && queueState.patientsInQueue.length > 0 ? (
          <ol className={styles.patientList}>
            {queueState.patientsInQueue.slice(0, 8).map((p) => (
              <li key={p.patientId} className={styles.patientItem}>
                <span className={styles.patientName}>{p.patientName}</span>
                <span className={styles.patientPriority}>{p.priority}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptyList}>No hay pacientes en espera</p>
        )}
      </section>

      {/* Pie con actualización */}
      <footer className={styles.footer}>
        Última actualización:{" "}
        {lastUpdated
          ? new Date(lastUpdated).toLocaleTimeString("es-CO")
          : "—"}
      </footer>
    </main>
  );
}
