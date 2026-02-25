"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  callNextCashier,
  validatePayment,
  markPaymentPending,
  markAbsentAtCashier,
  cancelByPayment,
} from "../../services/api/waitingRoom";
import localStyles from "./page.module.css";
import sharedStyles from "@/styles/page.module.css";
import Alert from "@/components/Alert";
import { useAlert } from "@/context/AlertContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
    setValue,
    formState: { errors },
  } = useForm<CashierForm>({
    resolver: zodResolver(CashierSchema),
    defaultValues: { queueId: "default-queue", patientId: "" },
  });

  useEffect(() => {
    const q = search?.get("queue");
    if (q) setValue("queueId", q);
  }, [search, setValue]);

  async function doCallNext() {
    setBusy(true);
    // clear handled by provider
    try {
      await callNextCashier({ queueId: (document.querySelector('input[name="queueId"]') as HTMLInputElement)?.value || "default-queue", actor: "cashier" });
    } catch (err) {
      alert.showError((err as any)?.message ?? "Error al llamar siguiente");
    } finally {
      setBusy(false);
    }
  }

  async function onValidate(data: CashierForm) {
    setBusy(true);
    try {
      await validatePayment({ queueId: data.queueId, patientId: data.patientId, actor: "cashier" });
    } catch (err) {
      alert.showError((err as any)?.message ?? "Error al validar pago");
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
    } catch (err) {
      alert.showError((err as any)?.message ?? "Error en la acción");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`${localStyles.container} ${sharedStyles.dashboardContainer}`}>
      <h2 className={sharedStyles.title}>Caja</h2>
      <form onSubmit={handleSubmit(onValidate)} className={localStyles.form} noValidate>
        <label>
          Cola
          <input {...register("queueId")} name="queueId" className={localStyles.input} />
        </label>
        {errors.queueId && <div style={{ color: "#b00020" }}>{errors.queueId.message}</div>}

        <button type="button" onClick={doCallNext} disabled={busy}>
          Llamar siguiente
        </button>

        <label>
          PatientId
          <input {...register("patientId")} name="patientId" className={localStyles.input} />
        </label>
        {errors.patientId && <div style={{ color: "#b00020" }}>{errors.patientId.message}</div>}

        {/* Alerts rendered globally by AlertProvider */}
        <div className={localStyles.row}>
          <button type="submit" disabled={busy}>
            Validar pago
          </button>
          <button type="button" onClick={handleSubmit((d) => onAction("pending", d))} disabled={busy}>
            Marcar pendiente
          </button>
          <button type="button" onClick={handleSubmit((d) => onAction("absent", d))} disabled={busy}>
            Marcar ausente
          </button>
          <button type="button" onClick={handleSubmit((d) => onAction("cancel", d))} disabled={busy}>
            Anular pago
          </button>
        </div>
      </form>
    </main>
  );
}
