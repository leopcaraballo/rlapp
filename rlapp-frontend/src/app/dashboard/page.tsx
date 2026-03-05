"use client";

import RealtimeAppointments from "@/components/RealtimeAppointments";

const DEFAULT_QUEUE_ID = process.env.NEXT_PUBLIC_DEFAULT_QUEUE_ID || "QUEUE-01";

/**
 * Dashboard for completed appointments history.
 */
export default function CompletedHistoryDashboard() {
  return <RealtimeAppointments layout="container" showCompleted={true} title="Panel de Turnos en Tiempo Real" demoQueueId={DEFAULT_QUEUE_ID} fullWidth={false} />;
}
