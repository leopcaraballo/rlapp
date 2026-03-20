import { render, screen } from "@testing-library/react";
import React from "react";

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("@/context/AlertContext", () => ({
  useAlert: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn() }),
  AlertProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/useCashierStation", () => ({
  useCashierStation: () => ({
    busy: false,
    error: null,
    lastResult: null,
    callNext: jest.fn(),
    validate: jest.fn(),
    markPending: jest.fn(),
    markAbsent: jest.fn(),
    cancel: jest.fn(),
    clearError: jest.fn(),
  }),
}));

const mockNextTurn: { current: import("@/services/api/types").NextTurnView | null } = { current: null };

jest.mock("@/hooks/useAtencion", () => ({
  useAtencion: () => ({
    monitor: null,
    queueState: { patientsInQueue: [] },
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

import PaymentPage from "@/app/payment/page";

describe("PaymentPage", () => {
  beforeEach(() => {
    mockNextTurn.current = null;
  });

  it("renders payment controls", () => {
    render(<PaymentPage />);
    expect(screen.queryByText(/Pagos/)).toBeTruthy();
    expect(screen.queryByText(/Llamar siguiente/)).toBeTruthy();
  });

  it("no muestra el turno activo cuando nextTurn es null", () => {
    mockNextTurn.current = null;
    render(<PaymentPage />);
    expect(screen.queryByText(/Turno activo en caja/)).toBeNull();
  });

  it("muestra el turno activo cuando nextTurn.status es 'cashier-called'", () => {
    mockNextTurn.current = {
      serviceId: "Q-1",
      patientId: "CC-001",
      patientName: "Juan Prueba",
      priority: "High",
      consultationType: "General",
      status: "cashier-called",
      claimedAt: null,
      calledAt: new Date().toISOString(),
      stationId: null,
      projectedAt: new Date().toISOString(),
      turnNumber: 1,
    };
    render(<PaymentPage />);
    expect(screen.queryByText(/Turno activo en caja/)).toBeTruthy();
    expect(screen.queryAllByText("Juan Prueba").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("CC-001").length).toBeGreaterThan(0);
  });

  it("no muestra el turno activo cuando nextTurn.status no es 'cashier-called'", () => {
    mockNextTurn.current = {
      serviceId: "Q-1",
      patientId: "CC-002",
      patientName: "Pedro Test",
      priority: "Medium",
      consultationType: "General",
      status: "waiting",
      claimedAt: null,
      calledAt: null,
      stationId: null,
      projectedAt: new Date().toISOString(),
      turnNumber: 2,
    };
    render(<PaymentPage />);
    expect(screen.queryByText(/Turno activo en caja/)).toBeNull();
  });
});
