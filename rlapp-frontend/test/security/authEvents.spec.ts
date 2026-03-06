import {
  AUTH_CHANGED_EVENT,
  AUTH_INVALID_EVENT,
  type AuthInvalidDetail,
  dispatchAuthChanged,
  dispatchAuthInvalid,
} from "@/security/authEvents";

describe("authEvents.ts — Auth Event Dispatching", () => {
  let dispatchEventSpy: jest.SpyInstance;

  beforeEach(() => {
    dispatchEventSpy = jest.spyOn(window, "dispatchEvent");
  });

  afterEach(() => {
    dispatchEventSpy.mockRestore();
  });

  describe("dispatchAuthChanged()", () => {
    it("should dispatch AUTH_CHANGED_EVENT", () => {
      dispatchAuthChanged();

      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(AUTH_CHANGED_EVENT);
    });

    it("should dispatch CustomEvent type", () => {
      dispatchAuthChanged();

      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomEvent);
    });

    it("should dispatch event with correct event name constant", () => {
      dispatchAuthChanged();

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe("rlapp:auth-changed");
    });

    it("should handle server-side rendering (no window.dispatchEvent available)", () => {
      const originalWindow = global.window;
      // @ts-expect-error -- global.window is deletable in Node.js test context to simulate SSR
      delete global.window;

      expect(() => {
        dispatchAuthChanged();
      }).not.toThrow();

      global.window = originalWindow;
    });

    it("should be callable multiple times without error", () => {
      dispatchAuthChanged();
      dispatchAuthChanged();
      dispatchAuthChanged();

      expect(dispatchEventSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("dispatchAuthInvalid()", () => {
    it("should dispatch AUTH_INVALID_EVENT", () => {
      const detail: AuthInvalidDetail = { reason: "expired" };
      dispatchAuthInvalid(detail);

      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(AUTH_INVALID_EVENT);
    });

    it("should include detail in event", () => {
      const detail: AuthInvalidDetail = {
        reason: "unauthorized",
        status: 401,
        path: "/medical",
      };
      dispatchAuthInvalid(detail);

      const event = dispatchEventSpy.mock
        .calls[0][0] as CustomEvent<AuthInvalidDetail>;
      expect(event.detail).toEqual(detail);
    });

    it("should dispatch with reason only", () => {
      const detail: AuthInvalidDetail = { reason: "forbidden" };
      dispatchAuthInvalid(detail);

      const event = dispatchEventSpy.mock
        .calls[0][0] as CustomEvent<AuthInvalidDetail>;
      expect(event.detail.reason).toBe("forbidden");
      expect(event.detail.status).toBeUndefined();
      expect(event.detail.path).toBeUndefined();
    });

    it("should dispatch with reason and status", () => {
      const detail: AuthInvalidDetail = {
        reason: "unauthorized",
        status: 401,
      };
      dispatchAuthInvalid(detail);

      const event = dispatchEventSpy.mock
        .calls[0][0] as CustomEvent<AuthInvalidDetail>;
      expect(event.detail.reason).toBe("unauthorized");
      expect(event.detail.status).toBe(401);
    });

    it("should dispatch with reason and path", () => {
      const detail: AuthInvalidDetail = {
        reason: "missing",
        path: "/reception",
      };
      dispatchAuthInvalid(detail);

      const event = dispatchEventSpy.mock
        .calls[0][0] as CustomEvent<AuthInvalidDetail>;
      expect(event.detail.reason).toBe("missing");
      expect(event.detail.path).toBe("/reception");
    });

    it("should dispatch with all detail fields", () => {
      const detail: AuthInvalidDetail = {
        reason: "expired",
        status: 401,
        path: "/cashier",
      };
      dispatchAuthInvalid(detail);

      const event = dispatchEventSpy.mock
        .calls[0][0] as CustomEvent<AuthInvalidDetail>;
      expect(event.detail).toEqual(detail);
    });

    it("should support all valid reasons", () => {
      const reasons: AuthInvalidDetail["reason"][] = [
        "unauthorized",
        "forbidden",
        "expired",
        "missing",
      ];

      reasons.forEach((reason) => {
        dispatchEventSpy.mockClear();
        dispatchAuthInvalid({ reason });

        const event = dispatchEventSpy.mock
          .calls[0][0] as CustomEvent<AuthInvalidDetail>;
        expect(event.detail.reason).toBe(reason);
      });
    });

    it("should handle server-side rendering (no window.dispatchEvent available)", () => {
      const originalWindow = global.window;
      // @ts-expect-error -- global.window is deletable in Node.js test context to simulate SSR
      delete global.window;

      const detail: AuthInvalidDetail = { reason: "expired" };

      expect(() => {
        dispatchAuthInvalid(detail);
      }).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("Event Constants", () => {
    it("should export correct event name for AUTH_CHANGED_EVENT", () => {
      expect(AUTH_CHANGED_EVENT).toBe("rlapp:auth-changed");
    });

    it("should export correct event name for AUTH_INVALID_EVENT", () => {
      expect(AUTH_INVALID_EVENT).toBe("rlapp:auth-invalid");
    });

    it("should have unique event names", () => {
      expect(AUTH_CHANGED_EVENT).not.toBe(AUTH_INVALID_EVENT);
    });
  });

  describe("Event Listener Integration", () => {
    it("should allow listening to AUTH_CHANGED_EVENT", (done) => {
      const listener = jest.fn();
      window.addEventListener(AUTH_CHANGED_EVENT, listener);

      dispatchAuthChanged();

      // Allow minimal time for event dispatch and listener execution
      setTimeout(() => {
        expect(listener).toHaveBeenCalled();
        window.removeEventListener(AUTH_CHANGED_EVENT, listener);
        done();
      }, 10);
    });

    it("should allow listening to AUTH_INVALID_EVENT", (done) => {
      const listener = jest.fn();
      window.addEventListener(AUTH_INVALID_EVENT, listener);

      const detail: AuthInvalidDetail = { reason: "expired" };
      dispatchAuthInvalid(detail);

      setTimeout(() => {
        expect(listener).toHaveBeenCalled();
        const event = listener.mock
          .calls[0][0] as CustomEvent<AuthInvalidDetail>;
        expect(event.detail.reason).toBe("expired");
        window.removeEventListener(AUTH_INVALID_EVENT, listener);
        done();
      }, 10);
    });

    it("should not trigger AUTH_CHANGED_EVENT listener when dispatching AUTH_INVALID_EVENT", (done) => {
      const changedListener = jest.fn();
      window.addEventListener(AUTH_CHANGED_EVENT, changedListener);

      const detail: AuthInvalidDetail = { reason: "expired" };
      dispatchAuthInvalid(detail);

      setTimeout(() => {
        expect(changedListener).not.toHaveBeenCalled();
        window.removeEventListener(AUTH_CHANGED_EVENT, changedListener);
        done();
      }, 10);
    });

    it("should allow multiple listeners to same event", (done) => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      window.addEventListener(AUTH_CHANGED_EVENT, listener1);
      window.addEventListener(AUTH_CHANGED_EVENT, listener2);

      dispatchAuthChanged();

      setTimeout(() => {
        expect(listener1).toHaveBeenCalled();
        expect(listener2).toHaveBeenCalled();
        window.removeEventListener(AUTH_CHANGED_EVENT, listener1);
        window.removeEventListener(AUTH_CHANGED_EVENT, listener2);
        done();
      }, 10);
    });
  });
});
