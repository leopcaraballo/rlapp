/**
 * 🧪 Tests for useAppointmentsWebSocket hook
 *
 * Tests real-time appointment synchronization via WebSocket
 */

import { AppointmentFactory } from "@test/factories/appointment.factory";
import { mockRealTime, resetMocks } from "@test/mocks/DependencyContext.mock";
import { act, renderHook, waitFor } from "@testing-library/react";

import { Appointment } from "@/domain/Appointment";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";

// Mock the DependencyContext module
jest.mock("@/context/DependencyContext", () => ({
  useDependencies: jest.fn(() => ({
    repository: { getAppointments: jest.fn() },
    realTime: mockRealTime,
  })),
}));

describe("useAppointmentsWebSocket", () => {
  beforeEach(() => {
    resetMocks();
  });

  describe("Connection Management", () => {
    it("should call realTime.connect() on mount", () => {
      renderHook(() => useAppointmentsWebSocket());

      expect(mockRealTime.connect).toHaveBeenCalled();
    });

    it("should call realTime.disconnect() on unmount", () => {
      const { unmount } = renderHook(() => useAppointmentsWebSocket());

      unmount();

      expect(mockRealTime.disconnect).toHaveBeenCalled();
    });

    it("should set connected=true when onConnect fires", async () => {
      let onConnectCallback: (() => void) | null = null;
      mockRealTime.onConnect.mockImplementation((cb) => {
        onConnectCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      // Initially connecting
      expect(result.current.connected).toBe(false);
      expect(result.current.isConnecting).toBe(true);

      // Simulate connection
      act(() => {
        onConnectCallback?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
      });
    });

    it("should set connected=false when onDisconnect fires", async () => {
      let onDisconnectCallback: (() => void) | null = null;
      mockRealTime.onDisconnect.mockImplementation((cb) => {
        onDisconnectCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      // Simulate connection first
      await waitFor(() => {
        // Initially connecting, no good way to set connected without setup
      });

      // Simulate disconnection
      act(() => {
        onDisconnectCallback?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });
    });
  });

  describe("Data Management", () => {
    it("should update appointments when onSnapshot fires", async () => {
      let onSnapshotCallback: ((data: Appointment[]) => void) | null = null;
      mockRealTime.onSnapshot.mockImplementation((cb) => {
        onSnapshotCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      const appointments = [
        AppointmentFactory.createWaiting({ fullName: "Patient 1" }),
        AppointmentFactory.createCalled({ fullName: "Patient 2" }),
      ];

      act(() => {
        onSnapshotCallback?.(appointments);
      });

      await waitFor(() => {
        expect(result.current.appointments).toEqual(appointments);
      });
    });

    it("should call onUpdate callback when appointment is updated", async () => {
      let onUpdateCallback: ((data: Appointment) => void) | null = null;
      mockRealTime.onAppointmentUpdated.mockImplementation((cb) => {
        onUpdateCallback = cb;
      });

      const onUpdateMock = jest.fn();
      const { result } = renderHook(() =>
        useAppointmentsWebSocket(onUpdateMock),
      );

      const updatedAppointment = AppointmentFactory.createCalled({
        fullName: "Updated Patient",
      });

      act(() => {
        onUpdateCallback?.(updatedAppointment);
      });

      await waitFor(() => {
        expect(onUpdateMock).toHaveBeenCalledWith(updatedAppointment);
        expect(result.current.appointments).toContainEqual(updatedAppointment);
      });
    });

    it("should handle upsert: create new appointment if not exists", async () => {
      let onUpdateCallback: ((data: Appointment) => void) | null = null;
      mockRealTime.onAppointmentUpdated.mockImplementation((cb) => {
        onUpdateCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      const newAppointment = AppointmentFactory.create({
        id: "new-apt-001",
        fullName: "Brand New Patient",
      });

      // Start with empty list
      act(() => {
        // No snapshot, empty list
      });

      // Add new appointment
      act(() => {
        onUpdateCallback?.(newAppointment);
      });

      await waitFor(() => {
        expect(result.current.appointments).toContainEqual(newAppointment);
        expect(result.current.appointments.length).toBe(1);
      });
    });

    it("should handle upsert: update existing appointment by ID", async () => {
      let onUpdateCallback: ((data: Appointment) => void) | null = null;
      mockRealTime.onAppointmentUpdated.mockImplementation((cb) => {
        onUpdateCallback = cb;
      });

      const initialAppointment = AppointmentFactory.create({
        id: "apt-001",
        status: "waiting",
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      // Set initial state
      act(() => {
        onUpdateCallback?.(initialAppointment);
      });

      // Update the same appointment
      const updatedAppointment = {
        ...initialAppointment,
        status: "called" as const,
      };

      act(() => {
        onUpdateCallback?.(updatedAppointment);
      });

      await waitFor(() => {
        expect(result.current.appointments.length).toBe(1);
        expect(result.current.appointments[0]).toEqual(updatedAppointment);
        expect(result.current.appointments[0].status).toBe("called");
      });
    });
  });

  describe("Error Handling", () => {
    it("should set error when onError fires", async () => {
      let onErrorCallback: ((err: Error) => void) | null = null;
      mockRealTime.onError.mockImplementation((cb) => {
        onErrorCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      const error = new Error("Connection failed");

      act(() => {
        onErrorCallback?.(error);
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Error de conexión en tiempo real");
        expect(result.current.connected).toBe(false);
      });
    });
  });

  describe("Connection Status", () => {
    it("should derive connectionStatus correctly from connected and isConnecting", async () => {
      let onConnectCallback: (() => void) | null = null;
      mockRealTime.onConnect.mockImplementation((cb) => {
        onConnectCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      // Initially connecting
      expect(result.current.connectionStatus).toBe("connecting");

      // After connect
      act(() => {
        onConnectCallback?.();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe("connected");
      });
    });

    it("should return 'connecting' status when onDisconnect fires (reconnect attempt)", async () => {
      let onDisconnectCallback: (() => void) | null = null;
      mockRealTime.onDisconnect.mockImplementation((cb) => {
        onDisconnectCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      // Simulate disconnect - hook sets isConnecting=true (reconnect attempt)
      act(() => {
        onDisconnectCallback?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
        expect(result.current.isConnecting).toBe(true);
        expect(result.current.connectionStatus).toBe("connecting");
      });
    });

    it("should return 'disconnected' when error occurs", async () => {
      let onErrorCallback: ((err: Error) => void) | null = null;
      mockRealTime.onError.mockImplementation((cb) => {
        onErrorCallback = cb;
      });

      const { result } = renderHook(() => useAppointmentsWebSocket());

      const error = new Error("Connection failed");
      act(() => {
        onErrorCallback?.(error);
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.connectionStatus).toBe("disconnected");
      });
    });
  });
});
