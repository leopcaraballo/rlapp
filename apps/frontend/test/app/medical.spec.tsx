import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── mocks de infraestructura ─────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("@/config/env", () => ({
  env: {
    API_BASE_URL: "http://localhost:3000",
    POLLING_INTERVAL: 3000,
    WS_URL: null,
    WS_DISABLED: false,
    DEFAULT_QUEUE_ID: "QUEUE-01",
  },
}));

// ── mock useAlert ────────────────────────────────────────────────────────────
const mockShowError = jest.fn();
jest.mock("@/context/AlertContext", () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
  }),
  AlertProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── mock useMedicalStation ───────────────────────────────────────────────────
const mockMedical: {
  busy: boolean;
  error: string | null;
  lastResult: { patientId?: string; stationId?: string } | null;
  claim: jest.Mock;
  call: jest.Mock;
  complete: jest.Mock;
  markAbsent: jest.Mock;
  clearError: jest.Mock;
} = {
  busy: false,
  error: null,
  lastResult: null,
  claim: jest.fn(),
  call: jest.fn(),
  complete: jest.fn(),
  markAbsent: jest.fn(),
  clearError: jest.fn(),
};

jest.mock("@/hooks/useMedicalStation", () => ({
  useMedicalStation: () => mockMedical,
}));

// ── mock useConsultingRooms ──────────────────────────────────────────────────
const mockRooms: {
  busy: boolean;
  error: string | null;
  lastResult: null;
  activate: jest.Mock;
  deactivate: jest.Mock;
  clearError: jest.Mock;
} = {
  busy: false,
  error: null,
  lastResult: null,
  activate: jest.fn(),
  deactivate: jest.fn(),
  clearError: jest.fn(),
};

jest.mock("@/hooks/useConsultingRooms", () => ({
  useConsultingRooms: () => mockRooms,
}));

// ── mock useAtencion (agregado en PR#51) ───────────────────────────────────
import type { NextTurnView } from "@/services/api/types";

const mockNextTurn: { current: NextTurnView | null } = { current: null };

jest.mock("@/hooks/useAtencion", () => ({
  useAtencion: () => ({
    monitor: null,
    queueState: { serviceId: "Q1", patientsInQueue: [], currentCount: 0, maxCapacity: 10, availableSpots: 10 },
    fullState: null,
    nextTurn: mockNextTurn.current,
    history: [],
    connectionState: "online",
    lastUpdated: null,
    refresh: jest.fn(),
    setMonitor: jest.fn(),
    setQueueState: jest.fn(),
    setFullState: jest.fn(),
    setNextTurn: jest.fn(),
  }),
}));

import MedicalPage from "@/app/medical/page";

// ── helpers ──────────────────────────────────────────────────────────────────
function makeNextTurn(overrides: Partial<NextTurnView> = {}): NextTurnView {
  return {
    queueId: "QUEUE-01",
    patientId: "CC-001",
    patientName: "Juan Pérez",
    priority: "High",
    consultationType: "General",
    status: "claimed",
    claimedAt: new Date().toISOString(),
    calledAt: null,
    stationId: "CONS-01",
    projectedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── suite ─────────────────────────────────────────────────────────────────────
describe("MedicalPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNextTurn.current = null;
    mockMedical.busy = false;
    mockMedical.error = null;
    mockMedical.lastResult = null;
    mockRooms.busy = false;
  });

  // ── renderizado base ──────────────────────────────────────────────────────
  it("renderiza controles de la estación médica", () => {
    render(<MedicalPage />);
    expect(screen.getByText(/Estación Médica/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Llamar siguiente/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Activar estación$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Desactivar estación/i })).toBeTruthy();
  });

  it("renderiza controles de gestión de consulta", () => {
    render(<MedicalPage />);
    expect(screen.getByText(/Gestión de Consulta/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Iniciar consulta/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Finalizar consulta/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Marcar ausente/i })).toBeTruthy();
  });

  // ── paciente activo desde nextTurn (PR#51) ────────────────────────────────
  it("no muestra tarjeta de paciente activo cuando nextTurn es null", () => {
    render(<MedicalPage />);
    expect(screen.queryByText(/Paciente en turno/i)).toBeNull();
  });

  it("muestra tarjeta de paciente activo cuando nextTurn.status es 'claimed'", () => {
    mockNextTurn.current = makeNextTurn({ status: "claimed" });
    render(<MedicalPage />);
    expect(screen.getByText(/Paciente en turno/i)).toBeTruthy();
    expect(screen.getByText("Juan Pérez")).toBeTruthy();
    expect(screen.getByText("CC-001")).toBeTruthy();
  });

  it("muestra tarjeta cuando nextTurn.status es 'called'", () => {
    mockNextTurn.current = makeNextTurn({ status: "called" });
    render(<MedicalPage />);
    expect(screen.getByText(/Paciente en turno/i)).toBeTruthy();
  });

  it("no muestra tarjeta cuando nextTurn.status es 'waiting'", () => {
    mockNextTurn.current = makeNextTurn({ status: "waiting" });
    render(<MedicalPage />);
    expect(screen.queryByText(/Paciente en turno/i)).toBeNull();
  });

  // ── guards de validación ──────────────────────────────────────────────────
  it("muestra error al activar sin consultorio seleccionado", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /^Activar estación$/i }));
    expect(mockShowError).toHaveBeenCalledWith("Seleccione un consultorio para activar");
  });

  it("muestra error al desactivar sin consultorio seleccionado", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /Desactivar estación/i }));
    expect(mockShowError).toHaveBeenCalledWith("Seleccione un consultorio para desactivar");
  });

  it("muestra error al iniciar consulta sin ID de paciente", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /Iniciar consulta/i }));
    expect(mockShowError).toHaveBeenCalledWith("El ID de paciente es obligatorio");
  });

  it("muestra error al marcar ausente sin ID de paciente", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /Marcar ausente/i }));
    expect(mockShowError).toHaveBeenCalledWith("El ID de paciente es obligatorio");
  });

  // ── estado busy ───────────────────────────────────────────────────────────
  it("deshabilita los botones cuando busy es true", () => {
    mockMedical.busy = true;
    render(<MedicalPage />);
    expect(screen.getByRole("button", { name: /Llamar siguiente/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Iniciar consulta/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Finalizar consulta/i })).toBeDisabled();
  });

  // ── auto-relleno de badge (PR#51) ─────────────────────────────────────────
  it("muestra badge auto-rellenado cuando lastResult tiene patientId", () => {
    mockMedical.lastResult = { patientId: "CC-123" };
    render(<MedicalPage />);
    expect(screen.getByText(/auto-rellenado/i)).toBeTruthy();
  });
});
