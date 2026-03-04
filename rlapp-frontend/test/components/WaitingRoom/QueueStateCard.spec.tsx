/**
 * @jest-environment jsdom
 *
 * Tests para components/WaitingRoom/QueueStateCard
 * Cubre: estado null, datos completos, isAtCapacity true/false, patientsInQueue.
 */
import { render, screen } from "@testing-library/react";

import QueueStateCard from "@/components/WaitingRoom/QueueStateCard";
import type { QueueStateView } from "@/services/api/types";

jest.mock("@/styles/page.module.css", () => new Proxy({}, { get: (_t, k) => String(k) }));

const BASE: QueueStateView = {
  queueId: "Q1",
  currentCount: 5,
  maxCapacity: 20,
  isAtCapacity: false,
  availableSpots: 15,
  patientsInQueue: [],
  projectedAt: "2026-03-04T10:00:00Z",
};

describe("QueueStateCard", () => {
  it("muestra 'No hay datos.' cuando queueState es null", () => {
    render(<QueueStateCard queueState={null} />);
    expect(screen.getByText("No hay datos.")).toBeTruthy();
  });

  it("muestra currentCount y maxCapacity cuando tiene datos", () => {
    render(<QueueStateCard queueState={BASE} />);
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("20")).toBeTruthy();
  });

  it("muestra 'No' cuando isAtCapacity es false", () => {
    render(<QueueStateCard queueState={{ ...BASE, isAtCapacity: false }} />);
    expect(screen.getByText("No")).toBeTruthy();
  });

  it("muestra 'Sí' cuando isAtCapacity es true", () => {
    render(<QueueStateCard queueState={{ ...BASE, isAtCapacity: true }} />);
    expect(screen.getByText("Sí")).toBeTruthy();
  });

  it("muestra availableSpots correctamente", () => {
    render(<QueueStateCard queueState={{ ...BASE, availableSpots: 15 }} />);
    expect(screen.getByText("15")).toBeTruthy();
  });

  it("lista pacientes en cola cuando patientsInQueue tiene elementos", () => {
    const state: QueueStateView = {
      ...BASE,
      patientsInQueue: [
        { patientId: "p1", patientName: "Juan Pérez", priority: "High", waitTimeMinutes: 10, checkInTime: "2026-03-04T10:00:00.000Z" },
        { patientId: "p2", patientName: "Ana García", priority: "Low", waitTimeMinutes: 5, checkInTime: "2026-03-04T10:05:00.000Z" },
      ],
    };
    render(<QueueStateCard queueState={state} />);
    expect(screen.getByText("Juan Pérez")).toBeTruthy();
    expect(screen.getByText("Ana García")).toBeTruthy();
  });
});
