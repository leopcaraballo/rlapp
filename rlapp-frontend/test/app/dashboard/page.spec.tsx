import { render, screen } from "@testing-library/react";

import CompletedHistoryDashboard from "@/app/dashboard/page";

const mockUseQueueAsAppointments = jest.fn();

jest.mock("@/hooks/useQueueAsAppointments", () => ({
  useQueueAsAppointments: (...args: unknown[]) =>
    mockUseQueueAsAppointments(...args),
}));

jest.mock("@/services/AudioService", () => ({
  audioService: {
    init: jest.fn(),
    unlock: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
    play: jest.fn(),
  },
}));

jest.mock("@/components/WaitingRoomDemo", () => () => (
  <div data-testid="waiting-room-demo" />
));

describe("CompletedHistoryDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [
        {
          id: "wait-1",
          fullName: "Paciente en espera",
          idCard: 100,
          status: "waiting",
          office: null,
          priority: "Low",
          timestamp: Date.now() - 10000,
        },
        {
          id: "called-1",
          fullName: "Paciente llamado",
          idCard: 101,
          status: "called",
          office: "CONS-01",
          priority: "High",
          timestamp: Date.now() - 5000,
        },
        {
          id: "done-1",
          fullName: "Paciente completado",
          idCard: 102,
          status: "completed",
          office: "CONS-02",
          priority: "Medium",
          timestamp: Date.now() - 15000,
          completedAt: Date.now() - 1000,
        },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    });
  });

  it("renderiza título de dashboard", () => {
    render(<CompletedHistoryDashboard />);
    expect(
      screen.getByText(/Panel de Turnos en Tiempo Real/i),
    ).toBeInTheDocument();
  });

  it("muestra estado de conexión", () => {
    render(<CompletedHistoryDashboard />);
    expect(screen.getByText(/Conectado/i)).toBeInTheDocument();
  });

  it("muestra sección de completados y elementos", () => {
    render(<CompletedHistoryDashboard />);
    expect(screen.getByText(/Completados/i)).toBeInTheDocument();
    expect(screen.getByText("Paciente completado")).toBeInTheDocument();
  });

  it("muestra mensaje de error cuando existe", () => {
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [],
      error: "Connection failed",
      connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
    });

    render(<CompletedHistoryDashboard />);
    expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
  });
});
