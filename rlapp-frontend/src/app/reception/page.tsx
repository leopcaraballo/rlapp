"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import { useWaitingRoom } from "@/hooks/useWaitingRoom";

import {
  CONSULTATION_TYPE_LABELS,
  type ConsultationType,
} from "@/domain/patient/ConsultationType";
import { registerReception } from "../../services/api/waitingRoom";
import styles from "./page.module.css";

const VALID_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
type BackendPriority = (typeof VALID_PRIORITIES)[number];

const PRIORITY_LABELS: Record<BackendPriority, string> = {
  Low: "Baja",
  Medium: "Normal",
  High: "Alta",
  Urgent: "Urgente",
};

const CONSULTATION_TYPES = Object.keys(CONSULTATION_TYPE_LABELS) as ConsultationType[];

const CheckInSchema = z.object({
  patientName: z.string().min(2, "El nombre es obligatorio (mínimo 2 caracteres)"),
  queueId: z.string().min(1, "La cola es obligatoria"),
  priority: z.enum(VALID_PRIORITIES),
  consultationType: z.enum(["General", "Specialist", "Emergency"] as const),
  age: z.number().int().min(0).max(120).optional().nullable(),
  isPregnant: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type CheckInForm = z.infer<typeof CheckInSchema>;

export default function ReceptionPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckInForm>({
    resolver: zodResolver(CheckInSchema),
    defaultValues: { patientName: "", queueId: env.DEFAULT_QUEUE_ID, priority: "Medium", consultationType: "General", age: null, isPregnant: null, notes: null },
  });

  useEffect(() => {
    const q = search?.get("queue");
    if (q) setValue("queueId", q);
  }, [search, setValue]);

  const watchedQueueId = watch("queueId");
  const { queueState } = useWaitingRoom(watchedQueueId || env.DEFAULT_QUEUE_ID);

  async function onSubmit(data: CheckInForm) {
    setSubmitting(true);
    // use global alert
    try {
      await registerReception({
        queueId: data.queueId,
        patientId: `p-${Date.now()}`,
        patientName: data.patientName,
        priority: data.priority,
        consultationType: data.consultationType,
        age: data.age ?? null,
        isPregnant: data.isPregnant ?? null,
        notes: data.notes ?? null,
        actor: "reception",
      });
      router.push('/dashboard');
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
      {/* Panel izquierdo: Formulario de check-in */}
      <section className={styles.formPanel}>
        <h2 className={styles.panelTitle}>Recepción — Check-in</h2>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="patientName">Nombre del paciente</label>
            <input
              id="patientName"
              className={styles.input}
              aria-invalid={!!errors.patientName}
              placeholder="Ej. María García"
              {...register("patientName")}
            />
            {errors.patientName && <div className={styles.fieldError} role="alert">{errors.patientName.message}</div>}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="queueId">Cola</label>
              <input id="queueId" className={styles.input} placeholder="ej. QUEUE-01" {...register("queueId")} />
              {errors.queueId && <div className={styles.fieldError} role="alert">{errors.queueId.message}</div>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="priority">Prioridad</label>
              <select id="priority" className={styles.input} {...register("priority")}>
                {VALID_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="consultationType">Tipo de consulta</label>
              <select id="consultationType" className={styles.input} {...register("consultationType")}>
                {CONSULTATION_TYPES.map((ct) => <option key={ct} value={ct}>{CONSULTATION_TYPE_LABELS[ct]}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="age">Edad (opcional)</label>
              <input id="age" type="number" min={0} max={120} className={styles.input} placeholder="Ej. 35" {...register("age", { valueAsNumber: true })} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" {...register("isPregnant")} />
              Paciente embarazada
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="notes">Notas (opcional)</label>
            <input id="notes" className={styles.input} placeholder="Observaciones adicionales" {...register("notes")} />
          </div>

          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? "Enviando..." : "Registrar check-in"}
          </button>
        </form>
      </section>

      {/* Panel derecho: Estado de la cola */}
      <section className={styles.statusPanel}>
        <h2 className={styles.panelTitle}>Estado de la cola</h2>
        <p className={styles.queueLabel}>Cola: <strong>{watchedQueueId}</strong></p>

        {queueState && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{queueState.currentCount}</span>
              <span className={styles.statLabel}>En espera</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{queueState.maxCapacity}</span>
              <span className={styles.statLabel}>Capacidad</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{queueState.availableSpots}</span>
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
                <span className={styles.waitTime}>{p.waitTimeMinutes} min</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
