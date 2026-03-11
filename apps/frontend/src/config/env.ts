// 🛡️ HUMAN CHECK:
// Se agregó validación runtime para evitar crash si falta variable.
// En producción, la app debe fallar de forma controlada.

function required(name: string, value?: string, fallback?: string) {
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`Missing env variable: ${name}`);
  }
  return value;
}

function optional(value?: string, fallback: string | null = null) {
  return value ?? fallback;
}

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

export const env = {
  API_BASE_URL: required(
    "NEXT_PUBLIC_API_BASE_URL",
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "http://localhost:5000",
  ).replace(/\/$/, ""),

  POLLING_INTERVAL: Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL ?? 3000),

  // ⚕️ HUMAN CHECK - URL del WebSocket
  // Opcional: si no está definida, SignalR se deshabilita y se usa solo polling REST.
  // En producción, usar wss:// (WebSocket seguro).
  WS_URL: optional(process.env.NEXT_PUBLIC_WS_URL)
    ? normalizeUrl(process.env.NEXT_PUBLIC_WS_URL as string)
    : null,

  // Poner en "true" para deshabilitar completamente los intentos de SignalR.
  WS_DISABLED: process.env.NEXT_PUBLIC_WS_DISABLED === "true",

  // ID de la cola principal del backend.
  // ⚕️ HUMAN CHECK - Debe coincidir con una cola creada en el backend.
  // El backend crea la cola al persistir el primer evento PatientCheckedIn.
  // Los tests de integración del backend usan "QUEUE-01".
  DEFAULT_QUEUE_ID: process.env.NEXT_PUBLIC_DEFAULT_QUEUE_ID || "QUEUE-01",
};

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL;
    if (internalApiBaseUrl) {
      return normalizeUrl(internalApiBaseUrl);
    }
  }

  return env.API_BASE_URL;
}

export function getSignalRBaseUrl(): string {
  return env.WS_URL ?? env.API_BASE_URL;
}
