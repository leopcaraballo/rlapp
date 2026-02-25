"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import sharedStyles from "@/styles/page.module.css";

import { checkInPatient } from "../../services/api/waitingRoom";
import localStyles from "./page.module.css";

const VALID_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
type BackendPriority = (typeof VALID_PRIORITIES)[number];

const PRIORITY_LABELS: Record<BackendPriority, string> = {
  Low: "Baja",
  Medium: "Normal",
  High: "Alta",
  Urgent: "Urgente",
};

const CheckInSchema = z.object({
  patientName: z.string().min(2, "El nombre es obligatorio (mínimo 2 caracteres)"),
  queueId: z.string().min(1, "La cola es obligatoria"),
  priority: z.enum(VALID_PRIORITIES),
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
    formState: { errors },
  } = useForm<CheckInForm>({
    resolver: zodResolver(CheckInSchema),
    defaultValues: { patientName: "", queueId: env.DEFAULT_QUEUE_ID, priority: "Medium" },
  });

  useEffect(() => {
    const q = search?.get("queue");
    if (q) setValue("queueId", q);
  }, [search, setValue]);

  async function onSubmit(data: CheckInForm) {
    setSubmitting(true);
    // use global alert
    try {
      await checkInPatient({
        queueId: data.queueId,
        patientId: `p-${Date.now()}`,
        patientName: data.patientName,
        priority: data.priority,
        consultationType: "General",
        actor: "reception",
      });
      router.push(`/waiting-room/${data.queueId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al registrar check-in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`${localStyles.container} ${sharedStyles.dashboardContainer}`}>
      <div className={localStyles.card}>
        <h2 className={sharedStyles.title}>Recepción — Check-in</h2>
        <form onSubmit={handleSubmit(onSubmit)} className={localStyles.form} noValidate>

          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="patientName">
              Nombre del paciente
            </label>
            <input
              id="patientName"
              className={localStyles.input}
              aria-invalid={!!errors.patientName}
              aria-describedby={errors.patientName ? "patientName-error" : undefined}
              placeholder="Ej. María García"
              {...register("patientName")}
            />
          </div>
          {errors.patientName && (
            <div id="patientName-error" className={localStyles.fieldError} role="alert">
              {errors.patientName.message}
            </div>
          )}

          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="queueId">
              Cola
            </label>
            <input
              id="queueId"
              className={localStyles.input}
              placeholder="ej. QUEUE-01"
              {...register("queueId")}
            />
          </div>
          {errors.queueId && (
            <div className={localStyles.fieldError} role="alert">
              {errors.queueId.message}
            </div>
          )}

          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="priority">
              Prioridad
            </label>
            <select
              id="priority"
              className={localStyles.input}
              {...register("priority")}
            >
              {VALID_PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div className={localStyles.row}>
            <button
              type="submit"
              disabled={submitting}
              className={`${localStyles.btn} ${localStyles.btnPrimary}`}
            >
              {submitting ? "Enviando..." : "Registrar check-in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
