"use client";
import React from "react";

type Props = {
  connectionState: "connecting" | "online" | "degraded" | "offline";
  lastUpdated?: string | null;
  onForceRefresh?: () => void;
};

export default function NetworkStatus({ connectionState, lastUpdated, onForceRefresh }: Props) {
  const color =
    connectionState === "online" ? "#10b981" : connectionState === "connecting" ? "#f59e0b" : "#ef4444";
  const label =
    connectionState === "online" ? "Conectado" : connectionState === "connecting" ? "Conectando…" : "Problemas de red";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, background: color, borderRadius: 999 }} />
        <span style={{ fontSize: 12, color: "#374151" }}>{label}</span>
      </div>
      {lastUpdated ? <small style={{ color: "#6b7280" }}>{new Date(lastUpdated).toLocaleTimeString()}</small> : null}
      <button onClick={onForceRefresh} style={{ padding: "6px 8px", borderRadius: 6 }}>
        Forzar
      </button>
    </div>
  );
}
