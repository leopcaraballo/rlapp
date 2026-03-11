import { getApiBaseUrl } from "@/config/env";
import type { AuthSession, UserRole } from "@/security/auth";

type StaffRole = Exclude<UserRole, "patient">;

type TokenResponse = {
  token?: string;
  Token?: string;
  expiresIn?: number;
  ExpiresIn?: number;
  tokenType?: string;
  TokenType?: string;
  error?: string;
  Error?: string;
};

const STAFF_ROLE_MAP: Record<StaffRole, string> = {
  reception: "Receptionist",
  cashier: "Cashier",
  doctor: "Doctor",
  admin: "Admin",
};

function buildCorrelationId(role: StaffRole, idCard: string): string {
  return `auth-${role}-${idCard}-${crypto.randomUUID()}`;
}

function buildIdempotencyKey(role: StaffRole, idCard: string): string {
  return `auth-token-${role}-${idCard}-${crypto.randomUUID()}`;
}

function readTokenValue(json: TokenResponse | null): string | null {
  if (!json) {
    return null;
  }

  if (typeof json.token === "string") {
    return json.token;
  }

  if (typeof json.Token === "string") {
    return json.Token;
  }

  return null;
}

function readExpiresInValue(json: TokenResponse | null): number | null {
  if (!json) {
    return null;
  }

  if (typeof json.expiresIn === "number") {
    return json.expiresIn;
  }

  if (typeof json.ExpiresIn === "number") {
    return json.ExpiresIn;
  }

  return null;
}

function readApiErrorMessage(json: TokenResponse | null): string | null {
  if (!json) {
    return null;
  }

  if (typeof json.error === "string") {
    return json.error;
  }

  if (typeof json.Error === "string") {
    return json.Error;
  }

  return null;
}

export async function requestOperationalSession(
  role: StaffRole,
  idCard: string,
  ttlMinutes = 120,
): Promise<AuthSession> {
  const normalizedIdCard = idCard.trim();

  if (!normalizedIdCard) {
    throw new Error(
      "La identificación es obligatoria para autenticación operativa.",
    );
  }

  const response = await fetch(`${getApiBaseUrl()}/api/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Correlation-Id": buildCorrelationId(role, normalizedIdCard),
      "Idempotency-Key": buildIdempotencyKey(role, normalizedIdCard),
    },
    body: JSON.stringify({
      userId: normalizedIdCard,
      userName: normalizedIdCard,
      role: STAFF_ROLE_MAP[role],
    }),
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as Partial<TokenResponse>) : null;
  const token = readTokenValue(json);
  const expiresIn = readExpiresInValue(json);

  if (!response.ok || !token || !expiresIn) {
    const apiMessage =
      readApiErrorMessage(json) ??
      "No fue posible autenticar el rol operativo en el backend.";

    throw new Error(apiMessage);
  }

  const now = Date.now();
  const serverExpiration = now + expiresIn * 1000;
  const requestedExpiration = now + ttlMinutes * 60 * 1000;

  return {
    token,
    role,
    exp: Math.min(serverExpiration, requestedExpiration),
  };
}
