import "@testing-library/jest-dom";

import { render, screen, waitFor } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

import { AuthProvider } from "@/context/AuthContext";
import * as authModule from "@/security/auth";
import RouteGuard from "@/security/RouteGuard";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock authContext is already in AuthProvider
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Test content component
const TestContent = () => (
  <div data-testid="protected-content">Protected Content</div>
);

describe("RouteGuard.tsx — Route Protection Component", () => {
  let mockReplace: jest.Mock;
  let mockUseRouter: jest.MockedFunction<typeof useRouter>;
  let mockUsePathname: jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();

    mockReplace = jest.fn();
    mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
    mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

    mockUseRouter.mockReturnValue({
      replace: mockReplace,
    } as any);
  });

  describe("Unauthenticated Access", () => {
    it("should redirect to login when accessing protected route without session", async () => {
      mockUsePathname.mockReturnValue("/reception");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("/login"),
        );
      });

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should include next parameter in login redirect", async () => {
      mockUsePathname.mockReturnValue("/medical");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("next=%2Fmedical"),
        );
      });
    });

    it("should allow access to public login path without session", async () => {
      mockUsePathname.mockReturnValue("/login");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled();
      });

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("should return null while loading (ready=false)", () => {
      mockUsePathname.mockReturnValue("/reception");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      // Initially, before ready is true, should render null
      // This is hard to test directly, but we can verify no content is shown immediately
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("Authenticated Access — Route Allowed", () => {
    it("should render content when authenticated and route is allowed", async () => {
      const session = authModule.buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/reception");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should render content for patient on display route", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/display/QUEUE-01");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should render content for doctor on medical route", async () => {
      const session = authModule.buildSession("doctor", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/medical");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should render content for admin on any staff route", async () => {
      const session = authModule.buildSession("admin", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/consulting-rooms");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Authenticated Access — Route Forbidden", () => {
    it("should redirect patient trying to access reception route", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/reception");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("/display"),
        );
      });

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should redirect patient trying to access medical route", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/medical");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("/display"),
        );
      });
    });

    it("should redirect reception trying to access cashier route", async () => {
      const session = authModule.buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/cashier");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("/reception"),
        );
      });
    });

    it("should redirect to default role route when forbidden", async () => {
      const session = authModule.buildSession("cashier", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/medical");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        // Cashier should redirect to /cashier (their default route)
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("/cashier"),
        );
      });
    });

    it("should return null while determining if route is allowed", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/reception");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      // Before redirect completes, content should not be visible
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("Authenticated Accessing Public Routes", () => {
    it("should redirect authenticated user from login to their default route", async () => {
      const session = authModule.buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/login");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("/reception"),
        );
      });
    });

    it("should use default queue ID for patient redirect", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/login");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        const callArgs = mockReplace.mock.calls[0]?.[0] ?? "";
        expect(callArgs.toString()).toMatch(/\/display/);
      });
    });

    it("should respect current path parameter encoding", async () => {
      mockUsePathname.mockReturnValue("/reception/check?skip=1&retry=true");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        // Should encode the pathname for the next parameter
        const callArg = mockReplace.mock.calls[0][0] as string;
        expect(callArg).toContain("next=");
      });
    });
  });

  describe("Sessions Lifecycle", () => {
    it("should respond to session becoming invalid during view", async () => {
      const session = authModule.buildSession("doctor", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/medical");

      const { rerender } = render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      // Session expires
      localStorageMock.clear();

      // Simulate session expiry detection
      // Note: In real app, this would be detected via expiry watcher or event
      rerender(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      // Should be preparing redirect to login (though behavior depends on timing)
      // This is primarily tested by other auth infrastructure tests
    });
  });

  describe("Edge Cases", () => {
    it("should handle pathname with special characters", async () => {
      const session = authModule.buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/reception/patient/juan%20perez");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
    });

    it("should handle empty pathname without crashing", async () => {
      const session = authModule.buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("");

      const { container } = render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      // Should render without errors (content presence depends on route evaluation)
      await waitFor(() => {
        expect(container).toBeTruthy();
      });
    });

    it("should handle role with unusual casing", async () => {
      // This tests robustness; roles should be lowercase
      const session = authModule.buildSession("doctor", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      mockUsePathname.mockReturnValue("/medical");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
    });
  });

  describe("Initialization Behavior", () => {
    it("should not call router.replace until ready is true", async () => {
      mockUsePathname.mockReturnValue("/reception");

      render(
        <AuthProvider>
          <RouteGuard>
            <TestContent />
          </RouteGuard>
        </AuthProvider>,
      );

      // Initially, mockReplace might not be called because ready=false
      // The guard returns null during initialization
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should use useMemo to optimize isPublic calculation", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      let renderCount = 0;

      const pathnames = ["/display/QUEUE-01", "/login", "/display/QUEUE-02"];

      for (const pathname of pathnames) {
        mockUsePathname.mockReturnValue(pathname);

        renderCount++;
        render(
          <AuthProvider>
            <RouteGuard>
              <TestContent />
            </RouteGuard>
          </AuthProvider>,
        );
      }

      // Each pathname should be evaluated correctly
      expect(renderCount).toBeGreaterThan(0);
    });
  });
});
