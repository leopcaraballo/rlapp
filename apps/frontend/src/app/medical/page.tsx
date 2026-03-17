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
import { useWaitingRoom } from "@/hooks/useWaitingRoom";
import { PatientSearchInput, filterPatients } from "@/components/PatientSearchInput";

import styles from "./page.module.css";

// stationId es opcional en el claim: el backend auto-asigna el consultorio disponible.
// Es requerido solo para activar/desactivar un consultorio específico.
const MedicalSchema = z.object({
  queueId: z.string().min(1, "La cola es obligatoria"),
  stationId: z.string().optional(),
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

  const initialQueueId = search?.get("queue") || env.DEFAULT_QUEUE_ID;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MedicalForm>({
    resolver: zodResolver(MedicalSchema),
    defaultValues: {
      queueId: initialQueueId,
      stationId: "",
      patientId: "",
      outcome: null,
    },
  });

  const watchedQueueId = watch("queueId");
  const { nextTurn, refresh, queueState } = useWaitingRoom(
    watchedQueueId || env.DEFAULT_QUEUE_ID,
  );

  const [searchQuery, setSearchQuery] = React.useState("");

  // // HUMAN CHECK: Auto-rellena patientId tras claim exitoso para evitar
  // copia manual del ID por el médico. Comportamiento esperado del dominio:
  // solo un paciente puede estar en estado "claimed" por estación a la vez.
  useEffect(() => {
    const claimedId = medical.lastResult?.patientId;
    if (claimedId) setValue("patientId", claimedId);
    // setValue es estable en react-hook-form; incluirlo causa loop infinito en React 19
  }, [medical.lastResult]);

  // Propagar errores de los hooks al sistema de alertas
  useEffect(() => {
    if (medical.error) alert.showError(medical.error);
  }, [medical.error, alert]);

  useEffect(() => {
    if (rooms.error) alert.showError(rooms.error);
  }, [rooms.error, alert]);

  function onCallNext(data: MedicalForm) {
    // stationId no se pasa: el backend auto-asigna el primer consultorio activo disponible
    void medical.claim({ queueId: data.queueId, stationId: null });
    setTimeout(() => refresh(), 500);
  }

  function onActivate(data: MedicalForm) {
    if (!data.stationId) {
      alert.showError("Seleccione un consultorio para activar");
      return;
    }
    rooms.activate(data.queueId, data.stationId);
  }

  function onDeactivate(data: MedicalForm) {
    if (!data.stationId) {
      alert.showError("Seleccione un consultorio para desactivar");
      return;
    }
    rooms.deactivate(data.queueId, data.stationId);
  }

  function onStartConsult(data: MedicalForm) {
    if (!data.patientId) {
      alert.showError("El ID de paciente es obligatorio");
      return;
    }
    void medical.call({ queueId: data.queueId, patientId: data.patientId });
    setTimeout(() => refresh(), 500);
  }

  function onFinishConsult(data: MedicalForm) {
    if (!data.patientId) {
      alert.showError("El ID de paciente es obligatorio");
      return;
    }
    void medical.complete({
      queueId: data.queueId,
      patientId: data.patientId,
      outcome: data.outcome || null,
    });
    setTimeout(() => refresh(), 500);
  }

  function onMarkAbsent(data: MedicalForm) {
    if (!data.patientId) {
      alert.showError("El ID de paciente es obligatorio");
      return;
    }
    void medical.markAbsent({
      queueId: data.queueId,
      patientId: data.patientId,
    });
    setTimeout(() => refresh(), 500);
  }

  // Paciente actualmente en turno de consulta (proyección nextTurn del backend)
  const activePatient =
    nextTurn &&
    (nextTurn.status === "claimed" ||
      nextTurn.status === "called" ||
      nextTurn.status === "cashier-paid")
      ? nextTurn
      : null;

  return (
    <form
      className={styles.splitLayout}
      onSubmit={handleSubmit(onStartConsult)}
      noValidate
    >
      {/* Panel izquierdo: Estación */}
      <section className={styles.stationPanel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Estación Médica</h2>
        </header>

        <div className={styles.panelBody}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="queueId">
              Cola
            </label>
            <input
              id="queueId"
              className={styles.input}
              placeholder="ej. QUEUE-01"
              {...register("queueId")}
            />
            {errors.queueId && (
              <div className={styles.fieldError} role="alert">
                {errors.queueId.message}
              </div>
            )}
          </div>

          {/* Consultorio auto-asignado tras llamar siguiente — solo informativo */}
          {medical.lastResult?.stationId && (
            <div className={styles.assignedRoomBadge}>
              Consultorio asignado:{" "}
              <strong>{medical.lastResult.stationId}</strong>
            </div>
          )}

          {/* Selector de consultorio para activar/desactivar únicamente */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="stationId">
              Consultorio (activar / desactivar)
            </label>
            <select
              id="stationId"
              className={styles.input}
              {...register("stationId")}
            >
              <option value="">-- Seleccionar --</option>
              <option value="CONS-01">CONS-01</option>
              <option value="CONS-02">CONS-02</option>
              <option value="CONS-03">CONS-03</option>
              <option value="CONS-04">CONS-04</option>
            </select>
            <p className={styles.fieldHint}>
              Al llamar siguiente, el consultorio se asigna automáticamente.
            </p>
          </div>

          <div className={styles.stationActions}>
            <button
              type="button"
              onClick={handleSubmit(onCallNext)}
              disabled={busy}
              className={styles.btnCallNext}
            >
              Llamar siguiente
            </button>
            <button
              type="button"
              onClick={handleSubmit(onActivate)}
              disabled={busy}
              className={styles.btnActivate}
            >
              Activar estación
            </button>
            <button
              type="button"
              onClick={handleSubmit(onDeactivate)}
              disabled={busy}
              className={styles.btnDeactivate}
            >
              Desactivar estación
            </button>
          </div>
        </div>

        {/* Cola de espera con búsqueda — visible para que el médico pueda identificar pacientes */}
        {(() => {
          const waitingPatients = queueState?.patientsInQueue ?? [];
          const filteredPatients = filterPatients(waitingPatients, searchQuery);
          return (
            <>
              <PatientSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                resultCount={filteredPatients.length}
                totalCount={waitingPatients.length}
              />
              {waitingPatients.length > 0 && (
                <ul className={styles.queueList}>
                  {filteredPatients.map((p) => (
                    <li key={p.patientId} className={styles.queueListItem}>
                      <span className={styles.queueTurnNumber}>#{p.turnNumber}</span>
                      <span className={styles.queuePatientName}>{p.patientName}</span>
                      <span className={styles.queuePatientId}>{p.patientId}</span>
                    </li>
                  ))}
                  {filteredPatients.length === 0 && searchQuery && (
                    <li className={styles.queueEmptySearch}>Sin resultados para la búsqueda.</li>
                  )}
                </ul>
              )}
            </>
          );
        })()}
      </section>

      {/* Panel derecho: Gestión de consulta */}
      <section className={styles.consultPanel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Gestión de Consulta</h2>
        </header>

        <div className={styles.panelBody}>
          {/* Paciente activo — auto-relleno desde proyección backend */}
          {activePatient && (
            <div className={styles.activePatientCard}>
              <span className={styles.activePatientLabel}>
                Paciente en turno
              </span>
              <span className={styles.activePatientTurn}>
                Turno #{activePatient.turnNumber}
              </span>
              <span className={styles.activePatientName}>
                {activePatient.patientName}
              </span>
              <span className={styles.activePatientId}>
                {activePatient.patientId}
              </span>
              <span className={styles.activePatientMeta}>
                {activePatient.consultationType} — {activePatient.priority}
              </span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="patientId">
              ID de paciente
              {medical.lastResult?.patientId && (
                <span className={styles.autoFilledBadge}>
                  {" "}
                  (auto-rellenado)
                </span>
              )}
            </label>
            <input
              id="patientId"
              className={styles.input}
              placeholder="Se rellena automáticamente al llamar siguiente"
              {...register("patientId")}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="outcome">
              Resultado (opcional)
            </label>
            <input
              id="outcome"
              className={styles.input}
              placeholder="Ej. Diagnóstico, tratamiento..."
              {...register("outcome")}
            />
          </div>

          <div className={styles.consultActions}>
            <button type="submit" disabled={busy} className={styles.btnStart}>
              Iniciar consulta
            </button>
            <button
              type="button"
              onClick={handleSubmit(onFinishConsult)}
              disabled={busy}
              className={styles.btnFinish}
            >
              Finalizar consulta
            </button>
            <button
              type="button"
              onClick={handleSubmit(onMarkAbsent)}
              disabled={busy}
              className={styles.btnAbsent}
            >
              Marcar ausente
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
