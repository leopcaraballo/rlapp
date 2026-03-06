/**
 * Cobertura de AlertContext y AlertProvider.
 */
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import React from "react";

import { AlertProvider, useAlert } from "@/context/AlertContext";

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------
function wrapper({ children }: { children: React.ReactNode }) {
  return <AlertProvider>{children}</AlertProvider>;
}

describe("useAlert sin AlertProvider", () => {
  it("retorna no-ops sin lanzar error", () => {
    const { result } = renderHook(() => useAlert());
    expect(() => result.current.showError("e")).not.toThrow();
    expect(() => result.current.showSuccess("s")).not.toThrow();
    expect(() => result.current.showInfo("i")).not.toThrow();
  });
});

describe("AlertProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("showError muestra una alerta de error", () => {
    const { result } = renderHook(() => useAlert(), { wrapper });
    act(() => { result.current.showError("Error de prueba"); });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Error de prueba")).toBeInTheDocument();
  });

  it("showSuccess muestra una alerta de éxito", () => {
    const { result } = renderHook(() => useAlert(), { wrapper });
    act(() => { result.current.showSuccess("Guardado correctamente"); });
    expect(screen.getByText("Guardado correctamente")).toBeInTheDocument();
  });

  it("showInfo muestra una alerta informativa", () => {
    const { result } = renderHook(() => useAlert(), { wrapper });
    act(() => { result.current.showInfo("Información"); });
    expect(screen.getByText("Información")).toBeInTheDocument();
  });

  it("la alerta se elimina automáticamente después de 5 segundos", async () => {
    const { result } = renderHook(() => useAlert(), { wrapper });
    act(() => { result.current.showError("Temporal"); });
    expect(screen.getByText("Temporal")).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(5001); });
    await waitFor(() => {
      expect(screen.queryByText("Temporal")).not.toBeInTheDocument();
    });
  });

  it("puede mostrar múltiples alertas simultáneas", () => {
    const { result } = renderHook(() => useAlert(), { wrapper });
    act(() => {
      result.current.showError("Error 1");
      result.current.showSuccess("Éxito 1");
    });
    expect(screen.getByText("Error 1")).toBeInTheDocument();
    expect(screen.getByText("Éxito 1")).toBeInTheDocument();
  });

  it("renderiza children correctamente dentro del provider", () => {
    render(
      <AlertProvider>
        <div data-testid="child">hijo</div>
      </AlertProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
