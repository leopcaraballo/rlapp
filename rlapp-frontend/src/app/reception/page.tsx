"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import {
  CONSULTATION_TYPE_LABELS,
  type ConsultationType,
} from "@/domain/patient/ConsultationType";
import { useWaitingRoom } from "@/hooks/useWaitingRoom";
import { registerReception } from "@/services/api/waitingRoom";

import styles from "./page.module.css";

const VALID_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
type BackendPriority = (typeof VALID_PRIORITIES)[number];

const PRIORITY_LABELS: Record<BackendPriority, string> = {
  Low: "Baja",
  Medium: "Normal",
  High: "Alta",
  Urgent: "Urgente",
};

const CONSULTATION_TYPES = Object.keys(
  CONSULTATION_TYPE_LABELS,
) as ConsultationType[];

const CheckInSchema = z.object({
  patientId: z
    .string()
    .min(3, "La cédula es obligatoria (mínimo 3 caracteres)")
    .max(20, "La cédula no puede superar 20 caracteres")
    .regex(
      /^[a-zA-Z0-9\-]+$/,
      "La cédula solo puede contener letras, números y guiones",
    ),
  patientName: z
    .string()
    .min(2, "El nombre es obligatorio (mínimo 2 caracteres)"),
  priority: z.enum(VALID_PRIORITIES),
  consultationType: z.enum(["General", "Specialist", "Emergency"] as const),
  age: z.number().int().min(0).max(120).optional().nullable(),
  isPregnant: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type CheckInForm = z.infer<typeof CheckInSchema>;

export default function ReceptionPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckInForm>({
    resolver: zodResolver(CheckInSchema),
    defaultValues: {
      patientId: "",
      patientName: "",
      priority: "Medium",
      consultationType: "General",
      age: null,
      isPregnant: null,
      notes: null,
    },
  });

  // La cola se auto-asigna siempre al valor por defecto configurado en el entorno
  const queueId = env.DEFAULT_QUEUE_ID;
  const { queueState } = useWaitingRoom(queueId);

  async function onSubmit(data: CheckInForm) {
    setSubmitting(true);
    // use global alert
    try {
      const result = await registerReception({
        queueId,
        patientId: data.patientId.trim().toUpperCase(),
        patientName: data.patientName,
        priority: data.priority,
        consultationType: data.consultationType,
        age: data.age ?? null,
        isPregnant: data.isPregnant ?? null,
        notes: data.notes ?? null,
        actor: "reception",
      });

      if (result.queueId) {
        router.push(`/waiting-room/${encodeURIComponent(result.queueId)}`);
      } else {
        router.push("/dashboard");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al registrar check-in");
    } finally {
      setSubmitting(false);
    }
  }

  const patients = queueState?.patientsInQueue ?? [];

  return (
    <main className={styles.splitLayout}>
      {/* Panel izquierdo: Estado de la cola */}
      <section className={styles.statusPanel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Estado de la cola</h2>
          <span className={styles.queueBadge}>{queueId}</span>
        </header>
        <div className={styles.panelBody}>
          {queueState && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {queueState.currentCount}
                </span>
                <span className={styles.statLabel}>En espera</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {queueState.maxCapacity}
                </span>
                <span className={styles.statLabel}>Capacidad</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {queueState.availableSpots}
                </span>
                <span className={styles.statLabel}>Disponibles</span>
              </div>
            </div>
          )}

          {patients.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🪑</span>
              <p>No hay pacientes en la cola.</p>
            </div>
          ) : (
            <ul className={styles.patientList}>
              {patients.map((p) => (
                <li key={p.patientId} className={styles.patientItem}>
                  <div className={styles.patientInfo}>
                    <span className={styles.patientName}>{p.patientName}</span>
                    <span className={styles.patientId}>{p.patientId}</span>
                  </div>
                  <span className={styles.waitTime}>
                    {p.waitTimeMinutes} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Panel derecho: Formulario de check-in */}
      <section className={styles.formPanel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Recepción — Check-in</h2>
        </header>
        <div className={styles.panelBody}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className={styles.form}
            noValidate
          >
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="patientId">
                Cédula del paciente
              </label>
              <input
                id="patientId"
                className={styles.input}
                aria-invalid={!!errors.patientId}
                placeholder="Ej. 1234567890"
                maxLength={20}
                autoComplete="off"
                {...register("patientId")}
              />
              {errors.patientId && (
                <div className={styles.fieldError} role="alert">
                  {errors.patientId.message}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="patientName">
                Nombre del paciente
              </label>
              <input
                id="patientName"
                className={styles.input}
                aria-invalid={!!errors.patientName}
                placeholder="Ej. María García"
                {...register("patientName")}
              />
              {errors.patientName && (
                <div className={styles.fieldError} role="alert">
                  {errors.patientName.message}
                </div>
              )}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="priority">
                  Prioridad
                </label>
                <select
                  id="priority"
                  className={styles.input}
                  {...register("priority")}
                >
                  {VALID_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="consultationType">
                  Tipo de consulta
                </label>
                <select
                  id="consultationType"
                  className={styles.input}
                  {...register("consultationType")}
                >
                  {CONSULTATION_TYPES.map((ct) => (
                    <option key={ct} value={ct}>
                      {CONSULTATION_TYPE_LABELS[ct]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="age">
                  Edad (opcional)
                </label>
                <input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  className={styles.input}
                  placeholder="Ej. 35"
                  {...register("age", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" {...register("isPregnant")} />
                Paciente embarazada
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="notes">
                Notas (opcional)
              </label>
              <input
                id="notes"
                className={styles.input}
                placeholder="Observaciones adicionales"
                {...register("notes")}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={styles.submitBtn}
            >
              {submitting ? "Enviando..." : "Registrar check-in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
