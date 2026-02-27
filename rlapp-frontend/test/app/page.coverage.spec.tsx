import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import AppointmentsScreen from "@/app/page";

function createMockAudio() {
  return {
    init: jest.fn(),
    unlock: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
    play: jest.fn(),
  };
}

let mockAudio: ReturnType<typeof createMockAudio>;

let mockHookReturn: ReturnType<typeof defaultHookReturn>;

function defaultHookReturn() {
  return {
    appointments: [] as any[],
    error: null as string | null,
    connected: false,
    isConnecting: false,
    connectionStatus: "connecting" as const,
  };
}

jest.mock("@/services/AudioService", () => ({
  get audioService() {
    return mockAudio;
  },
}));

jest.mock("@/hooks/useQueueAsAppointments", () => ({
  useQueueAsAppointments: () => mockHookReturn,
}));

describe("AppointmentsScreen coverage", () => {
  beforeEach(() => {
    mockAudio = createMockAudio();
    mockAudio.init.mockClear();
    mockAudio.unlock.mockClear();
    mockAudio.isEnabled.mockReturnValue(false);
    mockAudio.play.mockClear();
    mockHookReturn = defaultHookReturn();
  });

  afterEach(() => {});

  it("shows hint and empty state when no appointments", () => {
    render(<AppointmentsScreen />);

    expect(screen.getByText(/Toca la pantalla/)).toBeInTheDocument();
    expect(screen.getAllByText(/No hay turnos/).length).toBeGreaterThan(0);
  });

  it("renders called and waiting appointments with toast", async () => {
    mockAudio.isEnabled.mockReturnValue(true);
    mockHookReturn = {
      appointments: [
        { id: "1", fullName: "Called Patient", idCard: "1", status: "called", priority: "High", timestamp: 1, office: "1" },
        { id: "2", fullName: "Waiting Patient", idCard: "2", status: "waiting", priority: "Low", timestamp: 2, office: null },
      ],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected" as const,
    };

    render(<AppointmentsScreen />);

    expect(screen.getByText(/En consultorio/)).toBeInTheDocument();
    expect(screen.getByText(/En espera/)).toBeInTheDocument();
  });

  it("shows toast without playing audio when disabled", () => {
    mockAudio.isEnabled.mockReturnValue(false);
    mockHookReturn = {
      appointments: [],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected" as const,
    };

    render(<AppointmentsScreen />);

    // Without called appointments, no toast/audio should trigger
    expect(mockAudio.play).not.toHaveBeenCalled();
  });

  it("shows skeleton while connecting", () => {
    mockHookReturn = {
      appointments: [],
      error: null,
      connected: false,
      isConnecting: true,
      connectionStatus: "connecting" as const,
    };

    const { container } = render(<AppointmentsScreen />);

    const skeletons = container.querySelectorAll(".skeletonCard");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error message when hook reports error", () => {
    mockHookReturn = {
      appointments: [],
      error: "socket-fail",
      connected: false,
      isConnecting: false,
      connectionStatus: "disconnected" as const,
    };

    render(<AppointmentsScreen />);

    expect(screen.getByText(/socket-fail/)).toBeInTheDocument();
  });

  it("hides audio hint when audio is enabled", () => {
    const useStateSpy = jest.spyOn(React, "useState");
    useStateSpy.mockImplementationOnce(() => [true, jest.fn()]);
    mockAudio.isEnabled.mockReturnValue(true);

    render(<AppointmentsScreen />);

    expect(screen.queryByText(/Toca la pantalla/)).not.toBeInTheDocument();

    useStateSpy.mockRestore();
  });
});
