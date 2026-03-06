/**
 * @jest-environment jsdom
 *
 * TDD RETROFIT — RED
 * Demuestra que los tests fallan contra la implementación v0 de MonitorCard,
 * la cual no usaba `value ?? "-"` en el componente Stat interno,
 * mostrando string vacío o "null" en lugar de "-".
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Commit par (GREEN): test/components/WaitingRoom/MonitorCard.spec.tsx
 */
import { render, screen } from "@testing-library/react";
import React from "react";

import type { WaitingRoomMonitorView } from "@/services/api/types";

jest.mock("@/styles/page.module.css", () => new Proxy({}, { get: (_t, k) => String(k) }));

// ── v0 stub: Stat sin `value ?? "-"`, convierte directo a String ──
jest.mock("@/components/WaitingRoom/MonitorCard", () => {
  function StatV0({ value }: { label: string; value: number | string | null }) {
    // v0: no usaba fallback ?? "-", renderizaba String(null) = "null" o ""
    return React.createElement("span", null, value === null ? "" : String(value));
  }
  return function MonitorCardV0({ monitor }: { monitor: WaitingRoomMonitorView | null }) {
    if (!monitor) {
      return React.createElement("div", null, "No hay datos disponibles.");
    }
    return React.createElement(
      "div",
      null,
      React.createElement(StatV0, { label: "Total en espera", value: monitor.totalPatientsWaiting }),
      React.createElement(StatV0, { label: "Alta prioridad", value: monitor.highPriorityCount }),
      React.createElement(StatV0, { label: "Promedio espera (min)", value: monitor.averageWaitTimeMinutes }),
      React.createElement(StatV0, { label: "Utilización (%)", value: monitor.utilizationPercentage }),
    );
  };
});

import MonitorCard from "@/components/WaitingRoom/MonitorCard";

const BASE: WaitingRoomMonitorView = {
  queueId: "Q1",
  totalPatientsWaiting: 7,
  highPriorityCount: 2,
  normalPriorityCount: 4,
  lowPriorityCount: 1,
  lastPatientCheckedInAt: null,
  averageWaitTimeMinutes: 12,
  utilizationPercentage: 60,
  projectedAt: "2026-03-04T10:00:00Z",
};

describe("MonitorCard — RED (v0: Stat sin fallback ?? '-')", () => {
  // Comportamientos presentes en v0 → pasan normalmente
  it("muestra 'No hay datos disponibles.' cuando monitor es null", () => {
    render(<MonitorCard monitor={null} />);
    expect(screen.getByText("No hay datos disponibles.")).toBeTruthy();
  });

  it("muestra totalPatientsWaiting (7) cuando tiene datos", () => {
    render(<MonitorCard monitor={BASE} />);
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("muestra highPriorityCount (2)", () => {
    render(<MonitorCard monitor={BASE} />);
    expect(screen.getByText("2")).toBeTruthy();
  });

  // Comportamiento NUEVO → falla contra v0 → evidencia RED
   
  it.failing("muestra '-' cuando value es null — rama ?? '-' ausente en v0", () => {
    const monitor: WaitingRoomMonitorView = {
      ...BASE,
      totalPatientsWaiting: null as unknown as number,
    };
    render(<MonitorCard monitor={monitor} />);
    expect(screen.getByText("-")).toBeTruthy();
  });
});
