import type { AuthSession, UserRole } from "@/security/auth";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

type StaffRole = Exclude<UserRole, "patient">;

type TokenResponse = {
  Token: string;
  ExpiresIn: number;
  TokenType: string;
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

  const response = await fetch(`${API_BASE}/api/auth/token`, {
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

  if (!response.ok || !json?.Token || !json.ExpiresIn) {
    const apiMessage =
      typeof (json as { Error?: string } | null)?.Error === "string"
        ? (json as { Error: string }).Error
        : "No fue posible autenticar el rol operativo en el backend.";

    throw new Error(apiMessage);
  }

  const now = Date.now();
  const serverExpiration = now + json.ExpiresIn * 1000;
  const requestedExpiration = now + ttlMinutes * 60 * 1000;

  return {
    token: json.Token,
    role,
    exp: Math.min(serverExpiration, requestedExpiration),
  };
}
