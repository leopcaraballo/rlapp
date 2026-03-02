import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── mocks globales ──────────────────────────────────────────────────────────
const showErrorMock = jest.fn();
const showSuccessMock = jest.fn();
const showInfoMock = jest.fn();
const clearErrorMock = jest.fn();

const roomsMock = {
  busy: false,
  error: null as string | null,
  lastResult: null,
  activate: jest.fn<Promise<boolean>, [string, string]>(),
  deactivate: jest.fn<Promise<boolean>, [string, string]>(),
  clearError: clearErrorMock,
};

// ── stubs de módulos ────────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "queue" ? "QUEUE-CR" : null) }),
}));

jest.mock("@/context/AlertContext", () => ({
  useAlert: () => ({
    showError: showErrorMock,
    showSuccess: showSuccessMock,
    showInfo: showInfoMock,
  }),
}));

jest.mock("@/hooks/useConsultingRooms", () => ({
  useConsultingRooms: () => roomsMock,
}));

import ConsultingRoomsPage from "@/app/consulting-rooms/page";

// ── suite ────────────────────────────────────────────────────────────────────
describe("ConsultingRoomsPage — RED", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    roomsMock.busy = false;
    roomsMock.error = null;
    roomsMock.activate.mockResolvedValue(true);
    roomsMock.deactivate.mockResolvedValue(true);
  });

  // ── 1. Renderiza los 4 consultorios por defecto ───────────────────────────
  it("renderiza los cuatro consultorios predefinidos", () => {
    render(<ConsultingRoomsPage />);

    expect(screen.getByText("CONS-01")).toBeInTheDocument();
    expect(screen.getByText("CONS-02")).toBeInTheDocument();
    expect(screen.getByText("CONS-03")).toBeInTheDocument();
    expect(screen.getByText("CONS-04")).toBeInTheDocument();
  });

  // ── 2. queueId desde query param ─────────────────────────────────────────
  it("muestra el queueId proveniente del query param ?queue=", () => {
    render(<ConsultingRoomsPage />);

    expect(screen.getByText(/QUEUE-CR/)).toBeInTheDocument();
  });

  // ── 3. activate con argumentos correctos ─────────────────────────────────
  it("invoca activate con queueId y stationId al pulsar 'Activar' en CONS-01", async () => {
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    // Todos los botones iniciales dicen "Activar"
    const activarBtns = screen.getAllByRole("button", { name: /^Activar$/i });
    await user.click(activarBtns[0]); // CONS-01

    await waitFor(() => {
      expect(roomsMock.activate).toHaveBeenCalledWith("QUEUE-CR", "CONS-01");
    });
  });

  // ── 4. Botón cambia a "Desactivar" tras activate exitoso ──────────────────
  it("cambia el botón de 'Activar' a 'Desactivar' tras activate exitoso", async () => {
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    const card = screen.getByText("CONS-01").closest("div") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: /^Activar$/i }));

    await waitFor(() => {
      expect(within(card).getByRole("button", { name: /^Desactivar$/i })).toBeInTheDocument();
    });
  });

  // ── 5. showSuccess tras activate exitoso ─────────────────────────────────
  it("muestra alerta de éxito tras activar un consultorio", async () => {
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    const activarBtns = screen.getAllByRole("button", { name: /^Activar$/i });
    await user.click(activarBtns[0]);

    await waitFor(() => {
      expect(showSuccessMock).toHaveBeenCalledWith(
        expect.stringContaining("CONS-01"),
      );
    });
  });

  // ── 6. deactivate con argumentos correctos ────────────────────────────────
  it("invoca deactivate con queueId y stationId al desactivar un consultorio activo", async () => {
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    // Primero activar
    const card = screen.getByText("CONS-02").closest("div") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: /^Activar$/i }));
    await waitFor(() => {
      expect(within(card).getByRole("button", { name: /^Desactivar$/i })).toBeInTheDocument();
    });

    // Luego desactivar
    await user.click(within(card).getByRole("button", { name: /^Desactivar$/i }));

    await waitFor(() => {
      expect(roomsMock.deactivate).toHaveBeenCalledWith("QUEUE-CR", "CONS-02");
    });
  });

  // ── 7. Botón vuelve a "Activar" tras deactivate exitoso ───────────────────
  it("cambia el botón de 'Desactivar' a 'Activar' tras deactivate exitoso", async () => {
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    const card = screen.getByText("CONS-02").closest("div") as HTMLElement;

    // Activar primero
    await user.click(within(card).getByRole("button", { name: /^Activar$/i }));
    await waitFor(() => within(card).getByRole("button", { name: /^Desactivar$/i }));

    // Desactivar
    await user.click(within(card).getByRole("button", { name: /^Desactivar$/i }));

    await waitFor(() => {
      expect(within(card).getByRole("button", { name: /^Activar$/i })).toBeInTheDocument();
    });
  });

  // ── 8. showInfo tras deactivate exitoso ───────────────────────────────────
  it("muestra alerta informativa tras desactivar un consultorio", async () => {
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    const card = screen.getByText("CONS-03").closest("div") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: /^Activar$/i }));
    await waitFor(() => within(card).getByRole("button", { name: /^Desactivar$/i }));

    await user.click(within(card).getByRole("button", { name: /^Desactivar$/i }));

    await waitFor(() => {
      expect(showInfoMock).toHaveBeenCalledWith(
        expect.stringContaining("CONS-03"),
      );
    });
  });

  // ── 9. Estado NO cambia si activate devuelve false (fallo de red) ─────────
  it("no cambia el estado del consultorio si activate falla", async () => {
    roomsMock.activate.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    const card = screen.getByText("CONS-01").closest("div") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: /^Activar$/i }));

    await waitFor(() => {
      expect(roomsMock.activate).toHaveBeenCalled();
    });

    // El botón sigue diciendo "Activar" (estado no cambió)
    expect(within(card).getByRole("button", { name: /^Activar$/i })).toBeInTheDocument();
  });

  // ── 10. Estado NO cambia si deactivate devuelve false (fallo de red) ──────
  it("no cambia el estado del consultorio si deactivate falla", async () => {
    roomsMock.deactivate.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ConsultingRoomsPage />);

    // Activar correctamente primero
    const card = screen.getByText("CONS-01").closest("div") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: /^Activar$/i }));
    await waitFor(() => within(card).getByRole("button", { name: /^Desactivar$/i }));

    // Intentar desactivar (falla)
    await user.click(within(card).getByRole("button", { name: /^Desactivar$/i }));

    await waitFor(() => {
      expect(roomsMock.deactivate).toHaveBeenCalled();
    });

    // El botón sigue diciendo "Desactivar" (estado no cambió)
    expect(within(card).getByRole("button", { name: /^Desactivar$/i })).toBeInTheDocument();
  });

  // ── 11. Todos los botones disabled cuando busy === true ───────────────────
  it("deshabilita todos los botones de toggle cuando busy es true", () => {
    roomsMock.busy = true;
    render(<ConsultingRoomsPage />);

    const toggleBtns = screen.getAllByRole("button");
    for (const btn of toggleBtns) {
      expect(btn).toBeDisabled();
    }
  });

  // ── 12. Propagación de error del hook ────────────────────────────────────
  it("propaga error del hook a showError y llama clearError", () => {
    roomsMock.error = "Servicio de consultorios no disponible";
    render(<ConsultingRoomsPage />);

    expect(showErrorMock).toHaveBeenCalledWith(
      "Servicio de consultorios no disponible",
    );
    expect(clearErrorMock).toHaveBeenCalled();
  });
});
