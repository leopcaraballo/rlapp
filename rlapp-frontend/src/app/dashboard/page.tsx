"use client";

import RealtimeAppointments from "@/components/RealtimeAppointments";

/**
 * Dashboard for completed appointments history.
 */
export default function CompletedHistoryDashboard() {
  return <RealtimeAppointments layout="container" showCompleted={true} title="Panel de Turnos en Tiempo Real" demoQueueId="demo-queue" />;
}
