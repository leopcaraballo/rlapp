"use client";

import RealtimeAppointments from "@/components/RealtimeAppointments";

/**
 * Pantalla principal de turnos disponibles.
 * El navbar global NO se muestra en esta ruta (gestionado por Navbar.tsx).
 */
export default function AppointmentsScreen() {
  return (
    <RealtimeAppointments layout="split" showCompleted={false} title="Turnos Disponibles" />
  );
}
