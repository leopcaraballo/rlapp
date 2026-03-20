import { render, screen } from "@testing-library/react";
import React from "react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
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

import ReceptionPage from "@/app/reception/page";

describe("ReceptionPage", () => {
  it("renders the check-in form", () => {
    render(<ReceptionPage />);
    expect(screen.queryByText(/Recepción/)).toBeTruthy();
    expect(screen.queryByText(/Registrar check-in/)).toBeTruthy();
  });
});
