import { render, screen } from "@testing-library/react";
import React from "react";

// ── mocks globales ──────────────────────────────────────────────────────────
/**
 * React.use(promise) suspende hasta que la promesa resuelve, lo que genera
 * cuelgues en Jest. Lo reemplazamos por una versión síncrona que lee el valor
 * ya resuelto de la promesa (sólo para promesas ya resueltas, como las de test).
 */
/** Datos mutables para controlar el estado del hook por test */
let mockParams: { serviceId: string };

jest.spyOn(React, "use").mockImplementation((_: unknown) => mockParams as any);

let mockFullState: import("@/services/api/types").AtencionFullStateView | null = null;
let mockConnectionState: string = "online";
let mockLastUpdated: string | null = null;

jest.mock("@/hooks/useAtencion", () => ({
  useAtencion: () => ({
    monitor: null,
    queueState: null,
    fullState: mockFullState,
    nextTurn: null,
    history: [],
    connectionState: mockConnectionState,
    lastUpdated: mockLastUpdated,
    refresh: jest.fn(),
    setMonitor: jest.fn(),
    setQueueState: jest.fn(),
    setFullState: jest.fn(),
    setNextTurn: jest.fn(),
  }),
}));

import MonitorPage from "@/app/monitor/[serviceId]/page";

