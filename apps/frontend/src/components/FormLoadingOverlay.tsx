"use client";

import styles from "./FormLoadingOverlay.module.css";

/**
 * FormLoadingOverlay - Semi-transparent overlay during form submission
 *
 * Displays a loading spinner and optional message while a form is being submitted.
 * Prevents user interaction during async operations by covering the entire form area.
 *
 * @param isLoading - Whether the form is currently loading
 * @param message - Optional loading message (default: "Cargando...")
 *
 * @example
 * ```tsx
 * <FormLoadingOverlay isLoading={isSubmitting} message="Registrando turno..." />
 * ```
 */
interface FormLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export default function FormLoadingOverlay({
  isLoading,
  message = "Cargando...",
}: FormLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className={styles.overlay} data-testid="form-loading-overlay">
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
