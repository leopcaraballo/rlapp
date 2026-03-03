/**
 * 🛡️ HUMAN CHECK:
 * Cliente HTTP resiliente nivel producción.
 *
 * Características:
 * - Retry automático con backoff exponencial
 * - Timeout con AbortController
 * - Circuit Breaker (Closed → Open → Half-Open)
 * - Fail-Fast cuando backend está caído
 * - Protección contra tormentas de requests
 * - Errores tipificados
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private nextTry = 0;

  constructor(
    private failureThreshold = 5,
    private cooldownTime = 10_000, // ms
  ) {}

  canRequest() {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextTry) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true;
  }

  success() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  fail() {
    this.failures++;

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextTry = Date.now() + this.cooldownTime;
    }
  }

  getState() {
    return this.state;
  }
}

/**
 * Circuit global por host (evita tumbar backend)
 */
const circuits = new Map<string, CircuitBreaker>();

function getCircuit(url: string) {
  const host = new URL(url, "http://dummy").host;

  if (!circuits.has(host)) {
    circuits.set(host, new CircuitBreaker());
  }

  return circuits.get(host)!;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function request<T>(
  url: string,
  options: RequestInit,
  retries = 2,
  timeout = 4000,
): Promise<T> {
  const circuit = getCircuit(url);

  if (!circuit.canRequest()) {
    throw new Error("CIRCUIT_OPEN");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!res.ok) {
        if (res.status === 429) throw new Error("RATE_LIMIT");
        if (res.status >= 500) throw new Error("SERVER_ERROR");
        throw new Error("HTTP_ERROR");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;

      circuit.success();
      return data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      clearTimeout(id);

      /**
       * TIMEOUT → retry
       */
      if (err.name === "AbortError") {
        if (attempt === retries) {
          circuit.fail();
          throw new Error("TIMEOUT");
        }
      } else if (err.message === "SERVER_ERROR") {
        /**
         * SERVER ERROR → retry + breaker
         */
        if (attempt === retries) {
          circuit.fail();
          throw err;
        }
      } else if (err.message === "RATE_LIMIT") {
        /**
         * RATE LIMIT → no retry agresivo
         */
        throw err;
      } else {
        /**
         * Otros errores
         */
        if (attempt === retries) {
          circuit.fail();
          throw err;
        }
      }

      /**
       * Exponential Backoff
       */
      const backoff = 300 * Math.pow(2, attempt);
      await sleep(backoff);
    }
  }

  throw new Error("UNEXPECTED_HTTP_ERROR");
}

/**
 * Genera Idempotency-Key único para operaciones de cambio de estado.
 * Requerido por el backend para garantizar procesamiento idempotente.
 */
function idempotencyKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * API pública
 */

export function httpGet<T>(url: string) {
  return request<T>(url, { method: "GET", cache: "no-store" });
}

export function httpPost<T>(url: string, body: unknown) {
  return request<T>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey(),
    },
    body: JSON.stringify(body),
  });
}
