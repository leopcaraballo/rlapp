import { act, render, screen } from "@testing-library/react";

import CompletedHistoryDashboard from "@/app/dashboard/page";

const mockUseQueueAsAppointments = jest.fn();
const mockAudio = {
  init: jest.fn(),
  unlock: jest.fn().mockResolvedValue(undefined),
  isEnabled: jest.fn().mockReturnValue(false),
  play: jest.fn(),
};

jest.mock("@/hooks/useQueueAsAppointments", () => ({
  useQueueAsAppointments: (...args: unknown[]) =>
    mockUseQueueAsAppointments(...args),
}));

jest.mock("@/services/AudioService", () => ({
  get audioService() {
    return mockAudio;
  },
}));

jest.mock("@/components/WaitingRoomDemo", () => () => (
  <div data-testid="waiting-room-demo" />
));

describe("CompletedHistoryDashboard coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [],
      error: null,
      connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
    });
  });

  it("renderiza estados vacíos cuando no hay turnos", () => {
    render(<CompletedHistoryDashboard />);

    expect(
      screen.getByText(/No hay turnos siendo atendidos/),
    ).toBeInTheDocument();
    expect(screen.getByText(/No hay turnos en espera/)).toBeInTheDocument();
    expect(
      screen.getByText(/No hay turnos completados aún/),
    ).toBeInTheDocument();
  });

  it("renderiza skeletons cuando está conectando", () => {
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [],
      error: null,
      connected: false,
      isConnecting: true,
      connectionStatus: "connecting",
    });

    const { container } = render(<CompletedHistoryDashboard />);
    expect(container.querySelectorAll(".skeletonCard").length).toBeGreaterThan(
      0,
    );
  });

  it("renderiza toast de turno llamado cuando llega appointment llamado", () => {
    jest.useFakeTimers();
    mockAudio.isEnabled.mockReturnValue(true);
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [
        {
          id: "called-1",
          fullName: "Paciente llamado",
          idCard: 1,
          status: "called",
          office: "CONS-01",
          priority: "High",
          timestamp: Date.now(),
        },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    });

    render(<CompletedHistoryDashboard />);

    expect(mockAudio.play).toHaveBeenCalled();
    expect(screen.getByText(/Nuevo turno llamado/)).toBeInTheDocument();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.queryByText(/Nuevo turno llamado/)).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
