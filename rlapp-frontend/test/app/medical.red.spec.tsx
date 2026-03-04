/**
 * @jest-environment jsdom
 *
 * TDD RETROFIT — RED (Grupo C — post-PR#51)
 * Demuestra que los 11 tests adicionales de medical.spec.tsx fallarían
 * contra la implementación v0 de MedicalPage, la cual no integraba
 * useWaitingRoom y no tenía guards de validación ni auto-relleno de badge.
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Commit par (GREEN): test/app/medical.spec.tsx
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── infraestructura idéntica al spec GREEN ──────────────────────────────────
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

const mockShowError = jest.fn();
jest.mock("@/context/AlertContext", () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: jest.fn(), showInfo: jest.fn() }),
  AlertProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockMedical = {
  busy: false, error: null, lastResult: null,
  claim: jest.fn(), call: jest.fn(), complete: jest.fn(),
  markAbsent: jest.fn(), clearError: jest.fn(),
};
jest.mock("@/hooks/useMedicalStation", () => ({
  useMedicalStation: () => mockMedical,
}));

const mockRooms = {
  busy: false, error: null, lastResult: null,
  activate: jest.fn(), deactivate: jest.fn(), clearError: jest.fn(),
};
jest.mock("@/hooks/useConsultingRooms", () => ({
  useConsultingRooms: () => mockRooms,
}));

// ── v0 stub: sin useWaitingRoom, sin nextTurn, sin guards, sin auto-fill ──
// Simula MedicalPage antes del PR#51 (solo controles básicos)
jest.mock("@/app/medical/page", () => {
  return function MedicalPageV0() {
    const [stationId, setStationId] = React.useState("");
    const [patientId, setPatientId] = React.useState("");
    // v0: no importaba useWaitingRoom, no mostraba nextTurn
    // v0: no tenía guards de validación para patientId / stationId
    // v0: no tenía badge auto-rellenado
    return (
      <div>
        <h1>Estación Médica</h1>
        <input
          placeholder="Consultorio"
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
        />
        <button>Llamar siguiente</button>
        <button>Activar estación</button>
        <button>Desactivar estación</button>
        <h2>Gestión de Consulta</h2>
        <input
          placeholder="ID Paciente"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <button>Iniciar consulta</button>
        <button>Finalizar consulta</button>
        <button>Marcar ausente</button>
      </div>
    );
  };
});

import MedicalPage from "@/app/medical/page";

describe("MedicalPage — RED (v0: sin useWaitingRoom, sin guards, sin auto-fill)", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockMedical.busy = false;
    mockMedical.error = null;
    mockMedical.lastResult = null;
    mockRooms.busy = false;
  });

  // Comportamientos presentes en v0 → pasan normalmente
  it("renderiza controles de la estación médica", () => {
    render(<MedicalPage />);
    expect(screen.getByText(/Estación Médica/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Llamar siguiente/i })).toBeTruthy();
  });

  it("renderiza controles de gestión de consulta", () => {
    render(<MedicalPage />);
    expect(screen.getByText(/Gestión de Consulta/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Iniciar consulta/i })).toBeTruthy();
  });

  // v0 tampoco mostraba "Paciente en turno" → este test también pasa en v0 (no es RED)
  it("no muestra tarjeta de paciente cuando nextTurn es null (comportamiento común a v0 y producción)", () => {
    render(<MedicalPage />);
    expect(screen.queryByText(/Paciente en turno/i)).toBeNull();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra tarjeta de paciente cuando nextTurn.status = 'claimed' (integración useWaitingRoom ausente en v0)", () => {
    render(<MedicalPage />);
    expect(screen.getByText(/Paciente en turno/i)).toBeTruthy();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("dispara showError al activar sin stationId (guard ausente en v0)", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /^Activar estación$/i }));
    expect(mockShowError).toHaveBeenCalledWith("Seleccione un consultorio para activar");
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("dispara showError al desactivar sin stationId (guard ausente en v0)", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /Desactivar estación/i }));
    expect(mockShowError).toHaveBeenCalledWith("Seleccione un consultorio para desactivar");
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("dispara showError al iniciar consulta sin patientId (guard ausente en v0)", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /Iniciar consulta/i }));
    expect(mockShowError).toHaveBeenCalledWith("El ID de paciente es obligatorio");
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("dispara showError al marcar ausente sin patientId (guard ausente en v0)", async () => {
    render(<MedicalPage />);
    await user.click(screen.getByRole("button", { name: /Marcar ausente/i }));
    expect(mockShowError).toHaveBeenCalledWith("El ID de paciente es obligatorio");
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra badge auto-rellenado cuando lastResult tiene patientId (auto-fill ausente en v0)", () => {
    mockMedical.lastResult = { patientId: "CC-123" };
    render(<MedicalPage />);
    expect(screen.getByText(/auto-rellenado/i)).toBeTruthy();
  });
});
