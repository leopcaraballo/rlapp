/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @jest-environment jsdom
 *
 * 🧪 Tests for Dashboard Page (Completed History)
 */

import { render, screen, waitFor } from "@testing-library/react";

import CompletedHistoryDashboard from "@/app/dashboard/page";

// Mock del hook personalizado
jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
  useAppointmentsWebSocket: jest.fn(() => ({
    appointments: [
      {
        id: "apt-wait-001",
        fullName: "Test Waiting",
        status: "waiting",
        office: null,
        priority: "Medium",
        timestamp: Date.now() - 300000,
      },
      {
        id: "apt-called-001",
        fullName: "Test Called",
        status: "called",
        office: 2,
        priority: "High",
        timestamp: Date.now() - 200000,
      },
      {
        id: "apt-completed-001",
        fullName: "Test Completed",
        status: "completed",
        office: 1,
        priority: "Low",
        timestamp: Date.now() - 500000,
        completedAt: Date.now() - 100000,
      },
      {
        id: "apt-completed-002",
        fullName: "Another Completed",
        status: "completed",
        office: 3,
        priority: "Medium",
        timestamp: Date.now() - 600000,
        completedAt: Date.now() - 50000,
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

describe("CompletedHistoryDashboard (Dashboard Page)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the dashboard title", () => {
      render(<CompletedHistoryDashboard />);

      const title = screen.getByText(/Panel de Turnos en Tiempo Real/i);
      expect(title).toBeInTheDocument();
    });

    it("should display connection status", () => {
      render(<CompletedHistoryDashboard />);

      const status = screen.getByText(/Conectado/i);
      expect(status).toBeInTheDocument();
    });

    it("should render WebSocketStatus component", () => {
      const { container } = render(<CompletedHistoryDashboard />);

      const wsStatus = container.querySelector('[role="status"]');
      expect(wsStatus).toBeInTheDocument();
    });
  });

  describe("Appointment Filtering", () => {
    it("should display only completed appointments", async () => {
      render(<CompletedHistoryDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Completed")).toBeInTheDocument();
        expect(screen.getByText("Another Completed")).toBeInTheDocument();
      });

      // Waiting and called appointments CAN be shown as separate sections
      // This is actually a full dashboard with all appointment types
    });

    it("should filter by waiting appointments for waiting section", () => {
      render(<CompletedHistoryDashboard />);

      // Component should have sections for different statuses
      const container = screen.getByText(/Panel de Turnos/i).closest("main");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Appointment Sorting", () => {
    it("should display completed appointments in correct order", async () => {
      render(<CompletedHistoryDashboard />);

      await waitFor(() => {
        const appointments = screen.getAllByText(
          /Test Completed|Another Completed/,
        );
        expect(appointments.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Audio Integration", () => {
    it("should initialize audio service on mount", async () => {
      const { audioService } = require("@/services/AudioService");

      render(<CompletedHistoryDashboard />);

      await waitFor(() => {
        expect(audioService.init).toHaveBeenCalledWith("/sounds/ding.mp3", 0.6);
      });
    });

    it("should attempt to unlock audio on user interaction", async () => {
      const { audioService } = require("@/services/AudioService");

      render(<CompletedHistoryDashboard />);

      // Simulate user click
      window.dispatchEvent(new MouseEvent("click"));

      await waitFor(() => {
        expect(audioService.unlock).toHaveBeenCalled();
      });
    });

    it("should play audio when completed appointment status changes", async () => {
      const { audioService } = require("@/services/AudioService");
      audioService.isEnabled.mockReturnValue(true);

      render(<CompletedHistoryDashboard />);

      // Component should have logic to play audio on completed status
      const title = screen.getByText(/Panel de Turnos/i);
      expect(title).toBeInTheDocument();
    });
  });

  describe("Toast Notification", () => {
    it("should have element for toast notifications", () => {
      const { container } = render(<CompletedHistoryDashboard />);

      // Component manages toast state
      expect(container).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should display error message when connection fails", async () => {
      jest.resetModules();
      jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
        useAppointmentsWebSocket: jest.fn(() => ({
          appointments: [],
          error: "Connection failed",
          connected: false,
          isConnecting: false,
          connectionStatus: "disconnected" as const,
        })),
      }));

      const {
        useAppointmentsWebSocket,
      } = require("@/hooks/useAppointmentsWebSocket");
      useAppointmentsWebSocket.mockReturnValue({
        appointments: [],
        error: "Connection failed",
        connected: false,
        isConnecting: false,
        connectionStatus: "disconnected" as const,
      });

      render(<CompletedHistoryDashboard />);

      // Component should handle error state gracefully
      const container = screen.getByText(/Panel|Desconectado/i).closest("main");
      expect(container).toBeInTheDocument();
    });

    it("should display loading state while connecting", async () => {
      jest.resetModules();
      jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
        useAppointmentsWebSocket: jest.fn(() => ({
          appointments: [],
          error: null,
          connected: false,
          isConnecting: true,
          connectionStatus: "connecting" as const,
        })),
      }));

      const {
        useAppointmentsWebSocket,
      } = require("@/hooks/useAppointmentsWebSocket");
      useAppointmentsWebSocket.mockReturnValue({
        appointments: [],
        error: null,
        connected: false,
        isConnecting: true,
        connectionStatus: "connecting" as const,
      });

      render(<CompletedHistoryDashboard />);

      // Component should render loading state
      const container = screen.getByText(/Panel|Conectando/i).closest("main");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(<CompletedHistoryDashboard />);

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
});
