"use client";

import RealtimeAppointments from "@/components/RealtimeAppointments";

/**
 * Pantalla principal de turnos disponibles.
 * Muestra pacientes en espera, en consultorio y completados.
 * El navbar global NO se muestra en esta ruta (gestionado por Navbar.tsx).
 */
export default function AppointmentsScreen() {
  return (
    <RealtimeAppointments layout="container" showCompleted={false} title="Turnos Disponibles" />
  );
}
