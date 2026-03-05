/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import Home from "@/app/page";

// Mock del hook personalizado
jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
  useAppointmentsWebSocket: () => ({
    appointments: [
      {
        id: "1",
        fullName: "Test Patient",
        status: "waiting",
        office: null,
        priority: "medium",
        timestamp: Date.now(),
      },
      {
        id: "2",
        fullName: "Active Patient",
        status: "called",
        office: "1",
        priority: "high",
        timestamp: Date.now(),
      },
    ],
    error: null,
    connected: true,
    isConnecting: false,
    connectionStatus: "connected" as const,
  }),
}));

describe("Home Page", () => {
  it("renders the title in Spanish", () => {
    render(<Home />);
    const title = screen.getByText(/Turnos Disponibles/i);
    expect(title).toBeInTheDocument();
  });

  it("displays connected status", () => {
    render(<Home />);
    const status = screen.getByText(/Conectado/i);
    expect(status).toBeInTheDocument();
  });

  it("renders list of appointments", () => {
    render(<Home />);
    expect(screen.getByText("Test Patient")).toBeInTheDocument();
    expect(screen.getByText("Active Patient")).toBeInTheDocument();
  });
});
