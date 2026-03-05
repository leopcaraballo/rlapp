import { env } from "@/config/env";
import type { UserRole } from "@/security/auth";
import {
  getDefaultRoute,
  isDisplayPath,
  isPublicPath,
  isRouteAllowed,
  LOGIN_PATH,
} from "@/security/routeAccess";

describe("routeAccess.ts — Role-Based Access Control", () => {
  describe("isPublicPath()", () => {
    it("should return true for login path", () => {
      expect(isPublicPath("/login")).toBe(true);
    });

    it("should return false for protected paths", () => {
      expect(isPublicPath("/waiting-room/QUEUE-01")).toBe(false);
      expect(isPublicPath("/reception")).toBe(false);
      expect(isPublicPath("/cashier")).toBe(false);
      expect(isPublicPath("/medical")).toBe(false);
      expect(isPublicPath("/dashboard")).toBe(false);
    });

    it("should return false for non-existing paths", () => {
      expect(isPublicPath("/non-existent")).toBe(false);
    });
  });

  describe("isDisplayPath()", () => {
    it("should return true for display paths", () => {
      expect(isDisplayPath("/display/QUEUE-01")).toBe(true);
      expect(isDisplayPath("/display/ANY-QUEUE")).toBe(true);
      expect(isDisplayPath("/display")).toBe(true);
    });

    it("should return false for non-display paths", () => {
      expect(isDisplayPath("/waiting-room")).toBe(false);
      expect(isDisplayPath("/reception")).toBe(false);
      expect(isDisplayPath("/cashier")).toBe(false);
      expect(isDisplayPath("/medical")).toBe(false);
      expect(isDisplayPath("/")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Patient role", () => {
    const role: UserRole = "patient";

    it("should allow display routes", () => {
      expect(isRouteAllowed(role, "/display/QUEUE-01")).toBe(true);
      expect(isRouteAllowed(role, "/display")).toBe(true);
    });

    it("should forbid staff routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(false);
      expect(isRouteAllowed(role, "/cashier")).toBe(false);
      expect(isRouteAllowed(role, "/medical")).toBe(false);
      expect(isRouteAllowed(role, "/dashboard")).toBe(false);
      expect(isRouteAllowed(role, "/consulting-rooms")).toBe(false);
    });

    it("should forbid waiting-room for patient", () => {
      expect(isRouteAllowed(role, "/waiting-room/QUEUE-01")).toBe(false);
    });

    it("should forbid root for patient", () => {
      expect(isRouteAllowed(role, "/")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Reception role", () => {
    const role: UserRole = "reception";

    it("should allow reception routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(true);
      expect(isRouteAllowed(role, "/reception/check-in")).toBe(true);
    });

    it("should allow dashboard", () => {
      expect(isRouteAllowed(role, "/dashboard")).toBe(true);
    });

    it("should allow waiting-room", () => {
      expect(isRouteAllowed(role, "/waiting-room/QUEUE-01")).toBe(true);
    });

    it("should allow display", () => {
      expect(isRouteAllowed(role, "/display/QUEUE-01")).toBe(true);
    });

    it("should allow root", () => {
      expect(isRouteAllowed(role, "/")).toBe(true);
    });

    it("should forbid cashier routes", () => {
      expect(isRouteAllowed(role, "/cashier")).toBe(false);
    });

    it("should forbid medical routes", () => {
      expect(isRouteAllowed(role, "/medical")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Cashier role", () => {
    const role: UserRole = "cashier";

    it("should allow cashier routes", () => {
      expect(isRouteAllowed(role, "/cashier")).toBe(true);
      expect(isRouteAllowed(role, "/cashier/payments")).toBe(true);
    });

    it("should allow dashboard", () => {
      expect(isRouteAllowed(role, "/dashboard")).toBe(true);
    });

    it("should allow waiting-room", () => {
      expect(isRouteAllowed(role, "/waiting-room/QUEUE-01")).toBe(true);
    });

    it("should forbid reception routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(false);
    });

    it("should forbid medical routes", () => {
      expect(isRouteAllowed(role, "/medical")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Doctor role", () => {
    const role: UserRole = "doctor";

    it("should allow medical routes", () => {
      expect(isRouteAllowed(role, "/medical")).toBe(true);
      expect(isRouteAllowed(role, "/medical/patients")).toBe(true);
    });

    it("should forbid consulting-rooms (admin only)", () => {
      expect(isRouteAllowed(role, "/consulting-rooms")).toBe(false);
    });

    it("should allow dashboard", () => {
      expect(isRouteAllowed(role, "/dashboard")).toBe(true);
    });

    it("should allow waiting-room", () => {
      expect(isRouteAllowed(role, "/waiting-room/QUEUE-01")).toBe(true);
    });

    it("should forbid reception routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(false);
    });

    it("should forbid cashier routes", () => {
      expect(isRouteAllowed(role, "/cashier")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Admin role", () => {
    const role: UserRole = "admin";

    it("should allow all staff routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(true);
      expect(isRouteAllowed(role, "/cashier")).toBe(true);
      expect(isRouteAllowed(role, "/medical")).toBe(true);
    });

    it("should allow all display and monitoring routes", () => {
      expect(isRouteAllowed(role, "/display/QUEUE-01")).toBe(true);
      expect(isRouteAllowed(role, "/consulting-rooms")).toBe(true);
      expect(isRouteAllowed(role, "/dashboard")).toBe(true);
    });

    it("should allow root", () => {
      expect(isRouteAllowed(role, "/")).toBe(true);
    });

    it("should allow waiting-room", () => {
      expect(isRouteAllowed(role, "/waiting-room/QUEUE-01")).toBe(true);
    });

    it("should allow test and registration routes", () => {
      expect(isRouteAllowed(role, "/test")).toBe(true);
      expect(isRouteAllowed(role, "/registration")).toBe(true);
    });
  });

  describe("getDefaultRoute()", () => {
    it("should return display route for patient", () => {
      const route = getDefaultRoute(
        "patient",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toMatch(/^\/display/);
    });

    it("should return reception route for reception role", () => {
      const route = getDefaultRoute(
        "reception",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/reception");
    });

    it("should return cashier route for cashier role", () => {
      const route = getDefaultRoute(
        "cashier",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/cashier");
    });

    it("should return medical route for doctor role", () => {
      const route = getDefaultRoute(
        "doctor",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/medical");
    });

    it("should return consulting-rooms for admin role", () => {
      const route = getDefaultRoute(
        "admin",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/consulting-rooms");
    });

    it("should encode queue ID for patient route", () => {
      const queueId = "QUEUE WITH SPACES";
      const route = getDefaultRoute("patient", queueId);
      expect(route).toBe(`/display/${encodeURIComponent(queueId)}`);
    });

    it("should use provided defaultQueueId parameter", () => {
      const customQueueId = "CUSTOM-QUEUE-123";
      const route = getDefaultRoute("patient", customQueueId);
      expect(route).toContain(customQueueId);
    });
  });

  describe("RBAC Matrix Integrity", () => {
    it("should not allow patient to access any staff route", () => {
      const staffRoutes = [
        "/reception",
        "/cashier",
        "/medical",
        "/consulting-rooms",
        "/dashboard",
      ];

      staffRoutes.forEach((route) => {
        expect(isRouteAllowed("patient", route)).toBe(
          false,
          `Patient should not access ${route}`,
        );
      });
    });

    it("should allow each role their primary routes", () => {
      const roleRoutes: Record<UserRole, string[]> = {
        patient: ["/display/QUEUE-01"],
        reception: ["/reception"],
        cashier: ["/cashier"],
        doctor: ["/medical"],
        admin: ["/reception", "/cashier", "/medical"],
      };

      Object.entries(roleRoutes).forEach(([role, routes]) => {
        routes.forEach((route) => {
          expect(isRouteAllowed(role as UserRole, route)).toBe(
            true,
            `${role} should access ${route}`,
          );
        });
      });
    });

    it("should allow all roles to access waiting-room and display", () => {
      const roles: UserRole[] = [
        "patient",
        "reception",
        "cashier",
        "doctor",
        "admin",
      ];

      roles.forEach((role) => {
        if (role !== "patient") {
          expect(isRouteAllowed(role, "/waiting-room/QUEUE-01")).toBe(
            true,
            `${role} should access waiting-room`,
          );
          expect(isRouteAllowed(role, "/display/QUEUE-01")).toBe(
            true,
            `${role} should access display`,
          );
        }
      });
    });
  });
});
