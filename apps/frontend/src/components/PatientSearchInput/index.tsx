"use client";
import React from "react";

import type { PatientInQueueDto } from "@/services/api/types";

import styles from "./PatientSearchInput.module.css";

/** Filtra la lista de pacientes por número de turno, ID o nombre. */
export function filterPatients(
  patients: PatientInQueueDto[],
  query: string,
): PatientInQueueDto[] {
  if (!query.trim()) return patients;
  const q = query.trim().toLowerCase().replace(/^#/, "");
  return patients.filter(
    (p) =>
      p.turnNumber.toString() === q ||
      p.patientId.toLowerCase().includes(q) ||
      p.patientName.toLowerCase().includes(q),
  );
}

interface PatientSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
}

export function PatientSearchInput({
  value,
  onChange,
  placeholder = "Buscar por turno #, documento o nombre…",
  resultCount,
  totalCount,
}: PatientSearchInputProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <span className={styles.icon} aria-hidden="true">🔍</span>
        <input
          type="search"
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar paciente"
        />
        {value && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => onChange("")}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
      {value.trim() && resultCount !== undefined && totalCount !== undefined && (
        <span className={styles.resultHint}>
          {resultCount} de {totalCount} paciente{totalCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
