import type { UserRole } from "./auth";

export const LOGIN_PATH = "/login";

const MONITOR_PREFIX = "/monitor";
const ATENCION_PREFIX = "/atencion";

const ROLE_ROUTES: Record<UserRole, (path: string) => boolean> = {
  patient: (path) => isMonitorPath(path),
  reception: (path) =>
    isMonitorPath(path) ||
    path === "/" ||
    path.startsWith("/reception") ||
    path.startsWith(ATENCION_PREFIX) ||
    path.startsWith("/dashboard"),
  cashier: (path) =>
    isMonitorPath(path) ||
    path === "/" ||
    path.startsWith("/payment") ||
    path.startsWith(ATENCION_PREFIX) ||
    path.startsWith("/dashboard"),
  doctor: (path) =>
    isMonitorPath(path) ||
    path === "/" ||
    path.startsWith("/medical") ||
    path.startsWith(ATENCION_PREFIX) ||
    path.startsWith("/dashboard"),
  admin: (path) =>
    isMonitorPath(path) ||
    path === "/" ||
    path.startsWith("/stations") ||
    path.startsWith("/reception") ||
    path.startsWith("/payment") ||
    path.startsWith("/medical") ||
    path.startsWith(ATENCION_PREFIX) ||
    path.startsWith("/dashboard") ||
    path.startsWith("/register") ||
    path.startsWith("/test"),
};

export function isPublicPath(path: string): boolean {
  return path === LOGIN_PATH || path === "/register";
}

export function isMonitorPath(path: string): boolean {
  return path.startsWith(MONITOR_PREFIX);
}

export function isRouteAllowed(role: UserRole, path: string): boolean {
  const checker = ROLE_ROUTES[role];
  return checker ? checker(path) : false;
}

export function getDefaultRoute(
  role: UserRole,
  defaultServiceId: string,
): string {
  switch (role) {
    case "patient":
      return `${MONITOR_PREFIX}/${encodeURIComponent(defaultServiceId)}`;
    case "reception":
      return "/reception";
    case "cashier":
      return "/payment";
    case "doctor":
      return "/medical";
    case "admin":
    default:
      return "/stations";
  }
}
