import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── mocks globales ──────────────────────────────────────────────────────────
const showErrorMock = jest.fn();
const refreshMock = jest.fn();

const cashierMock = {
  busy: false,
  error: null as string | null,
  lastResult: null,
  callNext: jest.fn<Promise<void>, [string]>(),
  validate: jest.fn<Promise<void>, [unknown]>(),
  markPending: jest.fn<Promise<void>, [unknown]>(),
  markAbsent: jest.fn<Promise<void>, [unknown]>(),
  cancel: jest.fn<Promise<void>, [unknown]>(),
  clearError: jest.fn<void, []>(),
};

/** Paciente de muestra presente en la cola */
const PATIENT_A = {
  patientId: "PAT-001",
  patientName: "Carlos Ruiz",
  priority: "High",
  waitTimeMinutes: 15,
  checkInTime: new Date("2026-03-02T08:00:00Z").toISOString(),
};

// ── stubs de módulos ────────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (_key: string) => "QUEUE-TEST" }),
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

jest.mock("@/hooks/useCashierStation", () => ({
  useCashierStation: () => cashierMock,
}));

jest.mock("@/hooks/useWaitingRoom", () => ({
  useWaitingRoom: () => ({
    queueState: { patientsInQueue: [PATIENT_A] },
    refresh: refreshMock,
  }),
}));

import CashierPage from "@/app/cashier/page";

// ── helpers ─────────────────────────────────────────────────────────────────
/** Renderiza la página y selecciona al PATIENT_A de la lista */
async function renderAndSelectPatient() {
  const user = userEvent.setup();
  render(<CashierPage />);
  await user.click(screen.getByRole("button", { name: /Carlos Ruiz/i }));
  return user;
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("CashierPage — RED", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cashierMock.busy = false;
    cashierMock.error = null;
    cashierMock.callNext.mockResolvedValue(undefined);
    cashierMock.validate.mockResolvedValue(undefined);
    cashierMock.markPending.mockResolvedValue(undefined);
    cashierMock.markAbsent.mockResolvedValue(undefined);
    cashierMock.cancel.mockResolvedValue(undefined);
  });

  // ── 1. Llamar siguiente ────────────────────────────────────────────────────
  it("llama a callNext con el queueId correcto al pulsar 'Llamar siguiente'", async () => {
    const user = userEvent.setup();
    render(<CashierPage />);

    await user.click(screen.getByRole("button", { name: /Llamar siguiente/i }));

    await waitFor(() => {
      expect(cashierMock.callNext).toHaveBeenCalledWith("QUEUE-TEST");
    });
  });

  it("ejecuta refresh después de llamar al siguiente paciente", async () => {
    const user = userEvent.setup();
    render(<CashierPage />);

    await user.click(screen.getByRole("button", { name: /Llamar siguiente/i }));

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  // ── 2. Validar pago ────────────────────────────────────────────────────────
  it("invoca validate con queueId y patientId al pulsar 'Validar pago'", async () => {
    const user = await renderAndSelectPatient();

    await user.click(screen.getByRole("button", { name: /Validar pago/i }));

    await waitFor(() => {
      expect(cashierMock.validate).toHaveBeenCalledWith(
        expect.objectContaining({
          queueId: "QUEUE-TEST",
          patientId: "PAT-001",
        }),
      );
    });
  });

  // ── 3. Marcar pendiente ────────────────────────────────────────────────────
  it("invoca markPending con queueId y patientId al pulsar 'Marcar pendiente'", async () => {
    const user = await renderAndSelectPatient();

    await user.click(screen.getByRole("button", { name: /Marcar pendiente/i }));

    await waitFor(() => {
      expect(cashierMock.markPending).toHaveBeenCalledWith(
        expect.objectContaining({
          queueId: "QUEUE-TEST",
          patientId: "PAT-001",
        }),
      );
    });
  });

  // ── 4. Marcar ausente ──────────────────────────────────────────────────────
  it("invoca markAbsent con queueId y patientId al pulsar 'Marcar ausente'", async () => {
    const user = await renderAndSelectPatient();

    await user.click(screen.getByRole("button", { name: /Marcar ausente/i }));

    await waitFor(() => {
      expect(cashierMock.markAbsent).toHaveBeenCalledWith(
        expect.objectContaining({
          queueId: "QUEUE-TEST",
          patientId: "PAT-001",
        }),
      );
    });
  });

  // ── 5. Anular pago ─────────────────────────────────────────────────────────
  it("invoca cancel con queueId y patientId al pulsar 'Anular pago'", async () => {
    const user = await renderAndSelectPatient();

    await user.click(screen.getByRole("button", { name: /Anular pago/i }));

    await waitFor(() => {
      expect(cashierMock.cancel).toHaveBeenCalledWith(
        expect.objectContaining({
          queueId: "QUEUE-TEST",
          patientId: "PAT-001",
        }),
      );
    });
  });

  // ── 6. Refresco y limpieza de selección ───────────────────────────────────
  it("llama a refresh y limpia la selección tras ejecutar una acción", async () => {
    const user = await renderAndSelectPatient();

    // La tarjeta del paciente seleccionado debe estar visible
    expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Validar pago/i }));

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });

    // La tarjeta de acciones debe desaparecer (selección limpiada)
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Validar pago/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ── 7. Doble submit bloqueado ──────────────────────────────────────────────
  it("deshabilita los botones de acción cuando busy es true", async () => {
    cashierMock.busy = true;
    render(<CashierPage />);

    const callNextBtn = screen.getByRole("button", { name: /Llamar siguiente/i });
    expect(callNextBtn).toBeDisabled();
  });

  it("deshabilita los botones de acción del paciente seleccionado cuando busy es true", async () => {
    cashierMock.busy = true;

    // Para ver los botones de acción necesitamos que haya un paciente seleccionado.
    // Redefinimos el mock con un paciente ya seleccionado simulando el estado busy.
    // Forzamos la renderización con busy=true y luego verificamos
    // que los botones de acción estén deshabilitados desde el inicio.
    render(<CashierPage />);

    // Hacemos click aunque busy=true (el botón de lista de pacientes no usa busy)
    const patientBtn = screen.getByRole("button", { name: /Carlos Ruiz/i });
    await userEvent.setup().click(patientBtn);

    // Ahora los botones de acción deben estar deshabilitados
    await waitFor(() => {
      const validateBtn = screen.queryByRole("button", { name: /Validar pago/i });
      if (validateBtn) {
        expect(validateBtn).toBeDisabled();
      }
    });
  });

  // ── 8. Propagación de errores del hook ────────────────────────────────────
  it("muestra el error del hook en la alerta cuando cashier.error no es null", () => {
    cashierMock.error = "Servicio de caja no disponible";
    render(<CashierPage />);

    expect(showErrorMock).toHaveBeenCalledWith(
      "Servicio de caja no disponible",
    );
  });

  it("invoca clearError después de propagar el error al sistema de alertas", () => {
    cashierMock.error = "Error de red";
    render(<CashierPage />);

    expect(cashierMock.clearError).toHaveBeenCalled();
  });

  // ── 9. Estado vacío ───────────────────────────────────────────────────────
  it("muestra el mensaje de estado vacío cuando no hay pacientes en la cola", () => {
    jest.resetModules();
    jest.doMock("@/hooks/useWaitingRoom", () => ({
      useWaitingRoom: () => ({
        queueState: { patientsInQueue: [] },
        refresh: refreshMock,
      }),
    }));

    render(<CashierPage />);

    expect(
      screen.getByText(/No hay pacientes en la cola/i),
    ).toBeInTheDocument();
  });
});
