import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const showErrorMock = jest.fn();
const mockRegisterReception = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("@/config/env", () => ({
  env: {
    DEFAULT_QUEUE_ID: "QUEUE-01",
  },
}));

jest.mock("@/context/AlertContext", () => ({
  useAlert: () => ({
    showError: showErrorMock,
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
  }),
}));

jest.mock("@/hooks/useAtencion", () => ({
  useAtencion: () => ({
    queueState: { serviceId: "QUEUE-01", patientsInQueue: [], currentCount: 0, maxCapacity: 10, availableSpots: 10 },
    monitor: null,
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

jest.mock("@/services/api/atencion", () => ({
  registerReception: (...args: unknown[]) => mockRegisterReception(...args),
}));

import ReceptionPage from "@/app/reception/page";

describe("ReceptionPage — RED", () => {
  beforeEach(() => {
    mockRegisterReception.mockReset();
    showErrorMock.mockReset();
  });

  it("recorta el nombre antes de enviar el comando", async () => {
    mockRegisterReception.mockResolvedValue({ success: true });

    const user = userEvent.setup();

    render(<ReceptionPage />);

    await user.type(screen.getByLabelText(/Cédula del paciente/i), "CC-99999");
    await user.type(
      screen.getByLabelText(/Nombre del paciente/i),
      "  Ana Perez  ",
    );
    await user.click(screen.getByRole("button", { name: /Registrar check-in/i }));

    await waitFor(() => {
      expect(mockRegisterReception).toHaveBeenCalled();
    });

    expect(mockRegisterReception).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: "Ana Perez" }),
    );
  });

  it("envia los opcionales como null cuando no se completan", async () => {
    mockRegisterReception.mockResolvedValue({ success: true });

    const user = userEvent.setup();

    render(<ReceptionPage />);

    await user.type(screen.getByLabelText(/Cédula del paciente/i), "TI-11111");
    await user.type(
      screen.getByLabelText(/Nombre del paciente/i),
      "Maria Lopez",
    );
    await user.click(screen.getByRole("button", { name: /Registrar check-in/i }));

    await waitFor(() => {
      expect(mockRegisterReception).toHaveBeenCalled();
    });

    expect(mockRegisterReception).toHaveBeenCalledWith(
      expect.objectContaining({ age: null, isPregnant: null, notes: null }),
    );
  });

  it("bloquea doble submit mientras hay una peticion en curso", async () => {
    let resolvePromise: () => void;
    const pending = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockRegisterReception.mockReturnValueOnce(pending);

    const user = userEvent.setup();

    render(<ReceptionPage />);

    await user.type(screen.getByLabelText(/Cédula del paciente/i), "PA-22222");
    await user.type(
      screen.getByLabelText(/Nombre del paciente/i),
      "Carlos Ruiz",
    );

    const submitBtn = screen.getByRole("button", { name: /Registrar check-in/i });
    await user.click(submitBtn);
    await user.click(submitBtn);

    expect(mockRegisterReception).toHaveBeenCalledTimes(1);

    // liberar la promesa dentro de act() para que el state update no genere warnings
    await act(async () => {
      resolvePromise!();
    });
  });
});