import { Appointment } from "@/domain/Appointment";
import styles from "@/styles/page.module.css";

/**
 * Component: CalledAppointmentCard
 *
 * Specialized component for appointments currently being served (assigned to consultorio).
 * Props are specific to this state: office tracking and optional time display.
 *
 * ⚕️ HUMAN CHECK - ISP: Props are ONLY what's relevant for "called" status
 * Not available: appointmentId-based filtering (belongs to container)
 */
export interface CalledAppointmentCardProps {
  appointment: Appointment;
  timeIcon?: string; // Optional icon override (default: "🔔")
  showTime?: boolean; // Show time badge in footer (default: true)
}

function getPriorityBadge(priority: string): string {
  switch (priority.trim().toLowerCase()) {
    case "high":
      return "🔴 Alta";
    case "medium":
      return "🟡 Media";
    case "low":
    default:
      return "🟢 Baja";
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function CalledAppointmentCard({
  appointment,
  timeIcon = "🔔",
  showTime = true,
}: CalledAppointmentCardProps) {
  const normalizedPriority = appointment.priority.trim().toLowerCase();

  return (
    <li className={`${styles.appointmentCard} ${styles.called}`}>
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
          <span className={styles.label}>Prioridad:</span>
          <span className={styles.statusBadge} data-status={normalizedPriority}>
            {getPriorityBadge(appointment.priority)}
          </span>
        </div>
      </div>
      {showTime && (
        <div className={styles.cardFooter}>
          <span className={styles.horaLabel}>{timeIcon}</span>
          <span className={styles.hora}>
            {formatTime(appointment.timestamp)}
          </span>
        </div>
      )}
    </li>
  );
}
