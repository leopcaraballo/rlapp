/**
 * @jest-environment jsdom
 *
 * Tests para components/WaitingRoom/MonitorCard
 * Cubre: estado null, datos completos, rama value ?? "-".
 */
import { render, screen } from "@testing-library/react";

import MonitorCard from "@/components/WaitingRoom/MonitorCard";
import type { WaitingRoomMonitorView } from "@/services/api/types";

jest.mock("@/styles/page.module.css", () => new Proxy({}, { get: (_t, k) => String(k) }));

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

describe("MonitorCard", () => {
  it("muestra 'No hay datos disponibles.' cuando monitor es null", () => {
    render(<MonitorCard monitor={null} />);
    expect(screen.getByText("No hay datos disponibles.")).toBeTruthy();
  });

  it("muestra totalPatientsWaiting cuando tiene datos", () => {
    render(<MonitorCard monitor={BASE} />);
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("muestra highPriorityCount", () => {
    render(<MonitorCard monitor={BASE} />);
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("muestra averageWaitTimeMinutes", () => {
    render(<MonitorCard monitor={BASE} />);
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("muestra utilizationPercentage", () => {
    render(<MonitorCard monitor={BASE} />);
    expect(screen.getByText("60")).toBeTruthy();
  });

  it("muestra '-' cuando value es null (rama ?? '-')", () => {
    const monitor: WaitingRoomMonitorView = {
      ...BASE,
      totalPatientsWaiting: null as unknown as number,
    };
    render(<MonitorCard monitor={monitor} />);
    expect(screen.getByText("-")).toBeTruthy();
  });
});
