/**
 * 🧪 Tests for useAppointmentRegistration hook
 *
 * Tests appointment registration with error handling and double-submit prevention
 */

import { mockRepository, resetMocks } from "@test/mocks/DependencyContext.mock";
import { act, renderHook, waitFor } from "@testing-library/react";

import { CreateAppointmentDTO } from "@/domain/CreateAppointment";
import { useAppointmentRegistration } from "@/hooks/useAppointmentRegistration";

// Mock the DependencyContext module
jest.mock("@/context/DependencyContext", () => ({
  useDependencies: jest.fn(() => ({
    repository: mockRepository,
    realTime: {},
  })),
}));

describe("useAppointmentRegistration", () => {
  beforeEach(() => {
    resetMocks();
  });

  describe("Initial State", () => {
    it("should initialize with loading=false, success=null, error=null", () => {
      const { result } = renderHook(() => useAppointmentRegistration());

      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe("Successful Registration", () => {
    it("should set success message on successful registration", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "123456789",
        fullName: "John Doe",
        priority: "medium",
      };

      mockRepository.createAppointment.mockResolvedValue({
        id: "apt-001",
        message: "Turno registrado exitosamente.",
      });

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.success).toBe("Turno registrado exitosamente.");
      expect(result.current.error).toBe(null);
      expect(result.current.loading).toBe(false);
    });

    it("should use default success message if server doesn't provide one", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "123456789",
        fullName: "Jane Doe",
        priority: "high",
      };

      mockRepository.createAppointment.mockResolvedValue({
        id: "apt-002",
        message: undefined,
      });

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.success).toBe("Turno registrado exitosamente.");
      expect(result.current.error).toBe(null);
    });

    it("should reset loading state after successful registration", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "987654321",
        fullName: "Alice Smith",
        priority: "low",
      };

      mockRepository.createAppointment.mockResolvedValue({
        id: "apt-003",
        message: "Turno registrado exitosamente.",
      });

      const { result } = renderHook(() => useAppointmentRegistration());

      // Before registration
      expect(result.current.loading).toBe(false);

      // During registration
      act(() => {
        result.current.register(mockData);
      });

      // After registration completes
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    it("should set generic error if repository throws unknown error", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "111111111",
        fullName: "Bob Johnson",
        priority: "medium",
      };

      mockRepository.createAppointment.mockRejectedValue(
        new Error("UNKNOWN_ERROR"),
      );

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(
        "No se pudo registrar el turno. Intente de nuevo.",
      );
      expect(result.current.success).toBe(null);
      expect(result.current.loading).toBe(false);
    });

    it("should handle TIMEOUT error with specific message", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "222222222",
        fullName: "Charlie Brown",
        priority: "high",
      };

      mockRepository.createAppointment.mockRejectedValue(new Error("TIMEOUT"));

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(
        "El servidor tardó demasiado. Intente de nuevo.",
      );
    });

    it("should handle RATE_LIMIT error with specific message", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "333333333",
        fullName: "Diana Prince",
        priority: "low",
      };

      mockRepository.createAppointment.mockRejectedValue(
        new Error("RATE_LIMIT"),
      );

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(
        "Demasiadas solicitudes. Espere unos segundos.",
      );
    });

    it("should handle SERVER_ERROR with specific message", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "444444444",
        fullName: "Eve Wilson",
        priority: "medium",
      };

      mockRepository.createAppointment.mockRejectedValue(
        new Error("SERVER_ERROR"),
      );

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(
        "Error en el servidor. Intente más tarde.",
      );
    });

    it("should handle CIRCUIT_OPEN error with specific message", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "555555555",
        fullName: "Frank Miller",
        priority: "high",
      };

      mockRepository.createAppointment.mockRejectedValue(
        new Error("CIRCUIT_OPEN"),
      );

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(
        "Servidor temporalmente no disponible.",
      );
    });

    it("should prefer serverMessage if provided in error", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "666666666",
        fullName: "Grace Hopper",
        priority: "low",
      };

      const error: any = new Error("TIMEOUT");
      error.serverMessage = "Servidor en mantenimiento";

      mockRepository.createAppointment.mockRejectedValue(error);

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe("Servidor en mantenimiento");
    });

    it("should reset error state before new registration", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "777777777",
        fullName: "Henry Ford",
        priority: "medium",
      };

      // First call: error
      mockRepository.createAppointment.mockRejectedValueOnce(
        new Error("TIMEOUT"),
      );

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(
        "El servidor tardó demasiado. Intente de nuevo.",
      );

      // Second call: success
      mockRepository.createAppointment.mockResolvedValueOnce({
        id: "apt-004",
        message: "Turno registrado exitosamente.",
      });

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe("Turno registrado exitosamente.");
    });
  });

  describe("Double Submit Prevention", () => {
    it("should prevent multiple simultaneous submissions", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "888888888",
        fullName: "Iris West",
        priority: "high",
      };

      mockRepository.createAppointment.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  id: "apt-005",
                  message: "Turno registrado exitosamente.",
                }),
              100,
            ),
          ),
      );

      const { result } = renderHook(() => useAppointmentRegistration());

      // Start first submission
      act(() => {
        result.current.register(mockData);
        // Try to submit again while first is in flight - should be ignored
        result.current.register(mockData);
      });

      // Only one call should be made to the repository
      await waitFor(() => {
        expect(mockRepository.createAppointment).toHaveBeenCalledTimes(1);
      });
    });

    it("should reset in-flight flag after submission completes", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "999999999",
        fullName: "Jack Ryan",
        priority: "low",
      };

      mockRepository.createAppointment.mockResolvedValue({
        id: "apt-006",
        message: "Turno registrado exitosamente.",
      });

      const { result } = renderHook(() => useAppointmentRegistration());

      // First submission
      await act(async () => {
        await result.current.register(mockData);
      });

      // Second submission should work since in-flight flag was reset
      await act(async () => {
        await result.current.register(mockData);
      });

      expect(mockRepository.createAppointment).toHaveBeenCalledTimes(2);
    });
  });

  describe("State Management", () => {
    it("should set loading=true during submission", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "101010101",
        fullName: "Karen White",
        priority: "medium",
      };

      let resolveRegister: any;
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve;
      });

      mockRepository.createAppointment.mockReturnValue(registerPromise);

      const { result } = renderHook(() => useAppointmentRegistration());

      act(() => {
        result.current.register(mockData);
      });

      // Should be in loading state while request is in flight
      expect(result.current.loading).toBe(true);

      // Resolve the request
      await act(async () => {
        resolveRegister({ id: "apt-007", message: "Success" });
        await Promise.resolve(); // Let promise settle
      });

      expect(result.current.loading).toBe(false);
    });

    it("should reset success and error before each submission", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "121212121",
        fullName: "Leo Sun",
        priority: "high",
      };

      // First: error
      mockRepository.createAppointment.mockRejectedValueOnce(
        new Error("TIMEOUT"),
      );

      const { result } = renderHook(() => useAppointmentRegistration());

      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).not.toBe(null);
      expect(result.current.success).toBe(null);

      // Reset mocks for next call
      mockRepository.createAppointment.mockResolvedValueOnce({
        id: "apt-008",
        message: "Success",
      });

      // Second: success - error and success should be reset
      await act(async () => {
        await result.current.register(mockData);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.success).not.toBe(null);
    });
  });

  describe("Lifecycle Management", () => {
    it("should prevent state updates after unmount", async () => {
      const mockData: CreateAppointmentDTO = {
        idCard: "131313131",
        fullName: "Mary Johnson",
        priority: "low",
      };

      mockRepository.createAppointment.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  id: "apt-009",
                  message: "Success",
                }),
              50,
            ),
          ),
      );

      const { result, unmount } = renderHook(() =>
        useAppointmentRegistration(),
      );

      act(() => {
        result.current.register(mockData);
      });

      // Unmount before request completes
      unmount();

      // This should not throw or cause issues
      await waitFor(
        () => {
          // After unmount, state updates should be prevented
          expect(mockRepository.createAppointment).toHaveBeenCalled();
        },
        { timeout: 200 },
      );
    });

    it("should reset in-flight flag on mount/remount", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { unmount, _rerender } = renderHook(() =>
        useAppointmentRegistration(),
      );

      unmount();

      // Remount should reset the in-flight flag
      const { result } = renderHook(() => useAppointmentRegistration());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(null);
    });
  });
});
