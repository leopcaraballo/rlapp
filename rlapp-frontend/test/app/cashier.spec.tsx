import { render, screen } from "@testing-library/react";
import React from "react";

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("@/hooks/useWaitingRoom", () => ({
  useWaitingRoom: () => ({
    queueState: { patientsInQueue: [] },
    refresh: jest.fn(),
  }),
}));

import CashierPage from "@/app/cashier/page";

describe("CashierPage", () => {
  it("renders cashier controls", () => {
    render(<CashierPage />);
    expect(screen.queryByText(/Caja/)).toBeTruthy();
    expect(screen.queryByText(/Llamar siguiente/)).toBeTruthy();
  });
});
