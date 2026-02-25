"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import sharedStyles from "@/styles/page.module.css";

import {
  callNextCashier,
  cancelByPayment,
  markAbsentAtCashier,
  markPaymentPending,
  validatePayment,
} from "../../services/api/waitingRoom";
import localStyles from "./page.module.css";

const CashierSchema = z.object({
  queueId: z.string().min(1, "La cola es obligatoria"),
  patientId: z.string().min(1, "El patientId es obligatorio"),
});

type CashierForm = z.infer<typeof CashierSchema>;

export default function CashierPage() {
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CashierForm>({
    resolver: zodResolver(CashierSchema),
    defaultValues: { queueId: env.DEFAULT_QUEUE_ID, patientId: "" },
  });

  useEffect(() => {
    const q = search?.get("queue");
    if (q) setValue("queueId", q);
  }, [search, setValue]);

  async function doCallNext() {
    setBusy(true);
    // clear handled by provider
    try {
      await callNextCashier({ queueId: getValues("queueId") || env.DEFAULT_QUEUE_ID, actor: "cashier" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al llamar siguiente");
    } finally {
      setBusy(false);
    }
  }

  async function onValidate(data: CashierForm) {
    setBusy(true);
    try {
      await validatePayment({ queueId: data.queueId, patientId: data.patientId, actor: "cashier" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error al validar pago");
    } finally {
      setBusy(false);
    }
  }

  async function onAction(action: "pending" | "absent" | "cancel", data: CashierForm) {
    setBusy(true);
    try {
      if (action === "pending") await markPaymentPending({ queueId: data.queueId, patientId: data.patientId, actor: "cashier" });
      if (action === "absent") await markAbsentAtCashier({ queueId: data.queueId, patientId: data.patientId, actor: "cashier" });
      if (action === "cancel") await cancelByPayment({ queueId: data.queueId, patientId: data.patientId, actor: "cashier" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert.showError(msg ?? "Error en la acción");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`${localStyles.container} ${sharedStyles.dashboardContainer}`}>
      <div className={localStyles.card}>
        <h2 className={sharedStyles.title}>Caja</h2>
        <form onSubmit={handleSubmit(onValidate)} className={localStyles.form} noValidate>

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

          <div className={localStyles.row}>
            <button
              type="button"
              onClick={doCallNext}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnSecondary}`}
            >
              Llamar siguiente
            </button>
          </div>

          <div className={localStyles.sectionDivider}>Acciones por paciente</div>

          <div className={localStyles.formGroup}>
            <label className={localStyles.label} htmlFor="patientId">ID de paciente</label>
            <input
              id="patientId"
              className={localStyles.input}
              placeholder="Ej. p-1700000000000"
              {...register("patientId")}
            />
          </div>
          {errors.patientId && (
            <div className={localStyles.fieldError} role="alert">{errors.patientId.message}</div>
          )}

          <div className={localStyles.row}>
            <button
              type="submit"
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnPrimary}`}
            >
              Validar pago
            </button>
            <button
              type="button"
              onClick={handleSubmit((d) => onAction("pending", d))}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnSecondary}`}
            >
              Marcar pendiente
            </button>
          </div>
          <div className={localStyles.row}>
            <button
              type="button"
              onClick={handleSubmit((d) => onAction("absent", d))}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnWarning}`}
            >
              Marcar ausente
            </button>
            <button
              type="button"
              onClick={handleSubmit((d) => onAction("cancel", d))}
              disabled={busy}
              className={`${localStyles.btn} ${localStyles.btnDanger}`}
            >
              Anular pago
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
