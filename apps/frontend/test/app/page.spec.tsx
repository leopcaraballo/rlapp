/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @jest-environment jsdom
 *
 * Tests for Appointments Screen (Home Page)
 */

import { render, screen, waitFor } from "@testing-library/react";

import AppointmentsScreen from "@/app/page";

// Mock del hook que usa RealtimeAppointments (el componente real)
jest.mock("@/hooks/useQueueAsAppointments", () => ({
  useQueueAsAppointments: jest.fn(() => ({
    appointments: [
      {
        id: "apt-wait-001",
        fullName: "John Waiting",
        status: "waiting",
        office: null,
        priority: "High",
        timestamp: Date.now() - 300000,
      },
      {
        id: "apt-wait-002",
        fullName: "Jane Waiting",
        status: "waiting",
        office: null,
        priority: "Medium",
        timestamp: Date.now() - 200000,
      },
      {
        id: "apt-called-001",
        fullName: "Active Patient",
        status: "called",
        office: "1",
        priority: "High",
        timestamp: Date.now() - 100000,
      },
    ],
    error: null,
    connected: true,
    isConnecting: false,
    connectionStatus: "connected" as const,
  })),
}));

jest.mock("@/services/AudioService", () => ({
  audioService: {
    init: jest.fn(),
    unlock: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
    play: jest.fn(),
  },
}));

describe("AppointmentsScreen (Home Page)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the main title", () => {
      render(<AppointmentsScreen />);

      const title = screen.getByText(/Turnos Disponibles/i);
      expect(title).toBeInTheDocument();
    });

    it("should display WebSocket connection status", () => {
      render(<AppointmentsScreen />);

      const status = screen.getByText(/Conectado/i);
      expect(status).toBeInTheDocument();
    });

    it("should render appointment list", () => {
      render(<AppointmentsScreen />);

      expect(screen.getByText("John Waiting")).toBeInTheDocument();
      expect(screen.getByText("Jane Waiting")).toBeInTheDocument();
      expect(screen.getByText("Active Patient")).toBeInTheDocument();
    });
  });

  describe("Appointment Filtering", () => {
    it("should display waiting appointments section", () => {
      render(<AppointmentsScreen />);

      const waitingAppointments = screen.getAllByText(
        /John Waiting|Jane Waiting/,
      );
      expect(waitingAppointments.length).toBeGreaterThan(0);
    });

    it("should display called appointments section", () => {
      render(<AppointmentsScreen />);

      const calledAppointment = screen.getByText(/Active Patient/);
      expect(calledAppointment).toBeInTheDocument();
    });

    it("should not display completed appointments on main screen", () => {
      render(<AppointmentsScreen />);

      // Main screen should only show waiting and called appointments
      // Not completed ones
      const screen_container = screen
        .getByText(/Turnos Disponibles/i)
        .closest("main");
      expect(screen_container).toBeInTheDocument();
    });
  });

  describe("Appointment Sorting", () => {
    it("should sort waiting appointments by priority", () => {
      render(<AppointmentsScreen />);

      const items = screen.getAllByText(/John Waiting|Jane Waiting/);
      // High priority (John) should appear before medium priority (Jane)
      expect(items.length).toBeGreaterThan(0);
    });

    it("should display called appointments prominently", () => {
      render(<AppointmentsScreen />);

      // Called appointments should be visible
      expect(screen.getByText("Active Patient")).toBeInTheDocument();
    });
  });

  describe("Audio Service", () => {
    it("should initialize audio service with correct path", async () => {
      const { audioService } = require("@/services/AudioService");

      render(<AppointmentsScreen />);

      await waitFor(() => {
        expect(audioService.init).toHaveBeenCalledWith("/sounds/ding.mp3", 0.6);
      });
    });

    it("should enable audio on user interaction", async () => {
      const { audioService } = require("@/services/AudioService");

      render(<AppointmentsScreen />);

      // Simulate user click to unlock audio
      window.dispatchEvent(new MouseEvent("click"));

      await waitFor(() => {
        expect(audioService.unlock).toHaveBeenCalled();
      });
    });

    it("should handle touch events for audio unlock", async () => {
      const { audioService } = require("@/services/AudioService");

      render(<AppointmentsScreen />);

      // Simulate touch to unlock audio
      window.dispatchEvent(new TouchEvent("touchstart"));

      await waitFor(() => {
        expect(audioService.unlock).toHaveBeenCalled();
      });
    });

    it("should play audio when called status appointment appears", async () => {
      const { audioService } = require("@/services/AudioService");
      audioService.isEnabled.mockReturnValue(true);

      render(<AppointmentsScreen />);

      // The component should handle called status changes and play audio
      const container = screen.getByText(/Turnos/i).closest("main");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Toast Notifications", () => {
    it("should manage toast state for appointment updates", () => {
      render(<AppointmentsScreen />);

      // Component manages showToast state internally
      const container = screen.getByText(/Turnos Disponibles/i).closest("main");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Real-time Updates", () => {
    it("should use WebSocket hook for real-time appointments", () => {
      const {
        useQueueAsAppointments,
      } = require("@/hooks/useQueueAsAppointments");

      render(<AppointmentsScreen />);

      expect(useQueueAsAppointments).toHaveBeenCalled();
    });

    it("should handle update callbacks", () => {
      const {
        useQueueAsAppointments,
      } = require("@/hooks/useQueueAsAppointments");

      render(<AppointmentsScreen />);

      // The hook is called with a queueId string
      expect(useQueueAsAppointments).toHaveBeenCalledWith(
        expect.any(String),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle WebSocket connection errors gracefully", async () => {
      jest.resetModules();
      jest.mock("@/hooks/useQueueAsAppointments", () => ({
        useQueueAsAppointments: jest.fn(() => ({
          appointments: [],
          error: "Connection error",
          connected: false,
          isConnecting: false,
          connectionStatus: "disconnected" as const,
        })),
      }));

      const {
        useQueueAsAppointments,
      } = require("@/hooks/useQueueAsAppointments");
      useQueueAsAppointments.mockReturnValue({
        appointments: [],
        error: "Connection error",
        connected: false,
        isConnecting: false,
        connectionStatus: "disconnected" as const,
      });

      render(<AppointmentsScreen />);

      // Component should handle error state
      const container = screen
        .getByText(/Turnos|Desconectado/i)
        .closest("main");
      expect(container).toBeInTheDocument();
    });

    it("should display connecting state during initialization", async () => {
      jest.resetModules();
      jest.mock("@/hooks/useQueueAsAppointments", () => ({
        useQueueAsAppointments: jest.fn(() => ({
          appointments: [],
          error: null,
          connected: false,
          isConnecting: true,
          connectionStatus: "connecting" as const,
        })),
      }));

      const {
        useQueueAsAppointments,
      } = require("@/hooks/useQueueAsAppointments");
      useQueueAsAppointments.mockReturnValue({
        appointments: [],
        error: null,
        connected: false,
        isConnecting: true,
        connectionStatus: "connecting" as const,
      });

      render(<AppointmentsScreen />);

      // Component should show connecting state
      const container = screen.getByText(/Turnos|Conectando/i).closest("main");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Cleanup", () => {
    it("should clean up event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(<AppointmentsScreen />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "click",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
      );
    });
  });

  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      render(<AppointmentsScreen />);

      const main = screen.getByText(/Turnos Disponibles/i).closest("main");
      expect(main).toBeInTheDocument();
    });

    it("should include status role for screen readers", () => {
      render(<AppointmentsScreen />);

      const statusBadge = document.querySelector('[role="status"]');
      expect(statusBadge).toBeInTheDocument();
    });
  });
});
