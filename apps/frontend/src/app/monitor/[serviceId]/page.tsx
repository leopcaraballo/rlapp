"use client";
import React, { useEffect, useState } from "react";
import { useAtencion } from "@/hooks/useAtencion";
import styles from "./page.module.css";
import { NextTurnView, PatientInQueueDto } from "@/services/api/types";

type Props = { params: Promise<{ serviceId: string }> };

export default function MonitorPage({ params }: Props) {
  const { serviceId } = React.use(params);
  const { fullState, connectionState, lastUpdated } = useAtencion(serviceId, 3000);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-CO", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <main className={styles.displayRoot}>
      {/* Header with Title and Clock */}
      <header className={styles.header}>
        <h1 className={styles.queueTitle}>Monitor de Atención</h1>
        <div className={styles.timeClock}>{formatTime(currentTime)}</div>
      </header>

      {/* 3-Column Grid */}
      <div className={styles.mainGrid}>
        
        {/* COLUMN 1: EN ESPERA */}
        <section className={`${styles.column} ${styles.waitingCol}`}>
          <header className={styles.columnHeader}>
            <h2 className={styles.columnTitle}>En Espera</h2>
            <span className={styles.columnCount}>{fullState?.waiting.length || 0}</span>
          </header>
          {fullState?.waiting && fullState.waiting.length > 0 ? (
            <ul className={styles.patientList}>
              {fullState.waiting.slice(0, 10).map((p) => (
                <PatientCard key={p.patientId} patient={p} />
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>No hay turnos en espera</div>
          )}
        </section>

        {/* COLUMN 2: EN CONSULTA */}
        <section className={`${styles.column} ${styles.consultingCol}`}>
          <header className={styles.columnHeader}>
            <h2 className={styles.columnTitle}>En Consulta</h2>
            <span className={styles.columnCount}>{fullState?.inConsultation.length || 0}</span>
          </header>
          {fullState?.inConsultation && fullState.inConsultation.length > 0 ? (
            <ul className={styles.patientList}>
              {fullState.inConsultation.map((p) => (
                <ActivePatientCard key={p.patientId} patient={p} />
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>No hay consultas activas</div>
          )}
        </section>

        {/* COLUMN 3: PENDIENTE DE PAGO */}
        <section className={`${styles.column} ${styles.paymentCol}`}>
          <header className={styles.columnHeader}>
            <h2 className={styles.columnTitle}>Pendiente de Pago</h2>
            <span className={styles.columnCount}>{fullState?.waitingPayment.length || 0}</span>
          </header>
          {fullState?.waitingPayment && fullState.waitingPayment.length > 0 ? (
            <ul className={styles.patientList}>
              {fullState.waitingPayment.map((p) => (
                <PaymentPatientCard key={p.patientId} patient={p} />
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>Sin pagos pendientes</div>
          )}
        </section>

      </div>

      {/* Footer with Status and Update Time */}
      <footer className={styles.footer}>
        <span>ID Servicio: {serviceId}</span>
        <span className={connectionState === "online" ? styles.statusOnline : styles.statusOffline}>
          ● {connectionState === "online" ? "En Línea" : "Conectando..."}
        </span>
        <span style={{ marginLeft: "2rem" }}>
          Actualización: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString("es-CO") : "..."}
        </span>
      </footer>
    </main>
  );
}

// Sub-components for better organization
function PatientCard({ patient }: { patient: PatientInQueueDto }) {
  const priorityClass = `priority_${patient.priority.toLowerCase()}`;
  return (
    <li className={styles.patientCard}>
      <div className={styles.patientInfo}>
        <span className={styles.turnNumber}>#{patient.turnNumber}</span>
      </div>
      <span className={`${styles.priorityBadge} ${styles[priorityClass]}`}>
        {patient.priority}
      </span>
    </li>
  );
}

function ActivePatientCard({ patient }: { patient: NextTurnView }) {
  const priorityClass = `priority_${patient.priority.toLowerCase()}`;
  return (
    <li className={styles.patientCard}>
      <div className={styles.patientInfo}>
        <span className={styles.turnNumber}>#{patient.turnNumber}</span>
        <span className={styles.patientName}>{patient.patientName}</span>
      </div>
      <div className={styles.stationBadge}>
        {patient.stationId || "LLAMANDO"}
      </div>
    </li>
  );
}

function PaymentPatientCard({ patient }: { patient: NextTurnView }) {
  return (
    <li className={styles.patientCard}>
      <div className={styles.patientInfo}>
        <span className={styles.turnNumber}>#{patient.turnNumber}</span>
        <span className={styles.patientName}>{patient.patientName}</span>
      </div>
      <span className={styles.priorityBadge}>Caja</span>
    </li>
  );
}
