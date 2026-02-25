"use client";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { useAlert } from "@/context/AlertContext";
import { useConsultingRooms } from "@/hooks/useConsultingRooms";
import sharedStyles from "@/styles/page.module.css";

import styles from "./page.module.css";

const DEFAULT_STATIONS = ["CONS-01", "CONS-02", "CONS-03", "CONS-04"];

interface RoomStatus {
  stationId: string;
  active: boolean;
}

export default function ConsultingRoomsPage() {
  const search = useSearchParams();
  const queueId = search?.get("queue") ?? (process.env.NEXT_PUBLIC_DEFAULT_QUEUE_ID || "QUEUE-01");
  const alert = useAlert();
  const { busy, error, activate, deactivate, clearError } = useConsultingRooms();

  const [rooms, setRooms] = useState<RoomStatus[]>(
    DEFAULT_STATIONS.map((id) => ({ stationId: id, active: false })),
  );

  useEffect(() => {
    if (error) {
      alert.showError(error);
      clearError();
    }
  }, [error, alert, clearError]);

  async function toggle(room: RoomStatus) {
    const ok = room.active
      ? await deactivate(queueId, room.stationId)
      : await activate(queueId, room.stationId);

    if (ok) {
      setRooms((prev) =>
        prev.map((r) =>
          r.stationId === room.stationId ? { ...r, active: !r.active } : r,
        ),
      );
      if (room.active) {
        alert.showInfo(`Consultorio ${room.stationId} desactivado.`);
      } else {
        alert.showSuccess(`Consultorio ${room.stationId} activado correctamente.`);
      }
    }
  }

  return (
    <main className={sharedStyles.dashboardContainer}>
      <header className={sharedStyles.stickyHeader}>
        <h1 className={sharedStyles.title}>Gestión de Consultorios</h1>
        <p className={sharedStyles.subtitle}>
          Cola: <strong>{queueId}</strong>
        </p>
      </header>

      <section className={sharedStyles.sectionBlock}>
        <div className={styles.grid}>
          {rooms.map((room) => (
            <div
              key={room.stationId}
              className={room.active ? styles.cardActive : styles.cardInactive}
            >
              <h3 className={styles.roomId}>{room.stationId}</h3>

              <span
                className={
                  room.active ? styles.statusBadgeActive : styles.statusBadgeInactive
                }
              >
                <span className={room.active ? styles.dotActive : styles.dotInactive} />
                {room.active ? "Activo" : "Inactivo"}
              </span>

              <button
                className={room.active ? styles.btnDeactivate : styles.btnActivate}
                disabled={busy}
                onClick={() => void toggle(room)}
              >
                {room.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

