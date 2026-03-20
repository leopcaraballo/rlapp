"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import { registerReception } from "@/services/api/atencion";

import styles from "./page.module.css";

const RegisterSchema = z.object({
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
});

type RegisterForm = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      patientId: "",
      patientName: "",
    },
  });

  const serviceId = env.DEFAULT_QUEUE_ID;

  async function onSubmit(data: RegisterForm) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await registerReception({
        serviceId,
        patientId: data.patientId.trim().toUpperCase(),
        patientName: data.patientName.trim(),
        priority: "Medium",
        consultationType: "General", // Assigned later by receptionist
        actor: "patient",
      });

      alert.showSuccess(`¡Registro exitoso! Tu turno es el #${result.turnNumber}`);
      
      // Esperar un momento para que el usuario lea el mensaje antes de redirigir
      setTimeout(() => {
        router.push(`/monitor/${serviceId}`);
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al registrarse";
      alert.showError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.registerRoot}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1>Bienvenido</h1>
          <p>Complete sus datos para solicitar atención</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="patientId">Número de Identificación</label>
            <input
              id="patientId"
              type="text"
              placeholder="Ej. 12345678"
              {...register("patientId")}
              className={errors.patientId ? styles.inputError : styles.input}
              autoComplete="off"
            />
            {errors.patientId && <span className={styles.errorText}>{errors.patientId.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="patientName">Nombre y Apellidos</label>
            <input
              id="patientName"
              type="text"
              placeholder="Ej. María García"
              {...register("patientName")}
              className={errors.patientName ? styles.inputError : styles.input}
              autoComplete="off"
            />
            {errors.patientName && <span className={styles.errorText}>{errors.patientName.message}</span>}
          </div>

          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? "Generando turno..." : "Obtener mi turno"}
          </button>
        </form>
        
        <footer className={styles.footer}>
           Sistema de Gestión de Turnos Médicos
        </footer>
      </div>
    </main>
  );
}
