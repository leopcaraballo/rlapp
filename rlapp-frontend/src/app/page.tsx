"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import RealtimeAppointments from "@/components/RealtimeAppointments";
import styles from "@/styles/page.module.css";

/**
 * Main Appointments Screen — Real-time via WebSocket
 */
export default function AppointmentsScreen() {
  return (
    <>
      <nav className={styles.topNav}>
        <Link className={styles.navLink} href="/reception">
          Recepción
        </Link>
        <Link className={styles.navLink} href="/cashier">
          Caja
        </Link>
        <Link className={styles.navLink} href="/medical">
          Médico
        </Link>
        <Link className={styles.navLink} href="/waiting-room/default-queue">
          Sala de espera
        </Link>
      </nav>
      <RealtimeAppointments layout="split" showCompleted={false} title="Turnos Disponibles" />
    </>
  );
}
