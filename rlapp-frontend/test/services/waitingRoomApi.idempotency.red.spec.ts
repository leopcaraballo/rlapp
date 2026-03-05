/**
 * TDD RETROFIT — RED (Grupo C — post-PR#51)
 * Demuestra que el test de header Idempotency-Key en waitingRoom.ts fallaría
 * contra la implementación v0 (pre-PR#51) de commandHeaders(), la cual
 * usaba "X-Idempotency-Key" (con prefijo X-).
 *
 * Convención: it.failing() = el test DEBE fallar contra v0 (=evidencia RED).
 * Commit par (GREEN): test/services/waitingRoomApi.spec.ts
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

// ── v0 stub de commandHeaders: usa X-Idempotency-Key (pre-PR#51) ──
function commandHeadersV0(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Correlation-Id": "test-correlation-id",
    // v0: prefijo X- antes del rename de PR#51
    "X-Idempotency-Key": "test-idempotency-key",
  };
}

async function rebuildProjectionV0(queueId: string): Promise<void> {
  await fetch(`http://api.test/api/queues/${queueId}/rebuild-projection`, {
    method: "POST",
    headers: commandHeadersV0(),
    body: JSON.stringify({}),
  });
}

describe("waitingRoom commandHeaders — RED (v0: X-Idempotency-Key con prefijo X-)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
    global.fetch = jest.fn();
  });

  // Comportamiento presente en v0 → pasa normalmente
  it("incluye Content-Type application/json (presente en v0)", async () => {
    mockFetchOk();
    await rebuildProjectionV0("q1");
    const headers = (fetch as jest.Mock).mock.calls[0][1]?.headers ?? {};
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("incluye X-Correlation-Id (presente en v0)", async () => {
    mockFetchOk();
    await rebuildProjectionV0("q1");
    const headers = (fetch as jest.Mock).mock.calls[0][1]?.headers ?? {};
    expect(headers["X-Correlation-Id"]).toBeTruthy();
  });

  // Comportamiento POST-PR#51 → falla contra v0 → evidencia RED
  // eslint-disable-next-line jest/no-disabled-tests
  it.failing("incluye 'Idempotency-Key' (sin prefijo X-) — renombrado en PR#51, ausente en v0", async () => {
    mockFetchOk();
    await rebuildProjectionV0("q1");
    const headers = (fetch as jest.Mock).mock.calls[0][1]?.headers ?? {};
    // v0 enviaba X-Idempotency-Key → este expect falla contra v0
    expect(headers["Idempotency-Key"]).toBeTruthy();
  });
});
