"use client";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import { useCashierStation } from "@/hooks/useCashierStation";
import { useWaitingRoom } from "@/hooks/useWaitingRoom";
import type { PatientInQueueDto } from "@/services/api/types";
import sharedStyles from "@/styles/page.module.css";

import localStyles from "./page.module.css";

/** Prioridad → etiqueta legible en español. */
const PRIORITY_LABEL: Record<string, string> = {
  Urgent: "Urgente",
  High: "Alta",
  Medium: "Normal",
  Low: "Baja",
};

/** Prioridad → clase CSS del badge. */
const PRIORITY_CLASS: Record<string, string> = {
  Urgent: "priorityUrgent",
  High: "priorityHigh",
  Medium: "priorityMedium",
  Low: "priorityLow",
};

export default function CashierPage() {
  const search = useSearchParams();
  const queueId = search?.get("queue") ?? env.DEFAULT_QUEUE_ID;
  const alert = useAlert();
  const cashier = useCashierStation();
  const { queueState, refresh } = useWaitingRoom(queueId);

  // Paciente seleccionado de la lista
  const [selected, setSelected] = useState<PatientInQueueDto | null>(null);

  // Propagar errores del hook al sistema de alertas
  useEffect(() => {
    if (cashier.error) {
      alert.showError(cashier.error);
      cashier.clearError();
    }
  }, [cashier.error, alert, cashier]);

  /** Seleccionar paciente de la lista de espera. */
  function selectPatient(patient: PatientInQueueDto) {
    setSelected(patient);
  }

  /** Llamar al siguiente paciente de la cola. */
  async function doCallNext() {
    await cashier.callNext(queueId);
    refresh();
  }

  /** Ejecuta la acción y refresca la lista para reflejar el cambio. */
  async function executeAction(
    action: "validate" | "pending" | "absent" | "cancel",
  ) {
    if (!selected) {
      alert.showError("Seleccione un paciente de la lista primero.");
      return;
    }

    const cmd = { queueId, patientId: selected.patientId };

    if (action === "validate") await cashier.validate(cmd);
    else if (action === "pending") await cashier.markPending(cmd);
    else if (action === "absent") await cashier.markAbsent(cmd);
    else if (action === "cancel") await cashier.cancel(cmd);

    // Limpiar selección y refrescar la cola
    setSelected(null);
    refresh();
  }

  const patients = queueState?.patientsInQueue ?? [];

  return (
    <main className={localStyles.splitLayout}>
      {/* ── Panel izquierdo: lista de espera ── */}
      <section className={localStyles.listPanel}>
        <header className={localStyles.listHeader}>
          <h2 className={localStyles.listTitle}>
            Pacientes en espera
            <span className={localStyles.countBadge}>{patients.length}</span>
          </h2>
          <button
            type="button"
            onClick={() => void doCallNext()}
            disabled={cashier.busy}
            className={localStyles.callNextBtn}
          >
            Llamar siguiente
          </button>
        </header>

        {patients.length === 0 ? (
          <div className={localStyles.emptyState}>
            <span className={localStyles.emptyIcon}>🪑</span>
            <p>No hay pacientes en la cola.</p>
          </div>
        ) : (
          <ul className={localStyles.patientList}>
            {patients.map((p) => {
              const isSelected = selected?.patientId === p.patientId;
              return (
                <li key={p.patientId}>
                  <button
                    type="button"
                    className={`${localStyles.patientItem} ${isSelected ? localStyles.patientItemSelected : ""}`}
                    onClick={() => selectPatient(p)}
                  >
                    <div className={localStyles.patientInfo}>
                      <span className={localStyles.patientName}>{p.patientName}</span>
                      <span className={localStyles.patientId}>{p.patientId}</span>
                    </div>
                    <div className={localStyles.patientMeta}>
                      <span
                        className={`${localStyles.priorityBadge} ${localStyles[PRIORITY_CLASS[p.priority] ?? "priorityMedium"]}`}
                      >
                        {PRIORITY_LABEL[p.priority] ?? p.priority}
                      </span>
                      <span className={localStyles.waitTime}>{p.waitTimeMinutes} min</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Panel derecho: acciones sobre el paciente seleccionado ── */}
      <section className={localStyles.actionPanel}>
        <h2 className={sharedStyles.title}>Caja</h2>
        <p className={localStyles.queueLabel}>
          Cola: <strong>{queueId}</strong>
        </p>

        {selected ? (
          <div className={localStyles.selectedCard}>
            <div className={localStyles.selectedHeader}>
              <span className={localStyles.selectedName}>{selected.patientName}</span>
              <span
                className={`${localStyles.priorityBadge} ${localStyles[PRIORITY_CLASS[selected.priority] ?? "priorityMedium"]}`}
              >
                {PRIORITY_LABEL[selected.priority] ?? selected.priority}
              </span>
            </div>
            <div className={localStyles.selectedDetails}>
              <div className={localStyles.detailRow}>
                <span className={localStyles.detailLabel}>ID</span>
                <span className={localStyles.detailValue}>{selected.patientId}</span>
              </div>
              <div className={localStyles.detailRow}>
                <span className={localStyles.detailLabel}>Espera</span>
                <span className={localStyles.detailValue}>{selected.waitTimeMinutes} min</span>
              </div>
              <div className={localStyles.detailRow}>
                <span className={localStyles.detailLabel}>Check-in</span>
                <span className={localStyles.detailValue}>
                  {new Date(selected.checkInTime).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className={localStyles.actionButtons}>
              <button
                type="button"
                onClick={() => void executeAction("validate")}
                disabled={cashier.busy}
                className={localStyles.btnValidate}
              >
                Validar pago
              </button>
              <button
                type="button"
                onClick={() => void executeAction("pending")}
                disabled={cashier.busy}
                className={localStyles.btnPending}
              >
                Marcar pendiente
              </button>
              <button
                type="button"
                onClick={() => void executeAction("absent")}
                disabled={cashier.busy}
                className={localStyles.btnAbsent}
              >
                Marcar ausente
              </button>
              <button
                type="button"
                onClick={() => void executeAction("cancel")}
                disabled={cashier.busy}
                className={localStyles.btnCancel}
              >
                Anular pago
              </button>
            </div>
          </div>
        ) : (
          <div className={localStyles.noSelection}>
            <span className={localStyles.noSelectionIcon}>👈</span>
            <p>Seleccione un paciente de la lista para realizar acciones.</p>
          </div>
        )}
      </section>
    </main>
  );
}

