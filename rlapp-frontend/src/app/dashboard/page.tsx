"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CalledAppointmentCard,
  CompletedAppointmentCard,
  WaitingAppointmentCard,
} from "@/components/AppointmentCard";
import AppointmentSkeleton from "@/components/AppointmentSkeleton";
import WebSocketStatus from "@/components/WebSocketStatus";
import { Appointment } from "@/domain/Appointment";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";
import WaitingRoomDemo from "@/components/WaitingRoomDemo";

/**
 * Dashboard for completed appointments history.
 */
export default function CompletedHistoryDashboard() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleUpdate = useCallback((appointment: Appointment) => {
    if (appointment.status === "completed") {
      if (audioService.isEnabled()) {
        audioService.play();
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { appointments, error, _connected, isConnecting, connectionStatus } =
    useAppointmentsWebSocket(handleUpdate);

  useEffect(() => {
    audioService.init("/sounds/ding.mp3", 0.6);

    const unlock = async () => {
      await audioService.unlock();
      setAudioEnabled(audioService.isEnabled());
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const waitingAppointments = appointments
    .filter((t) => t.status === "waiting")
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const calledAppointments = appointments
    .filter((t) => t.status === "called")
    .sort((a, b) => a.timestamp - b.timestamp);

  const completedAppointments = appointments
    .filter((t) => t.status === "completed")
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <main className={styles.dashboardContainer}>
      <header className={styles.stickyHeader}>
        <h1 className={styles.title}>Panel de Turnos en Tiempo Real</h1>
        <WebSocketStatus status={connectionStatus} variant="block" />
        {!audioEnabled && (
          <p className={styles.audioHint}>
            Toca la pantalla para activar sonido 🔔
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </header>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>
          🏥 En consultorio{" "}
          <span className={styles.countBadge}>{calledAppointments.length}</span>
        </h2>
        {calledAppointments.length > 0 ? (
          <ul className={styles.cardGrid}>
            {calledAppointments.map((t) => (
              <CalledAppointmentCard
                key={t.id}
                appointment={t}
                showTime={true}
                timeIcon="🔔"
              />
            ))}
          </ul>
        ) : isConnecting ? (
          <AppointmentSkeleton count={2} />
        ) : (
          <p className={styles.empty}>No hay turnos siendo atendidos</p>
        )}
      </section>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>
          ⏳ En espera{" "}
          <span className={styles.countBadge}>
            {waitingAppointments.length}
          </span>
        </h2>
        {waitingAppointments.length > 0 ? (
          <ul className={styles.cardGrid}>
            {waitingAppointments.map((t) => (
              <WaitingAppointmentCard
                key={t.id}
                appointment={t}
                timeIcon="📝"
              />
            ))}
          </ul>
        ) : isConnecting ? (
          <AppointmentSkeleton count={3} />
        ) : (
          <p className={styles.empty}>No hay turnos en espera</p>
        )}
      </section>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>
          ✅ Completados{" "}
          <span className={styles.countBadge}>
            {completedAppointments.length}
          </span>
        </h2>
        {completedAppointments.length > 0 ? (
          <ul className={styles.cardGrid}>
            {completedAppointments.map((t) => (
              <CompletedAppointmentCard
                key={t.id}
                appointment={t}
                timeIcon="⏰"
              />
            ))}
          </ul>
        ) : isConnecting ? (
          <AppointmentSkeleton count={2} />
        ) : (
          <p className={styles.empty}>No hay turnos completados aún</p>
        )}
      </section>

      {showToast && <div className={styles.toast}>✅ Turno completado</div>}
      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>Demo API — WaitingRoom</h2>
        <WaitingRoomDemo queueId="demo-queue" />
      </section>
    </main>
  );
}
