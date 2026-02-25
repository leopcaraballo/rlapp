import { Appointment } from "@/domain/Appointment";
import styles from "@/styles/page.module.css";

/**
 * Component: CompletedAppointmentCard
 *
 * Specialized component for completed appointments.
 * Displays duration rather than real-time tracking.
 *
 * ⚕️ HUMAN CHECK - ISP: Props are minimal for read-only status display
 * No showTime prop needed (completedAt is ALWAYS shown for completed status)
 */
export interface CompletedAppointmentCardProps {
  appointment: Appointment;
  timeIcon?: string; // Optional icon override (default: "⏰")
}

function getPriorityBadge(priority: string): string {
  switch (priority) {
    case "high":
      return "🔴 Alta";
    case "medium":
      return "🟡 Media";
    case "low":
    default:
      return "🟢 Baja";
  }
}

function calculateDuration(start: number, end?: number | null): string {
  if (end == null) return "N/A";
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function CompletedAppointmentCard({
  appointment,
  timeIcon = "⏰",
}: CompletedAppointmentCardProps) {
  return (
    <li className={`${styles.appointmentCard} ${styles.completed}`}>
      <div className={styles.cardHeader}>
        <span className={styles.nombre}>{appointment.fullName}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Consultorio:</span>
          <span className={styles.officeBadge}>
            {appointment.office || "N/A"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Duración:</span>
          <span className={styles.hora}>
            {calculateDuration(appointment.timestamp, appointment.completedAt)}
          </span>
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
      <div className={styles.cardFooter}>
        <span className={styles.horaLabel}>{timeIcon}</span>
        <span className={styles.hora}>Finalizado</span>
      </div>
    </li>
  );
}