// ── helper ────────────────────────────────────────────────────────────────────
function renderMonitor(serviceId = "QUEUE-DISP") {
  mockParams = { serviceId };
  // No se necesita Suspense: React.use está interceptado y es síncrono
  return render(<MonitorPage params={Promise.resolve({ serviceId })} />);
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("MonitorPage — RED", () => {
  beforeEach(() => {
    mockParams = { serviceId: "QUEUE-DISP" };
    mockFullState = null;
    mockConnectionState = "online";
    mockLastUpdated = null;
  });

  // ── 1. serviceId en el footer ─────────────────────────────────────────
  it("muestra el serviceId en el footer", () => {
    renderMonitor("QUEUE-DISP");
    expect(screen.getByText("ID Servicio: QUEUE-DISP")).toBeInTheDocument();
  });

  // ── 2. Estado vacío en espera ──────────────────────────────────────────
  it("muestra 'No hay turnos en espera' cuando fullState es null", () => {
    mockFullState = null;
    renderMonitor();
    expect(screen.getByText(/No hay turnos en espera/i)).toBeInTheDocument();
  });

  // ── 3. Nombre del paciente en consulta ─────────────────────────────────
  it("muestra el nombre del paciente en la columna En Consulta", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: [],
      inConsultation: [
        {
          serviceId: "QUEUE-DISP",
          patientId: "P1",
          patientName: "Laura Medina",
          turnNumber: 1,
          priority: "High",
          consultationType: "General",
          status: "in-consultation",
          claimedAt: null,
          calledAt: new Date().toISOString(),
          stationId: null,
          projectedAt: new Date().toISOString(),
        },
      ],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    expect(screen.getByText("Laura Medina")).toBeInTheDocument();
  });

  // ── 4. Consultorio destino ────────────────────────────────────────────
  it("muestra el stationId cuando el turno incluye stationId", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: [],
      inConsultation: [
        {
          serviceId: "QUEUE-DISP",
          patientId: "P1",
          patientName: "Carlos Ruiz",
          turnNumber: 1,
          priority: "High",
          consultationType: "General",
          status: "in-consultation",
          claimedAt: null,
          calledAt: new Date().toISOString(),
          stationId: "CONS-03",
          projectedAt: new Date().toISOString(),
        },
      ],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    expect(screen.getByText(/CONS-03/)).toBeInTheDocument();
  });

  // ── 5. 'LLAMANDO' si stationId ausente ────────────────────────────────────
  it("muestra 'LLAMANDO' si stationId es null en la columna En Consulta", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: [],
      inConsultation: [
        {
          serviceId: "QUEUE-DISP",
          patientId: "P1",
          patientName: "Ana Torres",
          turnNumber: 1,
          priority: "Medium",
          consultationType: "General",
          status: "in-consultation",
          claimedAt: null,
          calledAt: new Date().toISOString(),
          stationId: null,
          projectedAt: new Date().toISOString(),
        },
      ],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    expect(screen.getByText("LLAMANDO")).toBeInTheDocument();
  });

  // ── 6. Lista vacía en espera ────────────────────────────────────────────────
  it("muestra el mensaje vacío cuando no hay pacientes en espera", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: [],
      inConsultation: [],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    expect(screen.getByText(/No hay turnos en espera/i)).toBeInTheDocument();
  });

  // ── 7. Pacientes en la columna En Consulta ─────────────────────────────────
  it("renderiza los pacientes de la columna En Consulta", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: [],
      inConsultation: [
        {
          serviceId: "QUEUE-DISP",
          patientId: "P1",
          patientName: "Mario López",
          turnNumber: 1,
          priority: "High",
          consultationType: "General",
          status: "in-consultation",
          claimedAt: null,
          calledAt: new Date().toISOString(),
          stationId: null,
          projectedAt: new Date().toISOString(),
        },
        {
          serviceId: "QUEUE-DISP",
          patientId: "P2",
          patientName: "Sofía Vargas",
          turnNumber: 2,
          priority: "Medium",
          consultationType: "General",
          status: "in-consultation",
          claimedAt: null,
          calledAt: new Date().toISOString(),
          stationId: null,
          projectedAt: new Date().toISOString(),
        },
      ],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    expect(screen.getByText("Mario López")).toBeInTheDocument();
    expect(screen.getByText("Sofía Vargas")).toBeInTheDocument();
  });

  // ── 8. Límite de 10 slots en espera ──────────────────────────────────────────
  it("limita la lista de espera a 10 pacientes como máximo", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: Array.from({ length: 12 }, (_, i) => ({
        patientId: `P${i}`,
        patientName: `Paciente ${i + 1}`,
        priority: "Low",
        checkInTime: new Date().toISOString(),
        waitTimeMinutes: 0,
        turnNumber: i + 1,
      })),
      inConsultation: [],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`#${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("#11")).not.toBeInTheDocument();
    expect(screen.queryByText("#12")).not.toBeInTheDocument();
  });

  // ── 9. Orden de la lista ──────────────────────────────────────────────────
  it("renderiza la lista de espera en el orden recibido del hook", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: [
        { patientId: "P1", patientName: "Primero en cola",  priority: "Urgent", checkInTime: new Date().toISOString(), waitTimeMinutes: 0, turnNumber: 10 },
        { patientId: "P2", patientName: "Segundo en cola",  priority: "High",   checkInTime: new Date().toISOString(), waitTimeMinutes: 0, turnNumber: 20 },
        { patientId: "P3", patientName: "Tercero en cola",  priority: "Low",    checkInTime: new Date().toISOString(), waitTimeMinutes: 0, turnNumber: 30 },
      ],
      inConsultation: [],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("#10");
    expect(items[1]).toHaveTextContent("#20");
    expect(items[2]).toHaveTextContent("#30");
  });

  // ── 10-11. Footer: hora de última actualización ───────────────────────────
  it.each([
    { lastUpdated: "2026-03-02T10:30:00Z", containsPlaceholder: false, label: "muestra hora real cuando lastUpdated no es null" },
    { lastUpdated: null,                   containsPlaceholder: true,  label: "muestra '...' cuando lastUpdated es null" },
  ])("$label", ({ lastUpdated, containsPlaceholder }) => {
    mockLastUpdated = lastUpdated;
    renderMonitor();
    const footer = screen.getByText(/Actualización:/i);
    if (containsPlaceholder) {
      expect(footer.textContent).toContain("...");
    } else {
      expect(footer.textContent).not.toContain("...");
    }
  });

  // ── 12. Prioridad visible en cada slot ─────────────────────────────────
  it("muestra la prioridad de cada paciente en la lista de espera", () => {
    mockFullState = {
      serviceId: "QUEUE-DISP",
      waiting: [
        { patientId: "P1", patientName: "Paciente Urgente", priority: "Urgent", checkInTime: new Date().toISOString(), waitTimeMinutes: 0, turnNumber: 1 },
      ],
      inConsultation: [],
      waitingPayment: [],
      projectedAt: new Date().toISOString(),
    };
    renderMonitor();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });
});
