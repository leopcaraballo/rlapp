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

let mockHookState: any;
let storedCallback: ((apt: any) => void) | null = null;

jest.mock("@/services/AudioService", () => ({
  get audioService() {
    return mockAudio;
  },
}));

jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
  useAppointmentsWebSocket: (cb: (apt: any) => void) => {
    storedCallback = cb;
    return mockHookState;
  },
}));

describe("AppointmentsScreen coverage", () => {
  beforeEach(() => {
    mockAudio = createMockAudio();
    mockAudio.init.mockClear();
    mockAudio.unlock.mockClear();
    mockAudio.isEnabled.mockReturnValue(false);
    mockAudio.play.mockClear();
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: false,
      isConnecting: false,
      connectionStatus: "connecting",
    };
    storedCallback = null;
  });

  afterEach(() => {});

  it("shows hint and empty state when no appointments", () => {
    render(<AppointmentsScreen />);

    expect(screen.getByText(/Toca la pantalla/)).toBeInTheDocument();
    expect(screen.getAllByText(/No hay turnos/).length).toBeGreaterThan(0);
  });

  it("renders called and waiting appointments with toast", async () => {
    jest.useFakeTimers();
    mockAudio.isEnabled.mockReturnValue(true);
    mockHookState = {
      appointments: [
        { id: "1", status: "called", priority: "High", timestamp: 1 },
        { id: "2", status: "waiting", priority: "Low", timestamp: 2 },
      ],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<AppointmentsScreen />);

    act(() => {
      storedCallback?.({
        id: "1",
        status: "called",
        priority: "High",
        timestamp: 1,
      });
    });

    expect(screen.getByText(/En consultorio/)).toBeInTheDocument();
    expect(screen.getByText(/En espera/)).toBeInTheDocument();
    expect(mockAudio.play).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Nuevo turno llamado/)).toBeInTheDocument();
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    jest.useRealTimers();

    expect(screen.queryByText(/Nuevo turno llamado/)).not.toBeInTheDocument();
  });

  it("shows toast without playing audio when disabled", () => {
    jest.useFakeTimers();
    mockAudio.isEnabled.mockReturnValue(false);
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<AppointmentsScreen />);

    act(() => {
      storedCallback?.({
        id: "2",
        status: "called",
        priority: "Low",
        timestamp: 3,
      });
    });

    expect(mockAudio.play).not.toHaveBeenCalled();
    expect(screen.getByText(/Nuevo turno llamado/)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("shows skeleton while connecting", () => {
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: false,
      isConnecting: true,
      connectionStatus: "connecting",
    };

    const { container } = render(<AppointmentsScreen />);

    const skeletons = container.querySelectorAll(".skeletonCard");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error message when hook reports error", () => {
    mockHookState = {
      appointments: [],
      error: "socket-fail",
      _connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
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
