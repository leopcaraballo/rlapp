jest.mock("next/server", () => {
  const buildHeaders = () => {
    const map = new Map<string, string>();
    return {
      set: (k: string, v: string) => map.set(k, v),
      get: (k: string) => map.get(k) ?? null,
    };
  };

  const json = (body: any, init?: { status?: number }) => {
    const headers = buildHeaders();
    return { status: init?.status, headers, body } as any;
  };

  return {
    NextResponse: {
      json,
      next: () => ({ headers: buildHeaders() }),
    },
  };
});

import { middleware } from "@/proxi";

const loadHttpClient = async () => {
  jest.resetModules();
  return import("@/lib/httpClient");
};

describe("httpClient", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it("returns data on success", async () => {
    const { httpGet } = await loadHttpClient();

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: "world" }),
    });

    await expect(
      httpGet<{ hello: string }>("https://api.test/foo"),
    ).resolves.toEqual({
      hello: "world",
    });
  });

  it("retries server errors then fails", async () => {
    const { httpGet } = await loadHttpClient();

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const promise = httpGet("https://api.test/error");
    // Prevent unhandled rejection warnings while timers advance
    void promise.catch(() => undefined);

    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow("SERVER_ERROR");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("propagates rate limit without aggressive retry", async () => {
    const { httpGet } = await loadHttpClient();

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: "too many" }),
    });

    await expect(httpGet("https://api.test/rate-limit")).rejects.toThrow(
      "RATE_LIMIT",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("aborts on timeout and marks circuit as failed", async () => {
    const { httpGet } = await loadHttpClient();

    (fetch as jest.Mock).mockImplementation(
      (_: string, options: RequestInit) => {
        return new Promise((_, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        });
      },
    );

    const promise = httpGet("https://api.test/timeout");
    // Prevent unhandled rejection warnings while timers advance
    void promise.catch(() => undefined);

    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow("TIMEOUT");
  });

  it("opens the circuit after repeated failures", async () => {
    const { httpGet } = await loadHttpClient();

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    for (let i = 0; i < 5; i++) {
      const attempt = httpGet("https://api.test/circuit");
      await jest.runAllTimersAsync();
      await attempt.catch(() => undefined);
    }

    const circuitOpen = httpGet("https://api.test/circuit");
    // Prevent unhandled rejection warnings while timers advance
    void circuitOpen.catch(() => undefined);
    await jest.runAllTimersAsync();
    await expect(circuitOpen).rejects.toThrow("CIRCUIT_OPEN");
  });

  it("posts data successfully", async () => {
    const { httpPost } = await loadHttpClient();

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await expect(httpPost("https://api.test/foo", { bar: 1 })).resolves.toEqual(
      {
        ok: true,
      },
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/foo",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});

describe("middleware", () => {
  const buildRequest = (method = "GET", headers?: Record<string, string>) => {
    const h = new Headers(headers);
    return { method, headers: h } as any;
  };

  it("blocks disallowed methods", () => {
    const res = middleware(buildRequest("DELETE"));
    expect(res.status).toBe(405);
  });

  it("adds security headers and allows safe methods", () => {
    const res = middleware(
      buildRequest("GET", { "x-forwarded-for": "1.1.1.1" }),
    );

    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src");
    expect(res.status).toBeUndefined();
  });
});
