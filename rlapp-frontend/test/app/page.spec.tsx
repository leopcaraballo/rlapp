import { render, screen } from "@testing-library/react";

import AppointmentsScreen from "@/app/page";

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

describe("AppointmentsScreen (Home Page)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [
        {
          id: "apt-wait-001",
          fullName: "John Waiting",
          status: "waiting",
          office: null,
          priority: "High",
          timestamp: Date.now() - 300000,
          idCard: 123456,
        },
        {
          id: "apt-called-001",
          fullName: "Active Patient",
          status: "called",
          office: "1",
          priority: "Medium",
          timestamp: Date.now() - 100000,
          idCard: 456789,
        },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    });
  });

  it("renderiza el título", () => {
    render(<AppointmentsScreen />);
    expect(screen.getByText(/Turnos Disponibles/i)).toBeInTheDocument();
  });

  it("renderiza estado de conexión", () => {
    render(<AppointmentsScreen />);
    expect(screen.getByText(/Conectado/i)).toBeInTheDocument();
  });

  it("muestra turnos en espera y en consultorio", () => {
    render(<AppointmentsScreen />);
    expect(screen.getByText("John Waiting")).toBeInTheDocument();
    expect(screen.getByText("Active Patient")).toBeInTheDocument();
  });

  it("no muestra sección de completados en home", () => {
    render(<AppointmentsScreen />);
    expect(screen.queryByText(/Completados/i)).not.toBeInTheDocument();
  });

  it("muestra esqueleto cuando está conectando", () => {
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [],
      error: null,
      connected: false,
      isConnecting: true,
      connectionStatus: "connecting",
    });

    const { container } = render(<AppointmentsScreen />);
    expect(container.querySelectorAll(".skeletonCard").length).toBeGreaterThan(
      0,
    );
  });

  it("muestra error cuando el hook reporta error", () => {
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [],
      error: "Connection error",
      connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
    });

    render(<AppointmentsScreen />);
    expect(screen.getByText("Connection error")).toBeInTheDocument();
  });
});
