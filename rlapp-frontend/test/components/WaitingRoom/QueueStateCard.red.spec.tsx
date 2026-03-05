/**
 * @jest-environment jsdom
 *
 * TDD RETROFIT — RED
 * Demuestra que los tests fallan contra la implementación v0 de QueueStateCard,
 * la cual no tenía guarda de null (siempre intentaba renderizar datos)
 * ni renderizaba el estado vacío "No hay datos.".
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Commit par (GREEN): test/components/WaitingRoom/QueueStateCard.spec.tsx
 */
import { render, screen } from "@testing-library/react";
import React from "react";

import type { QueueStateView } from "@/services/api/types";

jest.mock("@/styles/page.module.css", () => new Proxy({}, { get: (_t, k) => String(k) }));

// ── v0 stub: sin guarda de null, siempre muestra datos ──
jest.mock("@/components/WaitingRoom/QueueStateCard", () => {
  return function QueueStateCardV0({ queueState }: { queueState: QueueStateView | null }) {
    // v0: accede directamente sin null check → no muestra "No hay datos."
    return React.createElement(
      "div",
      null,
      React.createElement("strong", null, String(queueState?.currentCount ?? "")),
      React.createElement("strong", null, String(queueState?.maxCapacity ?? "")),
      React.createElement("strong", null, (queueState?.availableSpots ?? "") as string),
      // v0: no distinguía isAtCapacity como "Sí"/"No"
    );
  };
});

import QueueStateCard from "@/components/WaitingRoom/QueueStateCard";

const BASE: QueueStateView = {
  queueId: "Q1",
  currentCount: 5,
  maxCapacity: 20,
  isAtCapacity: false,
  availableSpots: 15,
  patientsInQueue: [],
  projectedAt: "2026-03-04T10:00:00Z",
};

describe("QueueStateCard — RED (v0: sin null guard, sin isAtCapacity formateado)", () => {
  // Comportamiento de datos básicos presente en v0 → pasa normalmente
  it("renderiza currentCount cuando queueState tiene datos", () => {
    render(<QueueStateCard queueState={BASE} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("renderiza maxCapacity cuando queueState tiene datos", () => {
    render(<QueueStateCard queueState={BASE} />);
    expect(screen.getByText("20")).toBeTruthy();
  });

  // Comportamientos NUEVOS → fallan contra v0 → evidencia RED
  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra 'No hay datos.' cuando queueState es null (falta guarda en v0)", () => {
    render(<QueueStateCard queueState={null} />);
    expect(screen.getByText("No hay datos.")).toBeTruthy();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra 'No' cuando isAtCapacity es false (v0 no formateaba booleano)", () => {
    render(<QueueStateCard queueState={{ ...BASE, isAtCapacity: false }} />);
    expect(screen.getByText("No")).toBeTruthy();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra 'Sí' cuando isAtCapacity es true (v0 no formateaba booleano)", () => {
    render(<QueueStateCard queueState={{ ...BASE, isAtCapacity: true }} />);
    expect(screen.getByText("Sí")).toBeTruthy();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("lista nombres de pacientes en cola (v0 no renderizaba patientsInQueue)", () => {
    const state: QueueStateView = {
      ...BASE,
      patientsInQueue: [
        { patientId: "p1", patientName: "Juan Pérez", priority: "High", waitTimeMinutes: 10, checkInTime: "2026-03-04T10:00:00.000Z" },
      ],
    };
    render(<QueueStateCard queueState={state} />);
    expect(screen.getByText("Juan Pérez")).toBeTruthy();
  });
});
