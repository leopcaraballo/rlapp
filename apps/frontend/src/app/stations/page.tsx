"use client";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { useAlert } from "@/context/AlertContext";
import { useConsultingRooms } from "@/hooks/useConsultingRooms";
import { getConsultingRoomsState } from "@/services/api/atencion";
import sharedStyles from "@/styles/page.module.css";

import styles from "./page.module.css";

const DEFAULT_STATIONS = ["CONS-01", "CONS-02", "CONS-03", "CONS-04"];

interface RoomStatus {
  stationId: string;
  active: boolean;
}

export default function StationsPage() {
  const search = useSearchParams();
  const serviceId = search?.get("queue") ?? (process.env.NEXT_PUBLIC_DEFAULT_QUEUE_ID || "QUEUE-01");
  const alert = useAlert();
  const { busy, error, activate, deactivate, clearError } = useConsultingRooms();

  const [rooms, setRooms] = useState<RoomStatus[]>(
    DEFAULT_STATIONS.map((id) => ({ stationId: id, active: false })),
  );

  // HU-R5: Fetch initial consulting room state from backend on mount.
  useEffect(() => {
    let cancelled = false;
    getConsultingRoomsState(serviceId)
      .then(({ activeRooms, allRooms }) => {
        if (cancelled) return;
        const knownRooms = allRooms.length > 0 ? allRooms : DEFAULT_STATIONS;
        setRooms(
          knownRooms.map((id) => ({ stationId: id, active: activeRooms.includes(id) })),
        );
      })
      .catch(() => {
        // Backend may not be reachable in dev; fall back to default (all inactive)
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  useEffect(() => {
    if (error) {
      alert.showError(error);
      clearError();
    }
  }, [error, alert, clearError]);

  async function toggle(room: RoomStatus) {
    const ok = room.active
      ? await deactivate(serviceId, room.stationId)
      : await activate(serviceId, room.stationId);

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
    <main className={`${sharedStyles.dashboardContainer} ${sharedStyles.contentConstrained}`}>
      <header className={sharedStyles.stickyHeader}>
        <h1 className={sharedStyles.title}>Gestión de Consultorios</h1>
        <p className={sharedStyles.subtitle}>
          Cola: <strong>{serviceId}</strong>
        </p>
      </header>

      <section className={sharedStyles.sectionBlock}>
        <div className={styles.grid}>
          {rooms.map((room) => (
            <div
              key={room.stationId}
              className={room.active ? styles.cardActive : styles.cardInactive}
            >
              <div className={room.active ? styles.roomIconActive : styles.roomIconInactive}>
                {room.active ? "🩺" : "🚪"}
              </div>

              <h3 className={styles.roomId}>{room.stationId}</h3>
              <span className={styles.roomLabel}>Consultorio médico</span>

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

