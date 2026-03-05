import { render, screen } from "@testing-library/react";
import React from "react";

import CompletedHistoryDashboard from "@/app/dashboard/page";

function createMockAudio() {
  return {
    init: jest.fn(),
    unlock: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
    play: jest.fn(),
  };
}

let mockAudio: ReturnType<typeof createMockAudio>;

let mockHookReturn: any;

jest.mock("@/services/AudioService", () => ({
  get audioService() {
    return mockAudio;
  },
}));

jest.mock("@/hooks/useQueueAsAppointments", () => ({
  useQueueAsAppointments: jest.fn(() => mockHookReturn),
}));

describe("CompletedHistoryDashboard coverage", () => {
  beforeEach(() => {
    mockAudio = createMockAudio();
    mockHookReturn = {
      appointments: [],
      error: null,
      connected: false,
      isConnecting: false,
      connectionStatus: "connecting",
    };
    mockAudio.play.mockClear();
    mockAudio.isEnabled.mockReturnValue(false);
  });

  it("renders empty states when no appointments", () => {
    render(<CompletedHistoryDashboard />);

    expect(
      screen.getByText(/No hay turnos siendo atendidos/),
    ).toBeInTheDocument();
    expect(screen.getByText(/No hay turnos en espera/)).toBeInTheDocument();
    expect(
      screen.getByText(/No hay turnos completados aún/),
    ).toBeInTheDocument();
  });

  it("renders called, waiting, and completed lists", () => {
    mockHookReturn = {
      appointments: [
        { id: "1", fullName: "Called Patient", status: "called", office: "2", priority: "High", timestamp: 2 },
        { id: "2", fullName: "Waiting Patient", status: "waiting", office: null, priority: "Low", timestamp: 3 },
        { id: "3", fullName: "Completed Patient", status: "completed", office: "1", priority: "Medium", timestamp: 4 },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(screen.getByText(/En consultorio/)).toBeInTheDocument();
    expect(screen.getByText(/En espera/)).toBeInTheDocument();
    expect(screen.getByText(/Completados/)).toBeInTheDocument();
  });

  it("shows skeletons when connecting", () => {
    mockHookReturn = {
      appointments: [],
      error: null,
      connected: false,
      isConnecting: true,
      connectionStatus: "connecting",
    };

    const { container } = render(<CompletedHistoryDashboard />);

    const skeletons = container.querySelectorAll(".skeletonCard");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state when hook fails", () => {
    mockHookReturn = {
      appointments: [],
      error: "network-error",
      connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
    };

    render(<CompletedHistoryDashboard />);

    expect(screen.getByText(/network-error/)).toBeInTheDocument();
  });

  it("hides audio hint when audio is enabled", () => {
    const useStateSpy = jest.spyOn(React, "useState");
    useStateSpy.mockImplementationOnce(() => [true, jest.fn()]);
    mockAudio.isEnabled.mockReturnValue(true);

    render(<CompletedHistoryDashboard />);

    expect(screen.queryByText(/activar sonido/)).not.toBeInTheDocument();

    useStateSpy.mockRestore();
  });

  it("shows toast when appointments include a called status", () => {
    mockHookReturn = {
      appointments: [
        { id: "99", fullName: "Called Patient", status: "called", office: "1", priority: "Medium", timestamp: 1 },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(screen.getByText(/Nuevo turno llamado/)).toBeInTheDocument();
  });

  it("does not play audio when audio is disabled", () => {
    mockAudio.isEnabled.mockReturnValue(false);
    mockHookReturn = {
      appointments: [
        { id: "77", fullName: "Called Patient", status: "called", office: "1", priority: "Low", timestamp: 1 },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(mockAudio.play).not.toHaveBeenCalled();
  });
});
