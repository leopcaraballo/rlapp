"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useAlert } from "@/context/AlertContext";
import sharedStyles from "@/styles/page.module.css";

import {
  activateConsultingRoom,
  callNextMedical,
  deactivateConsultingRoom,
  finishConsultation,
  markAbsentMedical,
  startConsultation,
} from "../../services/api/waitingRoom";
import localStyles from "./page.module.css";

const MedicalSchema = z.object({
  queueId: z.string().min(1, "La cola es obligatoria"),
  stationId: z.string().optional(),
  patientId: z.string().min(1, "El patientId es obligatorio"),
});

type MedicalForm = z.infer<typeof MedicalSchema>;

export default function MedicalPage() {
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MedicalForm>({
    resolver: zodResolver(MedicalSchema),
    defaultValues: { queueId: "default-queue", stationId: "", patientId: "" },
  });

  useEffect(() => {
    const q = search?.get("queue");
    if (q) setValue("queueId", q);
  }, [search, setValue]);

  async function doCallNext() {
    setBusy(true);
    try {
      await callNextMedical({ queueId: (document.querySelector('input[name="queueId"]') as HTMLInputElement)?.value || "default-queue", actor: "medical" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al llamar siguiente");
    } finally {
      setBusy(false);
    }
  }

  async function onActivate(data: MedicalForm) {
    setBusy(true);
    try {
      await activateConsultingRoom({ queueId: data.queueId, actor: "medical", stationId: data.stationId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al activar estación");
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate(data: MedicalForm) {
    setBusy(true);
    try {
      await deactivateConsultingRoom({ queueId: data.queueId, actor: "medical", stationId: data.stationId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al desactivar estación");
    } finally {
      setBusy(false);
    }
  }

  async function onStartConsult(data: MedicalForm) {
    setBusy(true);
    try {
      await startConsultation({ queueId: data.queueId, patientId: data.patientId, actor: "medical", stationId: data.stationId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al iniciar consulta");
    } finally {
      setBusy(false);
    }
  }

  async function onFinishConsult(data: MedicalForm) {
    setBusy(true);
    try {
      await finishConsultation({ queueId: data.queueId, patientId: data.patientId, actor: "medical", stationId: data.stationId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al finalizar consulta");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkAbsent(data: MedicalForm) {
    setBusy(true);
    try {
      await markAbsentMedical({ queueId: data.queueId, patientId: data.patientId, actor: "medical" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al marcar ausente");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`${localStyles.container} ${sharedStyles.dashboardContainer}`}>
      <h2 className={sharedStyles.title}>Área Médica</h2>
      <form className={localStyles.form} onSubmit={handleSubmit(onStartConsult)} noValidate>
        <label>
          Cola
          <input {...register("queueId")} name="queueId" />
        </label>
        {errors.queueId && <div style={{ color: "#b00020" }}>{errors.queueId.message}</div>}

        <div className={localStyles.row}>
          <button type="button" onClick={doCallNext} disabled={busy}>
            Llamar siguiente
          </button>
          <button type="button" onClick={handleSubmit(onActivate)} disabled={busy}>
            Activar estación
          </button>
          <button type="button" onClick={handleSubmit(onDeactivate)} disabled={busy}>
            Desactivar estación
          </button>
        </div>

        <label>
          Estación
          <input {...register("stationId")} name="stationId" />
        </label>

        <label>
          PatientId
          <input {...register("patientId")} name="patientId" />
        </label>
        {errors.patientId && <div style={{ color: "#b00020" }}>{errors.patientId.message}</div>}

        {/* Alerts rendered globally by AlertProvider */}
        <div className={localStyles.row}>
          <button type="submit" disabled={busy}>
            Iniciar consulta
          </button>
          <button type="button" onClick={handleSubmit(onFinishConsult)} disabled={busy}>
            Finalizar consulta
          </button>
          <button type="button" onClick={handleSubmit(onMarkAbsent)} disabled={busy}>
            Marcar ausente
          </button>
        </div>
      </form>
    </main>
  );
}
