import { act, render, screen } from "@testing-library/react";

import AppointmentsScreen from "@/app/page";

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

describe("AppointmentsScreen coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [],
      error: null,
      connected: false,
      isConnecting: false,
      connectionStatus: "connecting",
    });
  });

  it("muestra hint y estado vacío cuando no hay turnos", () => {
    render(<AppointmentsScreen />);

    expect(screen.getByText(/Toca la pantalla/)).toBeInTheDocument();
    expect(
      screen.queryByText(/No hay turnos siendo atendidos/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No hay turnos en espera/)).toBeInTheDocument();
  });

  it("dispara toast y audio cuando aparece turno llamado", () => {
    jest.useFakeTimers();
    mockAudio.isEnabled.mockReturnValue(true);
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [
        {
          id: "1",
          fullName: "Paciente llamado",
          status: "called",
          office: "CONS-01",
          priority: "High",
          timestamp: Date.now(),
          idCard: 123,
        },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    });

    render(<AppointmentsScreen />);

    expect(mockAudio.play).toHaveBeenCalled();
    expect(screen.getByText(/Nuevo turno llamado/)).toBeInTheDocument();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.queryByText(/Nuevo turno llamado/)).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("muestra error cuando se degrada conexión", () => {
    mockUseQueueAsAppointments.mockReturnValue({
      appointments: [],
      error: "socket-fail",
      connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
    });

    render(<AppointmentsScreen />);
    expect(screen.getByText(/socket-fail/)).toBeInTheDocument();
  });
});
