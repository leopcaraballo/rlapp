"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import Alert from "@/components/Alert";
import { useAlert } from "@/context/AlertContext";
import { checkInPatient } from "../../services/api/waitingRoom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const CheckInSchema = z.object({
  patientName: z.string().min(2, "El nombre es obligatorio (mínimo 2 caracteres)"),
  queueId: z.string().min(1, "La cola es obligatoria"),
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
    defaultValues: { patientName: "", queueId: "default-queue" },
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
        priority: "Normal",
        consultationType: "General",
        actor: "reception",
      });
      router.push(`/waiting-room/${data.queueId}`);
    } catch (err) {
      const msg = (err as any)?.message ?? "Error al registrar check-in";
      alert.showError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.container}>
      <h2>Recepción — Check-in</h2>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        <label style={{ display: "block" }}>
          Nombre del paciente
          <input
            aria-invalid={!!errors.patientName}
            aria-describedby={errors.patientName ? "patientName-error" : undefined}
            {...register("patientName")}
            className={styles.input}
          />
        </label>
        {errors.patientName && (
          <div id="patientName-error" style={{ color: "#b00020" }} role="alert">
            {errors.patientName.message}
          </div>
        )}

        <label style={{ display: "block" }}>
          Cola
          <input {...register("queueId")} className={styles.input} aria-label="Cola" />
        </label>
        {errors.queueId && (
          <div style={{ color: "#b00020" }} role="alert">
            {errors.queueId.message}
          </div>
        )}

        {/* Global alerts shown by AlertProvider */}
        <div className={styles.row}>
          <button type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Registrar check-in"}
          </button>
        </div>
      </form>
    </main>
  );
}
