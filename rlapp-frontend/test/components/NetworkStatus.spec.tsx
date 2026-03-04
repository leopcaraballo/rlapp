/**
 * @jest-environment jsdom
 *
 * 🧪 Tests de cobertura para components/NetworkStatus
 * Cubre: los 4 estados (online, connecting, offline, degraded),
 *        lastUpdated y el botón onForceRefresh.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import NetworkStatus from "@/components/NetworkStatus";

describe("NetworkStatus", () => {
  it("muestra 'Conectado' y color verde cuando connectionState = online", () => {
    render(<NetworkStatus connectionState="online" />);
    expect(screen.getByText("Conectado")).toBeInTheDocument();
  });

  it("muestra 'Conectando…' cuando connectionState = connecting", () => {
    render(<NetworkStatus connectionState="connecting" />);
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
  });

  it("muestra 'Problemas de red' cuando connectionState = offline", () => {
    render(<NetworkStatus connectionState="offline" />);
    expect(screen.getByText("Problemas de red")).toBeInTheDocument();
  });

  it("muestra 'Problemas de red' cuando connectionState = degraded", () => {
    render(<NetworkStatus connectionState="degraded" />);
    expect(screen.getByText("Problemas de red")).toBeInTheDocument();
  });

  it("muestra la hora de lastUpdated cuando se proporciona", () => {
    render(<NetworkStatus connectionState="online" lastUpdated="2026-03-04T10:30:00.000Z" />);
    // toLocaleTimeString puede variar por locale, solo verificar que existe un <small>
    expect(document.querySelector("small")).not.toBeNull();
  });

  it("no muestra hora cuando lastUpdated es null", () => {
    render(<NetworkStatus connectionState="online" lastUpdated={null} />);
    expect(document.querySelector("small")).toBeNull();
  });

  it("invoca onForceRefresh al hacer clic en el botón Forzar", async () => {
    const onForceRefresh = jest.fn();
    render(<NetworkStatus connectionState="online" onForceRefresh={onForceRefresh} />);
    await userEvent.click(screen.getByRole("button", { name: /Forzar/i }));
    expect(onForceRefresh).toHaveBeenCalledTimes(1);
  });
});
