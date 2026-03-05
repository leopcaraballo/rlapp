"use client";

import { useState } from "react";

import FormLoadingOverlay from "@/components/FormLoadingOverlay";
import { useAppointmentRegistration } from "@/hooks/useAppointmentRegistration";
import { sanitizeText } from "@/security/sanitize";

import styles from "./AppointmentRegistrationForm.module.css";

/**
 * 🛡️ HUMAN CHECK:
 * UI component for appointment registration.
 */
export default function AppointmentRegistrationForm() {
  const [fullName, setFullName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const { register, loading, success, error } = useAppointmentRegistration();
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const safeFullName = sanitizeText(fullName);
    const safeIdCard = sanitizeText(idCard);

    if (!safeFullName.trim()) {
      setValidationError("El nombre completo es obligatorio.");
      return;
    }

    // Validar que idCard tenga entre 6 y 12 dígitos numéricos
    if (!/^\d{6,12}$/.test(safeIdCard)) {
      setValidationError(
        "El número de identificación debe tener entre 6 y 12 dígitos.",
      );
      return;
    }

    const validIdCard = parseInt(safeIdCard, 10);
    await register({ fullName: safeFullName, idCard: validIdCard, priority });
  };

  return (
    <>
      <FormLoadingOverlay
        isLoading={loading}
        message="Registrando tu turno..."
      />
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Registrar Turno</h2>

        <input
          type="text"
          placeholder="Nombre Completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={styles.input}
          disabled={loading}
        />

        <input
          type="text"
          placeholder="Número de Identificación (6-12 dígitos)"
          value={idCard}
          onChange={(e) => {
            // Solo permitir dígitos
            const val = e.target.value.replace(/\D/g, "");
            if (val.length <= 12) setIdCard(val);
          }}
          className={styles.input}
          maxLength={12}
          inputMode="numeric"
          disabled={loading}
        />

        <select
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as "high" | "medium" | "low")
          }
          className={styles.input}
          disabled={loading}
        >
          <option value="low">Prioridad Baja</option>
          <option value="medium">Prioridad Media</option>
          <option value="high">Prioridad Alta</option>
        </select>

        <button disabled={loading} className={styles.button}>
          {loading ? "Enviando..." : "Registrar Ahora"}
        </button>

        {success && <p className={styles.success}>{success}</p>}
        {validationError && <p className={styles.error}>{validationError}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </>
  );
}
