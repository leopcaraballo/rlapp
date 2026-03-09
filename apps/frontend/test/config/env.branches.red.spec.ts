/**
 * TDD RETROFIT — RED
 * Demuestra que los tests de ramas en config/env.ts fallarían contra
 * la implementación v0, la cual usaba asignación directa de process.env
 * sin la función optional() (WS_URL retornaba undefined en lugar de null)
 * y sin el fallback || "QUEUE-01" para DEFAULT_QUEUE_ID.
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Commit par (GREEN): test/config/env.coverage.spec.ts
 */

// ── v0 stub: sin optional(), sin fallback para DEFAULT_QUEUE_ID ──
// Simula el módulo env ANTES de que se añadieran optional() y el fallback ||
// Forzamos undefined independientemente de las variables del entorno de tests
jest.mock("@/config/env", () => ({
  env: {
    API_BASE_URL: "http://localhost:3000",
    POLLING_INTERVAL: 3000,
    WS_URL: undefined,          // v0: sin optional() → undefined, no null
    WS_DISABLED: false,
    DEFAULT_QUEUE_ID: undefined, // v0: sin fallback || "QUEUE-01" → undefined
  },
}));

import { env } from "@/config/env";

describe("config/env — RED (v0: sin optional() ni fallbacks)", () => {
  // Comportamiento presente en v0 → pasa normalmente
  it("API_BASE_URL tiene un valor definido", () => {
    expect(env.API_BASE_URL).toBeTruthy();
  });

  it("WS_DISABLED es false cuando NEXT_PUBLIC_WS_DISABLED no está definido", () => {
    expect(env.WS_DISABLED).toBe(false);
  });

  // Comportamientos NUEVOS → fallan contra v0 → evidencia RED

   
  it.failing("WS_URL es null (no undefined) cuando NEXT_PUBLIC_WS_URL no está definida — rama optional() ausente en v0", () => {
    // v0 retorna undefined → la comparación estricta con null falla
    expect(env.WS_URL).toBeNull();
  });

   
  it.failing("DEFAULT_QUEUE_ID usa fallback 'QUEUE-01' cuando variable no está definida — fallback ausente en v0", () => {
    // v0 retorna undefined → toBe("QUEUE-01") falla
    expect(env.DEFAULT_QUEUE_ID).toBe("QUEUE-01");
  });
});
