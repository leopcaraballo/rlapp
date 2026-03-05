import {
  AuthSession,
  buildSession,
  clearSession,
  getAuthHeaders,
  isSessionExpired,
  loadSession,
  saveSession,
  UserRole,
} from "@/security/auth";

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

describe("auth.ts — Session Management", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("buildSession()", () => {
    it("should create a valid session with role and TTL", () => {
      const now = Date.now();
      const session = buildSession("patient", 120);

      expect(session.role).toBe("patient");
      expect(session.token).toBeDefined();
      expect(typeof session.token).toBe("string");
      expect(session.exp).toBeGreaterThan(now);
    });

    it("should calculate expiry correctly from TTL minutes", () => {
      const ttlMinutes = 60;
      const beforeBuild = Date.now();
      const session = buildSession("reception", ttlMinutes);
      const afterBuild = Date.now();

      const expectedMinExp = beforeBuild + ttlMinutes * 60_000;
      const expectedMaxExp = afterBuild + ttlMinutes * 60_000;

      expect(session.exp).toBeGreaterThanOrEqual(expectedMinExp);
      expect(session.exp).toBeLessThanOrEqual(expectedMaxExp);
    });

    it("should default to 120 minutes TTL when not specified", () => {
      const session = buildSession("doctor");
      const now = Date.now();
      const expectedMin = now + 120 * 60_000 - 1000;
      const expectedMax = now + 120 * 60_000 + 1000;

      expect(session.exp).toBeGreaterThanOrEqual(expectedMin);
      expect(session.exp).toBeLessThanOrEqual(expectedMax);
    });

    it("should create session for all valid roles", () => {
      const roles: UserRole[] = [
        "patient",
        "reception",
        "cashier",
        "doctor",
        "admin",
      ];

      roles.forEach((role) => {
        const session = buildSession(role);
        expect(session.role).toBe(role);
        expect(session.token).toBeDefined();
      });
    });
  });

  describe("saveSession()", () => {
    it("should save session to localStorage", () => {
      const session = buildSession("patient");
      saveSession(session);

      const stored = window.localStorage.getItem("rlapp_auth");
      expect(stored).toBeDefined();
      expect(stored).not.toBeNull();
    });

    it("should serialize session correctly", () => {
      const session = buildSession("cashier");
      saveSession(session);

      const stored = window.localStorage.getItem("rlapp_auth");
      const parsed = JSON.parse(stored!) as AuthSession;

      expect(parsed.role).toBe("cashier");
      expect(parsed.token).toBe(session.token);
      expect(parsed.exp).toBe(session.exp);
    });

    it("should dispatch AUTH_CHANGED_EVENT when saving", () => {
      const listener = jest.fn();
      window.addEventListener("rlapp:auth-changed", listener);
      const session = buildSession("doctor");

      saveSession(session);

      expect(listener).toHaveBeenCalled();

      window.removeEventListener("rlapp:auth-changed", listener);
    });

    it("should handle server-side rendering (no window.localStorage available)", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      // Should not throw
      expect(() => {
        saveSession(buildSession("patient"));
      }).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("loadSession()", () => {
    it("should load valid session from localStorage", () => {
      const originalSession = buildSession("reception");
      saveSession(originalSession);

      const loaded = loadSession();

      expect(loaded).not.toBeNull();
      expect(loaded?.role).toBe("reception");
      expect(loaded?.token).toBe(originalSession.token);
    });

    it("should return null when no session stored", () => {
      const loaded = loadSession();
      expect(loaded).toBeNull();
    });

    it("should return null when session is corrupted JSON", () => {
      window.localStorage.setItem("rlapp_auth", "invalid json {");

      const loaded = loadSession();
      expect(loaded).toBeNull();
    });

    it("should return null when session missing required fields", () => {
      window.localStorage.setItem(
        "rlapp_auth",
        JSON.stringify({ role: "patient" }),
      );

      const loaded = loadSession();
      expect(loaded).toBeNull();
    });

    it("should return null and clear expired session", () => {
      const expiredSession: AuthSession = {
        token: "expired-token",
        role: "patient",
        exp: Date.now() - 1000, // Expired 1 second ago
      };
      window.localStorage.setItem("rlapp_auth", JSON.stringify(expiredSession));

      const loaded = loadSession();

      expect(loaded).toBeNull();
      expect(window.localStorage.getItem("rlapp_auth")).toBeNull();
    });

    it("should handle server-side rendering (no window.localStorage available)", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const loaded = loadSession();

      expect(loaded).toBeNull();

      global.window = originalWindow;
    });
  });

  describe("isSessionExpired()", () => {
    it("should return true when session is expired", () => {
      const session: AuthSession = {
        token: "test-token",
        role: "patient",
        exp: Date.now() - 1000,
      };

      expect(isSessionExpired(session)).toBe(true);
    });

    it("should return false when session is valid", () => {
      const session: AuthSession = {
        token: "test-token",
        role: "patient",
        exp: Date.now() + 60_000,
      };

      expect(isSessionExpired(session)).toBe(false);
    });

    it("should return true when expiry equals current time", () => {
      const now = Date.now();
      const session: AuthSession = {
        token: "test-token",
        role: "patient",
        exp: now,
      };

      expect(isSessionExpired(session, now)).toBe(true);
    });

    it("should return false when expiry is 1ms in future", () => {
      const now = Date.now();
      const session: AuthSession = {
        token: "test-token",
        role: "patient",
        exp: now + 1,
      };

      expect(isSessionExpired(session, now)).toBe(false);
    });

    it("should accept custom timestamp parameter", () => {
      const session: AuthSession = {
        token: "test-token",
        role: "patient",
        exp: 100,
      };

      expect(isSessionExpired(session, 99)).toBe(false);
      expect(isSessionExpired(session, 100)).toBe(true);
      expect(isSessionExpired(session, 101)).toBe(true);
    });
  });

  describe("clearSession()", () => {
    it("should remove session from localStorage", () => {
      const session = buildSession("admin");
      saveSession(session);

      expect(window.localStorage.getItem("rlapp_auth")).not.toBeNull();

      clearSession();

      expect(window.localStorage.getItem("rlapp_auth")).toBeNull();
    });

    it("should dispatch AUTH_CHANGED_EVENT when clearing", () => {
      const listener = jest.fn();
      window.addEventListener("rlapp:auth-changed", listener);
      saveSession(buildSession("patient"));
      listener.mockClear();

      clearSession();

      expect(listener).toHaveBeenCalled();

      window.removeEventListener("rlapp:auth-changed", listener);
    });

    it("should handle server-side rendering (no window.localStorage available)", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      // Should not throw
      expect(() => {
        clearSession();
      }).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("Integration: Full Lifecycle", () => {
    it("should handle complete session lifecycle", () => {
      // Build
      const session = buildSession("cashier", 60);
      expect(session.role).toBe("cashier");

      // Save
      saveSession(session);
      expect(window.localStorage.getItem("rlapp_auth")).not.toBeNull();

      // Load
      const loaded = loadSession();
      expect(loaded).toEqual(session);

      // Check expiry (should be valid)
      expect(isSessionExpired(loaded!)).toBe(false);

      // Clear
      clearSession();
      expect(window.localStorage.getItem("rlapp_auth")).toBeNull();
      expect(loadSession()).toBeNull();
    });

    it("should expire session after TTL", () => {
      const session = buildSession("doctor", 0.001); // ~0.06 seconds TTL
      saveSession(session);

      // Immediately: not expired
      expect(isSessionExpired(session)).toBe(false);

      // After expiry time
      const futureTime = session.exp + 1;
      expect(isSessionExpired(session, futureTime)).toBe(true);
    });
  });

  describe("getAuthHeaders()", () => {
    beforeEach(() => {
      localStorageMock.clear();
    });

    it("should return empty object when no session exists", () => {
      const headers = getAuthHeaders();
      expect(headers).toEqual({});
    });

    it("should return Authorization header with session token", () => {
      const session = buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      const headers = getAuthHeaders();
      expect(headers.Authorization).toEqual(`Bearer ${session.token}`);
    });

    it("should include X-User-Role header for non-patient roles", () => {
      const session = buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      const headers = getAuthHeaders();
      expect(headers["X-User-Role"]).toBe("Receptionist");
    });

    it("should map reception role to Receptionist", () => {
      const session = buildSession("reception", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      const headers = getAuthHeaders();
      expect(headers["X-User-Role"]).toBe("Receptionist");
    });

    it("should map cashier role to Cashier", () => {
      const session = buildSession("cashier", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      const headers = getAuthHeaders();
      expect(headers["X-User-Role"]).toBe("Cashier");
    });

    it("should map doctor role to Doctor", () => {
      const session = buildSession("doctor", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      const headers = getAuthHeaders();
      expect(headers["X-User-Role"]).toBe("Doctor");
    });

    it("should map admin role to Admin", () => {
      const session = buildSession("admin", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      const headers = getAuthHeaders();
      expect(headers["X-User-Role"]).toBe("Admin");
    });

    it("should exclude X-User-Role for patient role", () => {
      const session = buildSession("patient", 120);
      localStorageMock.setItem("rlapp_auth", JSON.stringify(session));

      const headers = getAuthHeaders();
      expect(headers["X-User-Role"]).toBeUndefined();
      expect(headers.Authorization).toEqual(`Bearer ${session.token}`);
    });
  });
});
