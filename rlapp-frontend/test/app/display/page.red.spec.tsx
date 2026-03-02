import { act, render, screen } from "@testing-library/react";
import React, { Suspense } from "react";

// ── mocks globales ──────────────────────────────────────────────────────────
/**
 * React.use(promise) suspende hasta que la promesa resuelve, lo que genera
 * cuelgues en Jest. Lo reemplazamos por una versión síncrona que lee el valor
 * ya resuelto de la promesa (sólo para promesas ya resueltas, como las de test).
 */
/** Datos mutables para controlar el estado del hook por test */
let mockParams: { queueId: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.spyOn(React, "use").mockImplementation((_: unknown) => mockParams as any);

let mockNextTurn: { patientName: string; stationId?: string } | null = null;
let mockPatientsInQueue: { patientId: string; patientName: string; priority: string }[] = [];
let mockLastUpdated: string | null = null;

jest.mock("@/hooks/useWaitingRoom", () => ({
  useWaitingRoom: () => ({
    nextTurn: mockNextTurn,
    queueState: { patientsInQueue: mockPatientsInQueue },
    lastUpdated: mockLastUpdated,
    refresh: jest.fn(),
  }),
}));

import DisplayPage from "@/app/display/[queueId]/page";

// ── helper ────────────────────────────────────────────────────────────────────
function renderDisplay(queueId = "QUEUE-DISP") {
  mockParams = { queueId };
  // No se necesita Suspense: React.use está interceptado y es síncrono
  return render(<DisplayPage params={Promise.resolve({ queueId })} />);
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("DisplayPage — RED", () => {
  beforeEach(() => {
    mockParams = { queueId: "QUEUE-DISP" };
    mockNextTurn = null;
    mockPatientsInQueue = [];
    mockLastUpdated = null;
  });

  // ── 1. queueId en la cabecera ─────────────────────────────────────────
  it("muestra el queueId en la cabecera", () => {
    renderDisplay("QUEUE-DISP");
    expect(screen.getByText("QUEUE-DISP")).toBeInTheDocument();
  });

  // ── 2. Sin turno activo ──────────────────────────────────────────────
  it("muestra 'Sin turno activo' cuando nextTurn es null", () => {
    mockNextTurn = null;
    renderDisplay();
    expect(screen.getByText(/Sin turno activo/i)).toBeInTheDocument();
  });

  // ── 3. Nombre del paciente llamado ─────────────────────────────────
  it("muestra el nombre del paciente cuando hay un turno activo", () => {
    mockNextTurn = { patientName: "Laura Medina" };
    renderDisplay();
    expect(screen.getByText("Laura Medina")).toBeInTheDocument();
  });

  // ── 4. Consultorio destino ────────────────────────────────────────────
  it("muestra el consultorio cuando el turno incluye stationId", () => {
    mockNextTurn = { patientName: "Carlos Ruiz", stationId: "CONS-03" };
    renderDisplay();
    expect(screen.getByText(/CONS-03/)).toBeInTheDocument();
  });

  // ── 5. Sin consultorio si stationId ausente ────────────────────────────
  it("no muestra la línea de consultorio si el turno no tiene stationId", () => {
    mockNextTurn = { patientName: "Ana Torres" };
    renderDisplay();
    expect(screen.queryByText(/Diríjase al consultorio/i)).not.toBeInTheDocument();
  });

  // ── 6. Lista vacía ──────────────────────────────────────────────────────
  it("muestra el mensaje vacío cuando no hay pacientes en espera", () => {
    mockPatientsInQueue = [];
    renderDisplay();
    expect(screen.getByText(/No hay pacientes en espera/i)).toBeInTheDocument();
  });

  // ── 7. Pacientes en la lista ───────────────────────────────────────────
  it("renderiza los pacientes de la cola en la lista de espera", () => {
    mockPatientsInQueue = [
      { patientId: "P1", patientName: "Mario López", priority: "High" },
      { patientId: "P2", patientName: "Sofía Vargas", priority: "Medium" },
    ];
    renderDisplay();
    expect(screen.getByText("Mario López")).toBeInTheDocument();
    expect(screen.getByText("Sofía Vargas")).toBeInTheDocument();
  });

  // ── 8. Límite de 8 slots ──────────────────────────────────────────────────
  it("limita la lista de espera a 8 pacientes como máximo", () => {
    mockPatientsInQueue = Array.from({ length: 10 }, (_, i) => ({
      patientId: `P${i}`,
      patientName: `Paciente ${i + 1}`,
      priority: "Low",
    }));
    renderDisplay();
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`Paciente ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("Paciente 9")).not.toBeInTheDocument();
    expect(screen.queryByText("Paciente 10")).not.toBeInTheDocument();
  });

  // ── 9. Orden de la lista ──────────────────────────────────────────────────
  it("renderiza la lista en el orden recibido del hook", () => {
    mockPatientsInQueue = [
      { patientId: "P1", patientName: "Primero en cola", priority: "Urgent" },
      { patientId: "P2", patientName: "Segundo en cola", priority: "High" },
      { patientId: "P3", patientName: "Tercero en cola", priority: "Low" },
    ];
    renderDisplay();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Primero en cola");
    expect(items[1]).toHaveTextContent("Segundo en cola");
    expect(items[2]).toHaveTextContent("Tercero en cola");
  });

  // ── 10-11. Footer: hora de última actualización ───────────────────────────
  it.each([
    { lastUpdated: "2026-03-02T10:30:00Z", containsDash: false, label: "muestra hora real cuando lastUpdated no es null" },
    { lastUpdated: null,                   containsDash: true,  label: "muestra '—' cuando lastUpdated es null" },
  ])("$label", ({ lastUpdated, containsDash }) => {
    mockLastUpdated = lastUpdated;
    renderDisplay();
    const footer = screen.getByText(/Última actualización:/i);
    if (containsDash) {
      expect(footer.textContent).toContain("—");
    } else {
      expect(footer.textContent).not.toContain("—");
    }
  });

  // ── 12. Prioridad visible en cada slot ─────────────────────────────────
  it("muestra la prioridad de cada paciente en la lista de espera", () => {
    mockPatientsInQueue = [
      { patientId: "P1", patientName: "Paciente Urgente", priority: "Urgent" },
    ];
    renderDisplay();
    expect(screen.getByText("Paciente Urgente")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });
});
