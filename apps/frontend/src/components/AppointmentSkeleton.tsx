"use client";

import styles from "./AppointmentSkeleton.module.css";

/**
 * AppointmentSkeleton - Placeholder component while loading appointments
 *
 * Displays a skeleton loader for appointment cards to improve perceived performance.
 * Shows multiple skeleton items in a grid layout that mimics the actual appointment cards.
 *
 * @param count - Number of skeleton items to display (default: 5)
 *
 * @example
 * ```tsx
 * <AppointmentSkeleton count={3} />
 * ```
 */
interface AppointmentSkeletonProps {
  count?: number;
}

export default function AppointmentSkeleton({
  count = 5,
}: AppointmentSkeletonProps) {
  return (
    <ul className={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className={styles.skeletonCard}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonLine} style={{ width: "60%" }} />
            <div className={styles.skeletonBadge} />
          </div>

          <div className={styles.skeletonContent}>
            <div className={styles.skeletonLine} style={{ width: "70%" }} />
            <div className={styles.skeletonLine} style={{ width: "50%" }} />
          </div>

          <div className={styles.skeletonFooter}>
            <div className={styles.skeletonLine} style={{ width: "40%" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
