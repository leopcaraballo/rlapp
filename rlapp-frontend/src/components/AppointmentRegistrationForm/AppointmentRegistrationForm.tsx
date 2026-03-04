"use client";

import { useState } from "react";

import FormLoadingOverlay from "@/components/FormLoadingOverlay";
import { useAppointmentRegistration } from "@/hooks/useAppointmentRegistration";
import { sanitizeText } from "@/security/sanitize";

import styles from "./AppointmentRegistrationForm.module.css";

/** Acepta entre 6 y 12 dígitos numéricos (cédula/documento colombiano). */
const ID_CARD_PATTERN = /^\d{6,12}$/;

type Priority = "Urgent" | "High" | "Medium" | "Low";

// HUMAN CHECK: Si el dominio incorpora nuevas prioridades, actualizar Priority y las opciones del select.
export default function AppointmentRegistrationForm() {
  const [fullName, setFullName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");

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

    // validar que idCard tenga entre 6 y 12 dígitos numéricos
    if (!ID_CARD_PATTERN.test(safeIdCard)) {
      setValidationError(
        "El número de identificación debe tener entre 6 y 12 dígitos.",
      );
      return;
    }

    const validIdCard = parseInt(safeIdCard, 10);
    await register({ fullName: safeFullName, idCard: validIdCard, priority });
  };

  return (
    <div className={styles.page}>
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
            setPriority(e.target.value as Priority)
          }
          className={styles.input}
          disabled={loading}
        >
          <option value="Low">Prioridad Baja</option>
          <option value="Medium">Prioridad Media</option>
          <option value="High">Prioridad Alta</option>
          <option value="Urgent">Prioridad Urgente</option>
        </select>

        <button disabled={loading} className={styles.button}>
          {loading ? "Enviando..." : "Registrar Ahora"}
        </button>

        {success && <p className={styles.success}>{success}</p>}
        {validationError && <p className={styles.error}>{validationError}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
