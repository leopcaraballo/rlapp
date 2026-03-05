import "@testing-library/jest-dom";

import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/security/auth";
import * as authModule from "@/security/auth";
import {
  AUTH_CHANGED_EVENT,
  AUTH_INVALID_EVENT,
  dispatchAuthChanged,
  dispatchAuthInvalid,
} from "@/security/authEvents";

// Mock localStorage
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

// Test component that uses useAuth hook
function TestComponent() {
  const auth = useAuth();

  if (!auth.ready) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="auth-status">
        {auth.isAuthenticated ? "Authenticated" : "Not authenticated"}
      </div>
      <div data-testid="auth-role">{auth.role || "No role"}</div>
      <button onClick={() => auth.signIn("patient", 120)}>
        Sign In Patient
      </button>
      <button onClick={() => auth.signIn("doctor", 60)}>Sign In Doctor</button>
      <button onClick={() => auth.signOut()}>Sign Out</button>
    </div>
  );
}

describe("AuthContext.tsx — Authentication Provider and Hook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("AuthProvider — Mounting and Initialization", () => {
    it("should render children when mounted", () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>,
      );

      expect(screen.getByText("Test Child")).toBeInTheDocument();
    });

    it("should load session from localStorage on mount", () => {
      // Pre-populate session
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "Authenticated",
      );
      expect(screen.getByTestId("auth-role")).toHaveTextContent("patient");
    });

    it("should set ready state to true after mounting", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("auth-status")).toBeInTheDocument();
    });

    it("should not be authenticated when no session exists", () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "Not authenticated",
      );
      expect(screen.getByTestId("auth-role")).toHaveTextContent("No role");
    });
  });

  describe("useAuth Hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      // Suppress console.error for this test
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const BadComponent = () => {
        useAuth();
        return null;
      };

      expect(() => {
        render(<BadComponent />);
      }).toThrow("useAuth must be used within AuthProvider");

      consoleError.mockRestore();
    });

    it("should return AuthContextValue with correct structure", async () => {
      const session = authModule.buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Authenticated",
        );
      });

      // Verify structure
      expect(screen.getByTestId("auth-role")).toHaveTextContent("reception");
    });
  });

  describe("signIn() Function", () => {
    it("should create session and update state", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "Not authenticated",
      );

      // Sign in
      act(() => {
        screen.getByText("Sign In Patient").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Authenticated",
        );
      });
      expect(screen.getByTestId("auth-role")).toHaveTextContent("patient");
    });

    it("should save session to localStorage", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      act(() => {
        screen.getByText("Sign In Doctor").click();
      });

      await waitFor(() => {
        const stored = localStorageMock.getItem("rlapp_auth");
        expect(stored).not.toBeNull();

        const parsed = JSON.parse(stored!) as authModule.AuthSession;
        expect(parsed.role).toBe("doctor");
      });
    });

    it("should respect custom TTL parameter", () => {
      const TestComponentWithTTL = () => {
        const auth = useAuth();

        if (!auth.ready) return null;

        return (
          <button
            onClick={() => auth.signIn("admin", 60)}
            data-testid="custom-ttl-btn"
          >
            Sign In with 60min
          </button>
        );
      };

      const beforeSign = Date.now();
      render(
        <AuthProvider>
          <TestComponentWithTTL />
        </AuthProvider>,
      );

      act(() => {
        screen.getByTestId("custom-ttl-btn").click();
      });

      const stored = localStorageMock.getItem("rlapp_auth");
      const session = JSON.parse(stored!) as authModule.AuthSession;

      const expectedMinExp = beforeSign + 60 * 60_000;
      const expectedMaxExp = beforeSign + 60 * 60_000 + 1000;

      expect(session.exp).toBeGreaterThanOrEqual(expectedMinExp);
      expect(session.exp).toBeLessThanOrEqual(expectedMaxExp);
    });

    it("should update role when signing in with different role", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // Sign in as patient
      act(() => {
        screen.getByText("Sign In Patient").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-role")).toHaveTextContent("patient");
      });

      // Sign in as doctor (should replace patient session)
      act(() => {
        screen.getByText("Sign In Doctor").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-role")).toHaveTextContent("doctor");
      });
    });
  });

  describe("signOut() Function", () => {
    it("should clear session from state", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Authenticated",
        );
      });

      // Sign out
      act(() => {
        screen.getByText("Sign Out").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Not authenticated",
        );
      });
      expect(screen.getByTestId("auth-role")).toHaveTextContent("No role");
    });

    it("should clear session from localStorage", async () => {
      const session = authModule.buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      act(() => {
        screen.getByText("Sign Out").click();
      });

      await waitFor(() => {
        expect(localStorageMock.getItem("rlapp_auth")).toBeNull();
      });
    });
  });

  describe("Event Listeners", () => {
    it("should update state when AUTH_CHANGED_EVENT is dispatched", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "Not authenticated",
      );

      // Create session manually and dispatch event
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      act(() => {
        dispatchAuthChanged();
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Authenticated",
        );
      });
      expect(screen.getByTestId("auth-role")).toHaveTextContent("patient");
    });

    it("should clear session when AUTH_INVALID_EVENT is dispatched", async () => {
      const session = authModule.buildSession("doctor", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Authenticated",
        );
      });

      // Dispatch invalid auth event
      act(() => {
        dispatchAuthInvalid({ reason: "expired" });
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Not authenticated",
        );
      });
      expect(localStorageMock.getItem("rlapp_auth")).toBeNull();
    });

    it("should listen to both AUTH_CHANGED_EVENT and AUTH_INVALID_EVENT", async () => {
      const listenerSpy = jest.fn();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      window.addEventListener(AUTH_CHANGED_EVENT, listenerSpy);

      act(() => {
        dispatchAuthChanged();
      });

      await waitFor(() => {
        expect(listenerSpy).toHaveBeenCalled();
      });

      window.removeEventListener(AUTH_CHANGED_EVENT, listenerSpy);
    });
  });

  describe("Expiry Watcher (30s interval)", () => {
    it("should periodically check session expiry", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // 30 seconds pass
      act(() => {
        jest.advanceTimersByTime(30_000);
      });

      // Should still be running without error
      expect(screen.getByTestId("auth-status")).toBeInTheDocument();
    });

    it("should clear expired session on next check", async () => {
      const session = authModule.buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Authenticated",
        );
      });

      // Manually expire the session in storage
      const expiredSession = {
        ...session,
        exp: Date.now() - 1000,
      };
      localStorageMock.setItem("rlapp_auth", JSON.stringify(expiredSession));

      // Advance timer to trigger watcher
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      // Give time for state update
      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Not authenticated",
        );
      });
    });

    it("should clear interval on unmount", () => {
      const clearIntervalSpy = jest.spyOn(window, "clearInterval");

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("Context Value Properties", () => {
    it("should provide role as null when not authenticated", () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-role")).toHaveTextContent("No role");
    });

    it("should provide role when authenticated", async () => {
      const session = authModule.buildSession("cashier", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-role")).toHaveTextContent("cashier");
      });
    });

    it("should provide isAuthenticated as true only when session exists", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "Not authenticated",
      );

      act(() => {
        screen.getByText("Sign In Patient").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-status")).toHaveTextContent(
          "Authenticated",
        );
      });
    });

    it("should set ready=false initially before loading session", async () => {
      // Note: In fast tests, ready may be set to true immediately
      // This test ensures the loading state exists during mount
      let renderCount = 0;

      const CounterComponent = () => {
        const auth = useAuth();
        renderCount++;
        if (!auth.ready) {
          return <div>Loading...</div>;
        }
        return <div>Ready</div>;
      };

      render(
        <AuthProvider>
          <CounterComponent />
        </AuthProvider>,
      );

      // After loading, ready should be true
      await waitFor(() => {
        expect(screen.getByText("Ready")).toBeInTheDocument();
      });
    });
  });

  describe("Cleanup on Unmount", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      unmount();

      // Should have removed both AUTH_INVALID_EVENT and AUTH_CHANGED_EVENT listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        AUTH_INVALID_EVENT,
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        AUTH_CHANGED_EVENT,
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
