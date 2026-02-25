"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import { useConsultingRooms } from "@/hooks/useConsultingRooms";
import { useMedicalStation } from "@/hooks/useMedicalStation";
import sharedStyles from "@/styles/page.module.css";

import localStyles from "./page.module.css";

// stationId es requerido: el dominio exige ConsultingRoomId en ClaimNextPatient,
// ActivateConsultingRoom y DeactivateConsultingRoom.
const MedicalSchema = z.object({
  queueId: z.string().min(1, "La cola es obligatoria"),
  stationId: z.string().min(1, "El ID de estación es obligatorio"),
  patientId: z.string().optional(),
  outcome: z.string().optional().nullable(),
});

type MedicalForm = z.infer<typeof MedicalSchema>;

export default function MedicalPage() {
  const search = useSearchParams();
  const alert = useAlert();
  const medical = useMedicalStation();
  const rooms = useConsultingRooms();
  const busy = medical.busy || rooms.busy;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MedicalForm>({
    resolver: zodResolver(MedicalSchema),
    defaultValues: { queueId: env.DEFAULT_QUEUE_ID, stationId: "", patientId: "", outcome: null },
  });

  useEffect(() => {
    const q = search?.get("queue");
    if (q) setValue("queueId", q);
  }, [search, setValue]);

  // Propagar errores de los hooks al sistema de alertas
  useEffect(() => {
    if (medical.error) alert.showError(medical.error);
  }, [medical.error, alert]);

  useEffect(() => {
    if (rooms.error) alert.showError(rooms.error);
  }, [rooms.error, alert]);

  function onCallNext(data: MedicalForm) {
    medical.claim({ queueId: data.queueId, stationId: data.stationId });
  }

  function onActivate(data: MedicalForm) {
    rooms.activate(data.queueId, data.stationId);
  }

  function onDeactivate(data: MedicalForm) {
    rooms.deactivate(data.queueId, data.stationId);
  }

  function onStartConsult(data: MedicalForm) {
    if (!data.patientId) { alert.showError("El ID de paciente es obligatorio"); return; }
    medical.call({ queueId: data.queueId, patientId: data.patientId });
  }

  function onFinishConsult(data: MedicalForm) {
    if (!data.patientId) { alert.showError("El ID de paciente es obligatorio"); return; }
    medical.complete({ queueId: data.queueId, patientId: data.patientId, outcome: data.outcome ?? null });
  }

  function onMarkAbsent(data: MedicalForm) {
    if (!data.patientId) { alert.showError("El ID de paciente es obligatorio"); return; }
    medical.markAbsent({ queueId: data.queueId, patientId: data.patientId });
  }

  return (
    <main className={`${localStyles.container} ${sharedStyles.dashboardContainer}`}>
      <div className={localStyles.card}>
        <h2 className={sharedStyles.title}>Área Médica</h2>
        <form className={localStyles.form} onSubmit={handleSubmit(onStartConsult)} noValidate>

          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="queueId">Cola</label>
            <input
              id="queueId"
              className={localStyles.input}
              placeholder="ej. QUEUE-01"
              {...register("queueId")}
            />
          </div>
          {errors.queueId && (
            <div className={localStyles.fieldError} role="alert">{errors.queueId.message}</div>
          )}

          {/* stationId debe ir antes de los botones de cola/estación */}
          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="stationId">Estación</label>
            <select id="stationId" className={localStyles.input} {...register("stationId")}>
              <option value="">-- Seleccionar consultorio --</option>
              <option value="CONS-01">CONS-01</option>
              <option value="CONS-02">CONS-02</option>
              <option value="CONS-03">CONS-03</option>
              <option value="CONS-04">CONS-04</option>
            </select>
          </div>
          {errors.stationId && (
            <div className={localStyles.fieldError} role="alert">{errors.stationId.message}</div>
          )}

          <div className={localStyles.row}>
            <button
              type="button"
              onClick={handleSubmit(onCallNext)}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnSecondary}`}
            >
              Llamar siguiente
            </button>
            <button
              type="button"
              onClick={handleSubmit(onActivate)}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnSecondary}`}
            >
              Activar estación
            </button>
            <button
              type="button"
              onClick={handleSubmit(onDeactivate)}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnDanger}`}
            >
              Desactivar estación
            </button>
          </div>

          <div className={localStyles.sectionDivider}>Gestión de consulta</div>

          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="patientId">ID de paciente</label>
            <input
              id="patientId"
              className={localStyles.input}
              placeholder="Ej. p-1700000000000"
              {...register("patientId")}
            />
          </div>

          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="outcome">Resultado de la consulta (opcional)</label>
            <input
              id="outcome"
              className={localStyles.input}
              placeholder="Ej. Diagnóstico, tratamiento indicado..."
              {...register("outcome")}
            />
          </div>

          <div className={localStyles.row}>
            <button
              type="submit"
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnPrimary}`}
            >
              Iniciar consulta
            </button>
            <button
              type="button"
              onClick={handleSubmit(onFinishConsult)}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnSecondary}`}
            >
              Finalizar consulta
            </button>
            <button
              type="button"
              onClick={handleSubmit(onMarkAbsent)}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnWarning}`}
            >
              Marcar ausente
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
