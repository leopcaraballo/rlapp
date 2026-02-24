/**
 * ONE-SHOT EXAMPLE: Next.js Page with CSS Modules & WebSocket
 *
 * This demonstrates the expected patterns for frontend pages.
 * Sub-agents should follow this structure.
 */

"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import styles from "./page.module.css";

// ⚕️ HUMAN CHECK - Type alignment
// This type must match AppointmentEventPayload from the backend
interface Appointment {
  _id: string;
  idCard: number;
  fullName: string;
  status: "waiting" | "in_progress" | "completed";
  officeNumber?: string;
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // ⚕️ HUMAN CHECK - WebSocket URL
    // Uses NEXT_PUBLIC_WS_URL which resolves to localhost in dev
    // but should point to the production backend URL in deployment
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";
    const newSocket = io(wsUrl);

    newSocket.on("appointment_updated", (data: Appointment) => {
      setAppointments((prev) =>
        prev.map((a) => (a._id === data._id ? data : a)),
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Medical Appointments Dashboard</h1>
      <div className={styles.grid}>
        {appointments.map((apt) => (
          <div key={apt._id} className={styles.card}>
            <p className={styles.name}>{apt.fullName}</p>
            <p className={styles.status}>{apt.status}</p>
            {apt.officeNumber && (
              <p className={styles.office}>Office {apt.officeNumber}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
