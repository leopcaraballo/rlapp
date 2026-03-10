import { renderHook } from "@testing-library/react";

import {
  mockRealTime,
  mockRepository,
  resetMocks,
  TestDependencyProvider,
  useDependencies,
} from "./DependencyContext.mock";

describe("DependencyContext mock", () => {
  afterEach(() => {
    resetMocks();
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useDependencies())).toThrow(
      /must be used within a TestDependencyProvider/,
    );
  });

  it("returns mocked dependencies inside provider", () => {
    const { result } = renderHook(() => useDependencies(), {
      wrapper: TestDependencyProvider,
    });

    expect(result.current.repository).toBe(mockRepository);
    expect(result.current.realTime).toBe(mockRealTime);
    expect(mockRealTime.isConnected()).toBe(true);
  });

  it("resets mock call history", () => {
    mockRepository.getAppointments.mockResolvedValue([]);
    mockRealTime.connect();
    mockRealTime.disconnect();

    expect(mockRealTime.connect).toHaveBeenCalled();
    expect(mockRealTime.disconnect).toHaveBeenCalled();

    resetMocks();

    expect(mockRealTime.connect).not.toHaveBeenCalled();
    expect(mockRealTime.disconnect).not.toHaveBeenCalled();
    expect(mockRepository.getAppointments).not.toHaveBeenCalled();
  });
});
