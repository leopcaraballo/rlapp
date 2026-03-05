/**
 * @jest-environment jsdom
 *
 * TDD RETROFIT — RED
 * Demuestra que los tests fallan contra la implementación v0 de NetworkStatus,
 * la cual solo renderizaba "Conectado" sin distinguir estados ni props adicionales.
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Si alguno dejara de fallar (v0 accidentalmente pasa), Jest lo marca en rojo.
 *
 * Commit par (GREEN): test/components/NetworkStatus.spec.tsx — usa la implementación real.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── v0 stub: sólo mostraba "Conectado", sin estados, sin lastUpdated, sin botón ──
jest.mock("@/components/NetworkStatus", () => {
  return function NetworkStatusV0() {
    return React.createElement("div", null, "Conectado");
  };
});

import NetworkStatus from "@/components/NetworkStatus";

describe("NetworkStatus — RED (v0: sin manejo de estados ni props)", () => {
  // Comportamiento presente incluso en v0 → pasa normalmente
  it("renderiza el componente sin lanzar error", () => {
    render(<NetworkStatus connectionState="online" />);
    expect(screen.getByText("Conectado")).toBeTruthy();
  });

  // Comportamientos NUEVOS → fallan contra v0 → evidencia RED
  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra 'Conectando…' cuando connectionState = connecting (falta en v0)", () => {
    render(<NetworkStatus connectionState="connecting" />);
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra 'Problemas de red' cuando connectionState = offline (falta en v0)", () => {
    render(<NetworkStatus connectionState="offline" />);
    expect(screen.getByText("Problemas de red")).toBeInTheDocument();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra 'Problemas de red' cuando connectionState = degraded (falta en v0)", () => {
    render(<NetworkStatus connectionState="degraded" />);
    expect(screen.getByText("Problemas de red")).toBeInTheDocument();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("muestra <small> con hora cuando lastUpdated está definido (falta en v0)", () => {
    render(<NetworkStatus connectionState="online" lastUpdated="2026-03-04T10:30:00.000Z" />);
    expect(document.querySelector("small")).not.toBeNull();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("invoca onForceRefresh al hacer clic en el botón Forzar (falta en v0)", async () => {
    const onForceRefresh = jest.fn();
    render(<NetworkStatus connectionState="online" onForceRefresh={onForceRefresh} />);
    await userEvent.click(screen.getByRole("button", { name: /Forzar/i }));
    expect(onForceRefresh).toHaveBeenCalledTimes(1);
  });
});
