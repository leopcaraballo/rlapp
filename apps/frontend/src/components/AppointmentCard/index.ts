/**
 * AppointmentCard Component Exports
 *
 * Specialized components for each appointment status.
 *
 * ⚕️ HUMAN CHECK - ISP (Interface Segregation Principle):
 * Instead of one fat generic AppointmentCard with conditional props,
 * we now have 3 specialized components with MINIMAL, type-safe props.
 *
 * Usage:
 * import { WaitingAppointmentCard, CalledAppointmentCard, CompletedAppointmentCard } from '@/components/AppointmentCard';
 *
 * // Now props are type-safe per status:
 * <CalledAppointmentCard appointment={apt} showTime={true} />  // ✅ Valid
 * <WaitingAppointmentCard appointment={apt} showTime={true} /> // ❌ TypeScript error: showTime not applicable
 */

export { CalledAppointmentCard } from "./CalledAppointmentCard";
export { CompletedAppointmentCard } from "./CompletedAppointmentCard";
export { WaitingAppointmentCard } from "./WaitingAppointmentCard";

// Re-export types for use in containers
export type { CalledAppointmentCardProps } from "./CalledAppointmentCard";
export type { CompletedAppointmentCardProps } from "./CompletedAppointmentCard";
export type { WaitingAppointmentCardProps } from "./WaitingAppointmentCard";
