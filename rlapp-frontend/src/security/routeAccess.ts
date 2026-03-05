import type { UserRole } from "./auth";

export const LOGIN_PATH = "/login";

const DISPLAY_PREFIX = "/display";
const WAITING_ROOM_PREFIX = "/waiting-room";

const ROLE_ROUTES: Record<UserRole, (path: string) => boolean> = {
  patient: (path) => isDisplayPath(path),
  reception: (path) =>
    isDisplayPath(path) ||
    path === "/" ||
    path.startsWith("/reception") ||
    path.startsWith(WAITING_ROOM_PREFIX) ||
    path.startsWith("/dashboard"),
  cashier: (path) =>
    isDisplayPath(path) ||
    path === "/" ||
    path.startsWith("/cashier") ||
    path.startsWith(WAITING_ROOM_PREFIX) ||
    path.startsWith("/dashboard"),
  doctor: (path) =>
    isDisplayPath(path) ||
    path === "/" ||
    path.startsWith("/medical") ||
    path.startsWith(WAITING_ROOM_PREFIX) ||
    path.startsWith("/dashboard"),
  admin: (path) =>
    isDisplayPath(path) ||
    path === "/" ||
    path.startsWith("/consulting-rooms") ||
    path.startsWith("/reception") ||
    path.startsWith("/cashier") ||
    path.startsWith("/medical") ||
    path.startsWith(WAITING_ROOM_PREFIX) ||
    path.startsWith("/dashboard") ||
    path.startsWith("/registration") ||
    path.startsWith("/test"),
};

export function isPublicPath(path: string): boolean {
  return path === LOGIN_PATH;
}

export function isDisplayPath(path: string): boolean {
  return path.startsWith(DISPLAY_PREFIX);
}

export function isRouteAllowed(role: UserRole, path: string): boolean {
  const checker = ROLE_ROUTES[role];
  return checker ? checker(path) : false;
}

export function getDefaultRoute(
  role: UserRole,
  defaultQueueId: string,
): string {
  switch (role) {
    case "patient":
      return `${DISPLAY_PREFIX}/${encodeURIComponent(defaultQueueId)}`;
    case "reception":
      return "/reception";
    case "cashier":
      return "/cashier";
    case "doctor":
      return "/medical";
    case "admin":
    default:
      return "/consulting-rooms";
  }
}
