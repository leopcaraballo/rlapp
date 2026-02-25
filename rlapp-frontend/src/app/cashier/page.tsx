"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { env } from "@/config/env";
import { useAlert } from "@/context/AlertContext";
import { useCashierStation } from "@/hooks/useCashierStation";
import sharedStyles from "@/styles/page.module.css";

import localStyles from "./page.module.css";

const CashierSchema = z.object({
  queueId: z.string().min(1, "La cola es obligatoria"),
  patientId: z.string().min(1, "El patientId es obligatorio"),
});

type CashierForm = z.infer<typeof CashierSchema>;

export default function CashierPage() {
  const search = useSearchParams();
  const alert = useAlert();
  const cashier = useCashierStation();

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

  // Auto-rellenar patientId cuando el backend devuelve uno tras callNext
  useEffect(() => {
    if (cashier.lastResult?.patientId) {
      setValue("patientId", cashier.lastResult.patientId);
    }
  }, [cashier.lastResult, setValue]);

  // Propagar errores del hook al sistema de alertas
  useEffect(() => {
    if (cashier.error) alert.showError(cashier.error);
  }, [cashier.error, alert]);

  async function doCallNext() {
    await cashier.callNext(getValues("queueId") || env.DEFAULT_QUEUE_ID);
  }

  async function onValidate(data: CashierForm) {
    await cashier.validate({ queueId: data.queueId, patientId: data.patientId });
  }

  async function onAction(action: "pending" | "absent" | "cancel", data: CashierForm) {
    if (action === "pending") await cashier.markPending({ queueId: data.queueId, patientId: data.patientId });
    if (action === "absent") await cashier.markAbsent({ queueId: data.queueId, patientId: data.patientId });
    if (action === "cancel") await cashier.cancel({ queueId: data.queueId, patientId: data.patientId });
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
              disabled={cashier.busy}
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
              disabled={cashier.busy}
              className={`${localStyles.btn} ${localStyles.btnPrimary}`}
            >
              Validar pago
            </button>
            <button
              type="button"
              onClick={handleSubmit((d) => onAction("pending", d))}
              disabled={cashier.busy}
              className={`${localStyles.btn} ${localStyles.btnSecondary}`}
            >
              Marcar pendiente
            </button>
          </div>
          <div className={localStyles.row}>
            <button
              type="button"
              onClick={handleSubmit((d) => onAction("absent", d))}
              disabled={cashier.busy}
              className={`${localStyles.btn} ${localStyles.btnWarning}`}
            >
              Marcar ausente
            </button>
            <button
              type="button"
              onClick={handleSubmit((d) => onAction("cancel", d))}
              disabled={cashier.busy}
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

