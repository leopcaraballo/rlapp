"use client";

import { useCallback, useEffect, useState } from "react";

import RealtimeAppointments from "@/components/RealtimeAppointments";
import styles from "@/styles/page.module.css";

/**
 * Dashboard for completed appointments history.
 */
export default function CompletedHistoryDashboard() {
  return <RealtimeAppointments layout="container" showCompleted={true} title="Panel de Turnos en Tiempo Real" demoQueueId="demo-queue" />;
}
