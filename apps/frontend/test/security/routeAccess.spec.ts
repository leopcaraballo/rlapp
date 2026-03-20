import { env } from "@/config/env";
import type { UserRole } from "@/security/auth";
import {
  getDefaultRoute,
  isMonitorPath,
  isPublicPath,
  isRouteAllowed,
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

  describe("isMonitorPath()", () => {
    it("should return true for monitor paths", () => {
      expect(isMonitorPath("/monitor/QUEUE-01")).toBe(true);
      expect(isMonitorPath("/monitor/ANY-QUEUE")).toBe(true);
      expect(isMonitorPath("/monitor")).toBe(true);
    });

    it("should return false for non-monitor paths", () => {
      expect(isMonitorPath("/atencion")).toBe(false);
      expect(isMonitorPath("/reception")).toBe(false);
      expect(isMonitorPath("/payment")).toBe(false);
      expect(isMonitorPath("/medical")).toBe(false);
      expect(isMonitorPath("/")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Patient role", () => {
    const role: UserRole = "patient";

    it("should allow monitor routes", () => {
      expect(isRouteAllowed(role, "/monitor/QUEUE-01")).toBe(true);
      expect(isRouteAllowed(role, "/monitor")).toBe(true);
    });

    it("should forbid staff routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(false);
      expect(isRouteAllowed(role, "/payment")).toBe(false);
      expect(isRouteAllowed(role, "/medical")).toBe(false);
      expect(isRouteAllowed(role, "/dashboard")).toBe(false);
      expect(isRouteAllowed(role, "/stations")).toBe(false);
    });

    it("should forbid atencion for patient", () => {
      expect(isRouteAllowed(role, "/atencion/QUEUE-01")).toBe(false);
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

    it("should allow atencion", () => {
      expect(isRouteAllowed(role, "/atencion/QUEUE-01")).toBe(true);
    });

    it("should allow monitor", () => {
      expect(isRouteAllowed(role, "/monitor/QUEUE-01")).toBe(true);
    });

    it("should allow root", () => {
      expect(isRouteAllowed(role, "/")).toBe(true);
    });

    it("should forbid payment routes", () => {
      expect(isRouteAllowed(role, "/payment")).toBe(false);
    });

    it("should forbid medical routes", () => {
      expect(isRouteAllowed(role, "/medical")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Cashier role", () => {
    const role: UserRole = "cashier";

    it("should allow payment routes", () => {
      expect(isRouteAllowed(role, "/payment")).toBe(true);
      expect(isRouteAllowed(role, "/payment/receipts")).toBe(true);
    });

    it("should allow dashboard", () => {
      expect(isRouteAllowed(role, "/dashboard")).toBe(true);
    });

    it("should allow atencion", () => {
      expect(isRouteAllowed(role, "/atencion/QUEUE-01")).toBe(true);
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

    it("should forbid stations (admin only)", () => {
      expect(isRouteAllowed(role, "/stations")).toBe(false);
    });

    it("should allow dashboard", () => {
      expect(isRouteAllowed(role, "/dashboard")).toBe(true);
    });

    it("should allow atencion", () => {
      expect(isRouteAllowed(role, "/atencion/QUEUE-01")).toBe(true);
    });

    it("should forbid reception routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(false);
    });

    it("should forbid payment routes", () => {
      expect(isRouteAllowed(role, "/payment")).toBe(false);
    });
  });

  describe("isRouteAllowed() — Admin role", () => {
    const role: UserRole = "admin";

    it("should allow all staff routes", () => {
      expect(isRouteAllowed(role, "/reception")).toBe(true);
      expect(isRouteAllowed(role, "/payment")).toBe(true);
      expect(isRouteAllowed(role, "/medical")).toBe(true);
    });

    it("should allow all display and monitoring routes", () => {
      expect(isRouteAllowed(role, "/monitor/QUEUE-01")).toBe(true);
      expect(isRouteAllowed(role, "/stations")).toBe(true);
      expect(isRouteAllowed(role, "/dashboard")).toBe(true);
    });

    it("should allow root", () => {
      expect(isRouteAllowed(role, "/")).toBe(true);
    });

    it("should allow atencion", () => {
      expect(isRouteAllowed(role, "/atencion/QUEUE-01")).toBe(true);
    });

    it("should allow test and register routes", () => {
      expect(isRouteAllowed(role, "/test")).toBe(true);
      expect(isRouteAllowed(role, "/register")).toBe(true);
    });
  });

  describe("getDefaultRoute()", () => {
    it("should return monitor route for patient", () => {
      const route = getDefaultRoute(
        "patient",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toMatch(/^\/monitor/);
    });

    it("should return reception route for reception role", () => {
      const route = getDefaultRoute(
        "reception",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/reception");
    });

    it("should return payment route for cashier role", () => {
      const route = getDefaultRoute(
        "cashier",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/payment");
    });

    it("should return medical route for doctor role", () => {
      const route = getDefaultRoute(
        "doctor",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/medical");
    });

    it("should return stations for admin role", () => {
      const route = getDefaultRoute(
        "admin",
        env.DEFAULT_QUEUE_ID || "QUEUE-01",
      );
      expect(route).toBe("/stations");
    });

    it("should encode queue ID for patient route", () => {
      const queueId = "QUEUE WITH SPACES";
      const route = getDefaultRoute("patient", queueId);
      expect(route).toBe(`/monitor/${encodeURIComponent(queueId)}`);
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
        "/payment",
        "/medical",
        "/stations",
        "/dashboard",
      ];

      staffRoutes.forEach((route) => {
        expect(isRouteAllowed("patient", route)).toBe(false);
      });
    });

    it("should allow each role their primary routes", () => {
      const roleRoutes: Record<UserRole, string[]> = {
        patient: ["/monitor/QUEUE-01"],
        reception: ["/reception"],
        cashier: ["/payment"],
        doctor: ["/medical"],
        admin: ["/reception", "/payment", "/medical"],
      };

      Object.entries(roleRoutes).forEach(([role, routes]) => {
        routes.forEach((route) => {
          expect(isRouteAllowed(role as UserRole, route)).toBe(true);
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
          expect(isRouteAllowed(role, "/atencion/QUEUE-01")).toBe(true);
          expect(isRouteAllowed(role, "/monitor/QUEUE-01")).toBe(true);
        }
      });
    });
  });
});
