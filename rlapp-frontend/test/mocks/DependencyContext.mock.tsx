/**
 * 🧪 Test Mock for DependencyContext
 *
 * Provides a test wrapper that injects mocks of AppointmentRepository and RealTimePort.
 * Use TestDependencyProvider to wrap your component in tests.
 *
 * @example
 * ```tsx
 * import { TestDependencyProvider, mockRepository, mockRealTime } from "@test/mocks/DependencyContext.mock";
 *
 * describe("MyComponent", () => {
 *   it("should fetch appointments", async () => {
 *     mockRepository.getAppointments.mockResolvedValue([...]);
 *     render(
 *       <TestDependencyProvider>
 *         <MyComponent />
 *       </TestDependencyProvider>
 *     );
 *   });
 * });
 * ```
 */

import { createContext, ReactNode, useContext, useMemo } from "react";

import { AppointmentRepository } from "@/domain/ports/AppointmentRepository";
import { RealTimePort } from "@/domain/ports/RealTimePort";

// Mock implementations
export const mockRepository: jest.Mocked<AppointmentRepository> = {
  getAppointments: jest.fn(),
  createAppointment: jest.fn(),
};

export const mockRealTime: jest.Mocked<RealTimePort> = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  onSnapshot: jest.fn(),
  onAppointmentUpdated: jest.fn(),
  onAppointmentCalled: jest.fn(),
  onConnect: jest.fn(),
  onDisconnect: jest.fn(),
  onError: jest.fn(),
  isConnected: jest.fn(() => true),
};

interface DependencyContextType {
  repository: AppointmentRepository;
  realTime: RealTimePort;
}

const DependencyContext = createContext<DependencyContextType | null>(null);

// HUMAN CHECK: Test-only version of DependencyProvider
// Uses mocks instead of real adapters. For production, use the real DependencyProvider.
export function TestDependencyProvider({ children }: { children: ReactNode }) {
  const dependencies = useMemo<DependencyContextType>(() => {
    return {
      repository: mockRepository,
      realTime: mockRealTime,
    };
  }, []);

  return (
    <DependencyContext.Provider value={dependencies}>
      {children}
    </DependencyContext.Provider>
  );
}

export function useDependencies(): DependencyContextType {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error(
      "useDependencies must be used within a TestDependencyProvider or DependencyProvider",
    );
  }
  return context;
}

/**
 * Reset all mocks to their initial state
 * Call this in afterEach() of your tests
 */
export function resetMocks() {
  mockRepository.getAppointments.mockClear();
  mockRepository.createAppointment.mockClear();
  mockRealTime.connect.mockClear();
  mockRealTime.disconnect.mockClear();
  mockRealTime.onSnapshot.mockClear();
  mockRealTime.onAppointmentUpdated.mockClear();
  mockRealTime.onAppointmentCalled.mockClear();
  mockRealTime.onConnect.mockClear();
  mockRealTime.onDisconnect.mockClear();
  mockRealTime.onError.mockClear();
  mockRealTime.isConnected.mockClear();
}
