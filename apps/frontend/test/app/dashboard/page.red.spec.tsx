import { render, screen } from "@testing-library/react";
import React from "react";

import type { Appointment } from "@/domain/Appointment";

// ── mock AudioService ────────────────────────────────────────────────────────
jest.mock("@/services/AudioService", () => ({
  audioService: {
    isEnabled: jest.fn(() => true),
    init: jest.fn(),
    unlock: jest.fn(),
    play: jest.fn(),
  },
}));

// ── mock useQueueAsAppointments ──────────────────────────────────────────────
let mockAppointments: Appointment[] = [];
let mockError: string | null = null;
let mockIsConnecting = false;

jest.mock("@/hooks/useQueueAsAppointments", () => ({
  useQueueAsAppointments: () => ({
    appointments: mockAppointments,
    error: mockError,
    isConnecting: mockIsConnecting,
    connectionStatus: "connected" as const,
  }),
}));

import DashboardPage from "@/app/dashboard/page";

// ── helper ────────────────────────────────────────────────────────────────────
function renderDashboard() {
  return render(<DashboardPage />);
}

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "APT-1",
    fullName: "Paciente Test",
    idCard: "12345",
    office: null,
    timestamp: Date.now(),
    status: "waiting",
    priority: "Medium",
    ...overrides,
  };
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("DashboardPage (CompletedHistoryDashboard) — RED", () => {
  beforeEach(() => {
    mockAppointments = [];
    mockError        = null;
    mockIsConnecting = false;
  });

  // ── 1. Título principal ───────────────────────────────────────────────────
  it("renderiza el título 'Panel de Turnos en Tiempo Real'", () => {
    renderDashboard();
    expect(
      screen.getByRole("heading", { level: 1, name: /Panel de Turnos en Tiempo Real/i }),
    ).toBeInTheDocument();
  });

  // ── 2. Sección "En consultorio" visible ───────────────────────────────────
  it("muestra la sección 'En consultorio'", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { name: /En consultorio/i })).toBeInTheDocument();
  });

  // ── 3. Sección "En espera" visible ───────────────────────────────────────
  it("muestra la sección 'En espera'", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { name: /En espera/i })).toBeInTheDocument();
  });

  // ── 4. Sección "Completados" visible (showCompleted=true) ─────────────────
  it("muestra la sección 'Completados' porque showCompleted es true", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { name: /Completados/i })).toBeInTheDocument();
  });

  // ── 5-7. Estados vacíos por sección ─────────────────────────────────────
  it.each([
    { label: "muestra empty state en 'En consultorio'",  text: "No hay turnos siendo atendidos" },
    { label: "muestra empty state en 'En espera'",       text: "No hay turnos en espera" },
    { label: "muestra empty state en 'Completados'",     text: "No hay turnos completados aún" },
  ])("$label cuando no hay citas", ({ text }) => {
    renderDashboard();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  // ── 8. isConnecting → oculta estados vacíos (muestra skeleton) ───────────
  it("oculta los mensajes de estado vacío mientras está conectando", () => {
    mockIsConnecting = true;
    renderDashboard();
    expect(screen.queryByText("No hay turnos siendo atendidos")).not.toBeInTheDocument();
    expect(screen.queryByText("No hay turnos en espera")).not.toBeInTheDocument();
  });

  // ── 9. Error de conexión ──────────────────────────────────────────────────
  it("muestra el mensaje de error cuando error no es null", () => {
    mockError = "No se pudo conectar al servidor";
    renderDashboard();
    expect(screen.getByText("No se pudo conectar al servidor")).toBeInTheDocument();
  });

  // ── 10-12. Citas por estado → fullName visible ────────────────────────────
  it.each([
    { status: "called"    as const, fullName: "María Camargo", label: "cita 'called' aparece en 'En consultorio'" },
    { status: "waiting"   as const, fullName: "Jorge Salinas", label: "cita 'waiting' aparece en 'En espera'" },
    { status: "completed" as const, fullName: "Ana Torres",    label: "cita 'completed' aparece en 'Completados'" },
  ])("$label", ({ status, fullName }) => {
    mockAppointments = [makeAppointment({ id: "A1", fullName, status })];
    renderDashboard();
    expect(screen.getByText(fullName)).toBeInTheDocument();
  });
});
