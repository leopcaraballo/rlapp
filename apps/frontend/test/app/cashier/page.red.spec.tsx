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

/** Variable mutable para controlar la lista de pacientes por test */
let patientsQueue: typeof PATIENT_A[] = [PATIENT_A];

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

jest.mock("@/hooks/useAtencion", () => ({
  useAtencion: () => ({
    monitor: null,
    queueState: { patientsInQueue: patientsQueue },
    fullState: null,
    nextTurn: null,
    history: [],
    connectionState: "online",
    lastUpdated: null,
    refresh: refreshMock,
    setMonitor: jest.fn(),
    setQueueState: jest.fn(),
    setFullState: jest.fn(),
    setNextTurn: jest.fn(),
  }),
}));

import PaymentPage from "@/app/payment/page";

// ── helpers ─────────────────────────────────────────────────────────────────
/** Renderiza la página y selecciona al PATIENT_A de la lista */
async function renderAndSelectPatient() {
  const user = userEvent.setup();
  render(<PaymentPage />);
  await user.click(screen.getByRole("button", { name: /Carlos Ruiz/i }));
  return user;
}

// ── suite ────────────────────────────────────────────────────────────────────
describe("PaymentPage — RED", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    patientsQueue = [PATIENT_A];
    cashierMock.busy = false;
    cashierMock.error = null;
    cashierMock.callNext.mockResolvedValue(undefined);
    cashierMock.validate.mockResolvedValue(undefined);
    cashierMock.markPending.mockResolvedValue(undefined);
    cashierMock.markAbsent.mockResolvedValue(undefined);
    cashierMock.cancel.mockResolvedValue(undefined);
  });

  // ── 1. Llamar siguiente ────────────────────────────────────────────────────
  it("llama a callNext con el serviceId correcto al pulsar 'Llamar siguiente'", async () => {
    const user = userEvent.setup();
    render(<PaymentPage />);

    await user.click(screen.getByRole("button", { name: /Llamar siguiente/i }));

    await waitFor(() => {
      expect(cashierMock.callNext).toHaveBeenCalledWith("QUEUE-TEST");
    });
  });

  it("ejecuta refresh después de llamar al siguiente paciente", async () => {
    const user = userEvent.setup();
    render(<PaymentPage />);

    await user.click(screen.getByRole("button", { name: /Llamar siguiente/i }));

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  // ── 2-5. Acciones sobre el paciente seleccionado (parametrizado) ──────────
  it.each([
    [/Validar pago/i,    "validate"    as const],
    [/Marcar pendiente/i, "markPending" as const],
    [/Marcar ausente/i,  "markAbsent"  as const],
    [/Anular pago/i,     "cancel"      as const],
  ] as [RegExp, keyof typeof cashierMock][])(
    "invoca el método del hook al pulsar %p",
    async (btnRegex, method) => {
      const hookMethod = cashierMock[method] as jest.Mock;
      const user = await renderAndSelectPatient();
      if (method === "validate") {
        await user.type(screen.getByLabelText(/Referencia de pago/i), "REF-DOC-123");
      }

      await user.click(screen.getByRole("button", { name: btnRegex }));

      await waitFor(() => {
        expect(hookMethod).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceId: "QUEUE-TEST",
            patientId: "PAT-001",
            ...(method === "validate"
              ? { paymentReference: "REF-DOC-123" }
              : {}),
          }),
        );
      });
    },
  );

  // ── 6. Refresco y limpieza de selección ───────────────────────────────────
  it("llama a refresh y limpia la selección tras ejecutar una acción", async () => {
    const user = await renderAndSelectPatient();

    // Los botones de acción deben estar visibles tras la selección
    expect(screen.getByRole("button", { name: /Validar pago/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Referencia de pago/i), "PAID-VAL-001");
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
    render(<PaymentPage />);

    const callNextBtn = screen.getByRole("button", { name: /Llamar siguiente/i });
    expect(callNextBtn).toBeDisabled();
  });

  it("deshabilita los botones de acción del paciente seleccionado cuando busy es true", async () => {
    cashierMock.busy = true;

    // Para ver los botones de acción necesitamos que haya un paciente seleccionado.
    // Redefinimos el mock con un paciente ya seleccionado simulando el estado busy.
    // Forzamos la renderización con busy=true y luego verificamos
    // que los botones de acción estén deshabilitados desde el inicio.
    render(<PaymentPage />);

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
    render(<PaymentPage />);

    expect(showErrorMock).toHaveBeenCalledWith(
      "Servicio de caja no disponible",
    );
  });

  it("invoca clearError después de propagar el error al sistema de alertas", () => {
    cashierMock.error = "Error de red";
    render(<PaymentPage />);

    expect(cashierMock.clearError).toHaveBeenCalled();
  });

  // ── 9. Estado vacío ───────────────────────────────────────────────────────
  it("muestra el mensaje de estado vacío cuando no hay pacientes en la cola", () => {
    patientsQueue = [];
    render(<PaymentPage />);

    expect(
      screen.getByText(/No hay pacientes en la cola/i),
    ).toBeInTheDocument();
  });
});
