"use client";
import Link from "next/link";
import React, { useEffect } from "react";

import { useAlert } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";
import { rebuildProjection } from "@/services/api/atencion";
import styles from "@/styles/page.module.css";

import NetworkStatus from "../../../components/NetworkStatus";
import MonitorCard from "../../../components/WaitingRoom/MonitorCard";
import NextTurnCard from "../../../components/WaitingRoom/NextTurnCard";
import QueueStateCard from "../../../components/WaitingRoom/QueueStateCard";
import RecentHistory from "../../../components/WaitingRoom/RecentHistory";
import { useAtencion } from "../../../hooks/useAtencion";

type Props = { params: Promise<{ serviceId: string }> };

export default function AtencionPage({ params }: Props) {
  const { serviceId } = React.use(params);
  const {
    monitor,
    queueState,
    nextTurn,
    history,
    refresh,
    connectionState,
    lastUpdated,
  } = useAtencion(serviceId);
  const alert = useAlert();
  const { role } = useAuth();

  useEffect(() => {
    refresh();
  }, [serviceId]);

  const canOperate =
    role === "reception" ||
    role === "cashier" ||
    role === "doctor" ||
    role === "admin";

  return (
    <main className={styles.dashboardSplitLayout}>
      <section className={styles.leftPanel}>
        <header className={styles.stickyHeader}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Cola — {serviceId}</h1>
            <div className={styles.headerActions}>
              <NetworkStatus
                connectionState={connectionState}
                lastUpdated={lastUpdated}
                onForceRefresh={refresh}
              />
            </div>
          </div>
          <div className={styles.lastUpdated}>
            Última actualización: {lastUpdated ?? "—"}
          </div>
        </header>

        <div className={styles.sectionBlock}>
          <div className={styles.cardGrid}>
            <MonitorCard monitor={monitor} />
            <QueueStateCard queueState={queueState} />
            <NextTurnCard nextTurn={nextTurn} />
            <RecentHistory history={history} />
          </div>
        </div>
      </section>

      <aside className={styles.rightPanel}>
        <div className={styles.queueCard}>
          <span className={styles.queueCardTitle}>Acciones rápidas</span>
          <div className={styles.quickActionsList}>
            {canOperate ? (
              <>
                <Link
                  className={styles.actionLink}
                  href={`/reception?queue=${encodeURIComponent(serviceId)}`}
                >
                  Registrar check-in
                </Link>
                <Link
                  className={styles.actionLink}
                  href={`/payment?queue=${encodeURIComponent(serviceId)}`}
                >
                  Ir a caja
                </Link>
                <Link
                  className={styles.actionLink}
                  href={`/medical?queue=${encodeURIComponent(serviceId)}`}
                >
                  Ir a área médica
                </Link>
                <button
                  className={styles.actionBtn}
                  onClick={() => {
                    void (async () => {
                      try {
                        await rebuildProjection(serviceId);
                        refresh();
                      } catch (error: unknown) {
                        const msg =
                          error instanceof Error
                            ? error.message
                            : "No fue posible reconstruir la proyeccion.";
                        alert.showError(msg);
                      }
                    })();
                  }}
                >
                  Reconstruir proyección
                </button>
              </>
            ) : (
              <p className={styles.empty}>
                Vista de solo lectura para paciente.
              </p>
            )}
          </div>
        </div>

        <div className={styles.queueCard}>
          <span className={styles.queueCardTitle}>Detalles</span>
          <div className={styles.queueDetails}>
            Última actualización: {monitor?.projectedAt ?? "—"}
          </div>
        </div>
      </aside>
    </main>
  );
}
