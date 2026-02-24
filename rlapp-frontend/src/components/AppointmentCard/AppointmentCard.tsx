/**
 * ⚠️ DEPRECATED: Use specialized components instead
 *
 * This generic component violates ISP (Interface Segregation Principle).
 * It accepts props for all statuses mixed together, making it hard to use correctly.
 *
 * ✅ USE INSTEAD:
 * - import { WaitingAppointmentCard } from '@/components/AppointmentCard'
 * - import { CalledAppointmentCard } from '@/components/AppointmentCard'
 * - import { CompletedAppointmentCard } from '@/components/AppointmentCard'
 *
 * REASON: Each status (waiting, called, completed) has different visual needs
 * and different props. Specialized components make props type-safe and self-documenting.
 */

import { Appointment } from "@/domain/Appointment";
import styles from "@/styles/page.module.css";

interface AppointmentCardProps {
  appointment: Appointment;
  status: "waiting" | "called" | "completed";
  showTime?: boolean;
  timeIcon?: string;
  consultorioLabel?: string;
}

const getPriorityBadge = (priority: string): string => {
  switch (priority) {
    case "high":
      return "🔴 Alta";
    case "medium":
      return "🟡 Media";
    case "low":
    default:
      return "🟢 Baja";
  }
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export default function AppointmentCard({
  appointment,
  status,
  showTime = false,
  timeIcon = "⏰",
  consultorioLabel = appointment.office
    ? String(appointment.office)
    : "Pendiente",
}: AppointmentCardProps) {
  return (
    <li className={`${styles.appointmentCard} ${styles[status]}`}>
      <div className={styles.cardHeader}>
        <span className={styles.nombre}>{appointment.fullName}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Consultorio:</span>
          <span className={styles.officeBadge}>{consultorioLabel}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Prioridad:</span>
          <span
            className={styles.statusBadge}
            data-status={appointment.priority}
          >
            {getPriorityBadge(appointment.priority)}
          </span>
        </div>
      </div>
      {showTime && (
        <div className={styles.cardFooter}>
          <span className={styles.horaLabel}>{timeIcon}</span>
          <span className={styles.hora}>
            {formatTime(appointment.completedAt || appointment.timestamp)}
          </span>
        </div>
      )}
    </li>
  );
}
