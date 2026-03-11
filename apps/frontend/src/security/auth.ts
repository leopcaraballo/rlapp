import { dispatchAuthChanged } from "./authEvents";

export type UserRole = "patient" | "reception" | "cashier" | "doctor" | "admin";

export type AuthSession = {
  token: string;
  role: UserRole;
  exp: number; // epoch ms
};

const STORAGE_KEY = "rlapp_auth";

export function isSessionExpired(
  session: AuthSession,
  now = Date.now(),
): boolean {
  return session.exp <= now;
}

export function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed || !parsed.token || !parsed.role || !parsed.exp) return null;
    const session = parsed as AuthSession;
    if (isSessionExpired(session)) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  dispatchAuthChanged();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  dispatchAuthChanged();
}

/**
 * Genera una sesion local (offline/demo) con un token NO validable por el backend.
 *
 * ADVERTENCIA: El token generado usa `alg: "none"` y NO sera aceptado por
 * endpoints protegidos del backend (devolvera 401). Usar SOLO para:
 * - Modo offline/demo sin conexion al backend.
 * - Tests de frontend que mockean las respuestas HTTP.
 *
 * Para acceder a endpoints protegidos, usar `requestOperationalSession()` de
 * `@/services/api/auth.ts`, que obtiene un JWT real firmado por el backend.
 *
 * // HUMAN CHECK — Validar que ningun flujo de produccion use esta funcion
 * para acceder a endpoints protegidos del backend.
 */
export function buildSession(role: UserRole, ttlMinutes = 120): AuthSession {
  const exp = Date.now() + ttlMinutes * 60 * 1000;
  return {
    token: createLocalToken(role, exp),
    role,
    exp,
  };
}

export function getAuthHeaders(): Record<string, string> {
  const session = loadSession();
  if (!session) return {};
  return {
    Authorization: `Bearer ${session.token}`,
  };
}

function base64UrlEncode(input: string): string {
  if (typeof window === "undefined") return input;
  const base64 = window.btoa(input);
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function createLocalToken(role: UserRole, exp: number): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ role, exp }));
  return `${header}.${payload}.local`;
}
