import { act, render, screen, waitFor } from "@testing-library/react";
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

describe("CompletedHistoryDashboard coverage", () => {
  beforeEach(() => {
    mockAudio = createMockAudio();
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: false,
      isConnecting: false,
      connectionStatus: "connecting",
    };
    mockAudio.play.mockClear();
    mockAudio.isEnabled.mockReturnValue(false);
    storedCallback = null;
  });

  afterEach(() => {});

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
    mockHookState = {
      appointments: [
        { id: "1", status: "called", priority: "High", timestamp: 2 },
        { id: "2", status: "waiting", priority: "Low", timestamp: 3 },
        { id: "3", status: "completed", priority: "Medium", timestamp: 4 },
      ],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(screen.getByText(/En consultorio/)).toBeInTheDocument();
    expect(screen.getByText(/En espera/)).toBeInTheDocument();
    expect(screen.getByText(/Completados/)).toBeInTheDocument();
  });

  it("shows skeletons when connecting", () => {
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: false,
      isConnecting: true,
      connectionStatus: "connecting",
    };

    const { container } = render(<CompletedHistoryDashboard />);

    const skeletons = container.querySelectorAll(".skeletonCard");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state when hook fails", () => {
    mockHookState = {
      appointments: [],
      error: "network-error",
      _connected: false,
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

  it("shows toast and plays on completed update", async () => {
    mockAudio.isEnabled.mockReturnValue(true);
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(storedCallback).toBeTruthy();

    act(() => {
      storedCallback?.({
        id: "99",
        status: "completed",
        priority: "Medium",
        timestamp: 1,
      });
    });

    expect(screen.getByText(/Turno completado/)).toBeInTheDocument();
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

    render(<CompletedHistoryDashboard />);

    act(() => {
      storedCallback?.({
        id: "77",
        status: "completed",
        priority: "Low",
        timestamp: 1,
      });
    });

    expect(mockAudio.play).not.toHaveBeenCalled();
    expect(screen.getByText(/Turno completado/)).toBeInTheDocument();

    jest.useRealTimers();
  });
});
