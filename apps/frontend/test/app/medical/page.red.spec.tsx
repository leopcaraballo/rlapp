import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── mocks globales ──────────────────────────────────────────────────────────
const showErrorMock = jest.fn();

const medicalMock = {
  busy: false,
  error: null as string | null,
  lastResult: null,
  claim: jest.fn<Promise<void>, [unknown]>(),
  call: jest.fn<Promise<void>, [unknown]>(),
  complete: jest.fn<Promise<void>, [unknown]>(),
  markAbsent: jest.fn<Promise<void>, [unknown]>(),
  clearError: jest.fn<void, []>(),
};

const roomsMock = {
  busy: false,
  error: null as string | null,
  activate: jest.fn<void, [string, string]>(),
  deactivate: jest.fn<void, [string, string]>(),
};

// ── stubs de módulos ────────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "queue" ? "QUEUE-MED" : null) }),
}));

jest.mock("@/config/env", () => ({
  env: { DEFAULT_QUEUE_ID: "QUEUE-01" },
}));

jest.mock("@/context/AlertContext", () => ({
  useAlert: () => ({
    showError: showErrorMock,
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
  }),
}));

jest.mock("@/hooks/useMedicalStation", () => ({
  useMedicalStation: () => medicalMock,
}));

jest.mock("@/hooks/useConsultingRooms", () => ({
  useConsultingRooms: () => roomsMock,
}));

jest.mock("@/hooks/useAtencion", () => ({
  useAtencion: () => ({
    monitor: null,
    queueState: { serviceId: "Q1", patientsInQueue: [], currentCount: 0, maxCapacity: 10, availableSpots: 10 },
    fullState: null,
    nextTurn: null,
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

// ── tipos de prueba ──────────────────────────────────────────────────────────
/** Fila para el it.each de acciones con patientId */
type ActionRow = [RegExp, keyof typeof medicalMock, { outcome?: string }];

// ── helpers ─────────────────────────────────────────────────────────────────
/**
 * Rellena los campos de estación y consulta antes de pulsar una acción.
 * NOTA: usa `^Ancla$` en botones compartiendo prefijo (p. ej. "Activar" vs "Desactivar").
 */
async function fillStation(
  user: ReturnType<typeof userEvent.setup>,
  { stationId = "CONS-01", patientId = "", outcome = "" } = {},
) {
  // Seleccionar consultorio
  await user.selectOptions(screen.getByLabelText(/Consultorio/i), stationId);

  // ID de paciente (siempre limpiar; escribir solo si se provee)
  await user.clear(screen.getByLabelText(/ID de paciente/i));
  if (patientId) await user.type(screen.getByLabelText(/ID de paciente/i), patientId);

  // Resultado (siempre limpiar; escribir solo si se provee)
  await user.clear(screen.getByLabelText(/Resultado/i));
  if (outcome) await user.type(screen.getByLabelText(/Resultado/i), outcome);
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("MedicalPage — RED", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    medicalMock.busy = false;
    medicalMock.error = null;
    roomsMock.busy = false;
    roomsMock.error = null;
    medicalMock.claim.mockResolvedValue(undefined);
    medicalMock.call.mockResolvedValue(undefined);
    medicalMock.complete.mockResolvedValue(undefined);
    medicalMock.markAbsent.mockResolvedValue(undefined);
  });

  // ── 1. claim con queueId y stationId ──────────────────────────────────────
  it("invoca claim con queueId y stationId al pulsar 'Llamar siguiente'", async () => {
    const user = userEvent.setup();
    render(<MedicalPage />);
    await fillStation(user, { stationId: "CONS-01" });

    await user.click(screen.getByRole("button", { name: /Llamar siguiente/i }));

    await waitFor(() => {
      expect(medicalMock.claim).toHaveBeenCalledWith(
        expect.objectContaining({ queueId: "QUEUE-MED", stationId: null }),
      );
    });
  });

  // ── 2-3-5. Acciones con patientId (parametrizado) ─────────────────────────
  it.each([
    [/Iniciar consulta/i,   "call"       as const, { outcome: undefined }],
    [/Finalizar consulta/i, "complete"   as const, { outcome: "Alta médica" }],
    [/Marcar ausente/i,     "markAbsent" as const, { outcome: undefined }],
  ] as ActionRow[])(
    "invoca el método del hook al pulsar %p",
    async (btnRegex, method, extras) => {
      const hookMethod = medicalMock[method] as jest.Mock;
      const user = userEvent.setup();
      render(<MedicalPage />);
      await fillStation(user, { patientId: "PAT-MED-01", outcome: extras.outcome ?? "" });

      await user.click(screen.getByRole("button", { name: btnRegex }));

      await waitFor(() => {
        expect(hookMethod).toHaveBeenCalledWith(
          expect.objectContaining({ queueId: "QUEUE-MED", patientId: "PAT-MED-01" }),
        );
      });
    },
  );

  // ── 4. complete envía outcome: null cuando el campo queda vacío ───────────
  it("complete envía outcome null cuando el campo resultado está vacío", async () => {
    const user = userEvent.setup();
    render(<MedicalPage />);
    await fillStation(user, { patientId: "PAT-MED-01", outcome: "" });

    await user.click(screen.getByRole("button", { name: /Finalizar consulta/i }));

    await waitFor(() => {
      expect(medicalMock.complete).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: null }),
      );
    });
  });

  // ── 6-7-8. Guard: showError si patientId vacío (parametrizado) ────────────
  it.each([
    [/Iniciar consulta/i],
    [/Finalizar consulta/i],
    [/Marcar ausente/i],
  ] as [RegExp][])(
    "muestra error de validación si patientId está vacío al pulsar %p",
    async (btnRegex) => {
      const user = userEvent.setup();
      render(<MedicalPage />);
      // fillStation sin patientId → campo queda vacío (default "")
      await fillStation(user);

      await user.click(screen.getByRole("button", { name: btnRegex }));

      await waitFor(() => {
        expect(showErrorMock).toHaveBeenCalledWith(
          expect.stringMatching(/paciente/i),
        );
      });
    },
  );

  // ── 9. Todos los botones disabled cuando busy === true ────────────────────
  it("deshabilita todos los botones de acción cuando busy es true", () => {
    medicalMock.busy = true;
    render(<MedicalPage />);

    const actionButtons = [
      /Llamar siguiente/i,
      /^Activar estación$/i,
      /Desactivar estación/i,
      /Iniciar consulta/i,
      /Finalizar consulta/i,
      /Marcar ausente/i,
    ];

    for (const name of actionButtons) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  // ── 10. Propagación de medical.error ──────────────────────────────────────
  it("propaga medical.error al sistema de alertas", () => {
    medicalMock.error = "Servicio médico no disponible";
    render(<MedicalPage />);

    expect(showErrorMock).toHaveBeenCalledWith("Servicio médico no disponible");
  });

  // ── 11. Propagación de rooms.error ────────────────────────────────────────
  it("propaga rooms.error al sistema de alertas", () => {
    roomsMock.error = "Error al activar consultorio";
    render(<MedicalPage />);

    expect(showErrorMock).toHaveBeenCalledWith("Error al activar consultorio");
  });

  // ── 12. queueId inicializado desde query param ────────────────────────────
  it("inicializa queueId desde el query param ?queue=", () => {
    render(<MedicalPage />);

    const queueInput = screen.getByLabelText(/Cola/i) as HTMLInputElement;
    expect(queueInput.value).toBe("QUEUE-MED");
  });
});
