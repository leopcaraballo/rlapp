/**
 * @jest-environment jsdom
 *
 * TDD RETROFIT — RED (Grupo C — post-PR#51)
 * Demuestra que el test de header Idempotency-Key fallaría contra
 * la implementación v0 de HttpCommandAdapter (pre-PR#51), la cual
 * enviaba "X-Idempotency-Key" (con prefijo X-) en lugar de "Idempotency-Key".
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Commit par (GREEN): test/infrastructure/httpCommandAdapter.coverage.spec.ts
 */
export {};

type FetchMock = jest.Mock;

function mockFetchOk(body: unknown = { success: true }, status = 200) {
  (global as unknown as { fetch: FetchMock }).fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

// ── v0 stub del adapter: usa X-Idempotency-Key (nombre pre-PR#51) ──
jest.mock("@/config/env", () => ({
  env: { API_BASE_URL: "http://api.test", POLLING_INTERVAL: 3000, WS_URL: null, WS_DISABLED: false, DEFAULT_QUEUE_ID: "QUEUE-01" },
}));

const adapterV0 = {
  async callNextAtCashier({ queueId, actor }: { queueId: string; actor: string }) {
    await fetch(`http://api.test/api/queues/${queueId}/call-next-cashier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": crypto.randomUUID(),
        // v0: usaba X-Idempotency-Key (con prefijo X-)
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ actor }),
    });
  },
};

describe("HttpCommandAdapter headers — RED (v0: X-Idempotency-Key con prefijo X-)", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  // Comportamiento presente en v0 → pasa normalmente
  it("envía Content-Type application/json", async () => {
    mockFetchOk();
    await adapterV0.callNextAtCashier({ queueId: "q1", actor: "caja" });
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("envía X-Correlation-Id en el header (presente en v0)", async () => {
    mockFetchOk();
    await adapterV0.callNextAtCashier({ queueId: "q1", actor: "caja" });
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Correlation-Id"]).toBeTruthy();
  });

  // Comportamiento POST-PR#51 → falla contra v0 → evidencia RED
  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("envía 'Idempotency-Key' (sin prefijo X-) — nombre renombrado en PR#51, ausente en v0", async () => {
    mockFetchOk();
    await adapterV0.callNextAtCashier({ queueId: "q1", actor: "caja" });
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    // v0 enviaba X-Idempotency-Key, no Idempotency-Key → este test falla contra v0
    expect(headers["Idempotency-Key"]).toBeTruthy();
  });
});
