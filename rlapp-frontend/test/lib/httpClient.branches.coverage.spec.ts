/**
 * Tests adicionales para cubrir branches del CircuitBreaker y casos de retry
 * en httpClient que no están cubiertos en httpClient.proxi.coverage.spec.ts.
 */

const loadHttpClient = async () => {
  jest.resetModules();
  return import("@/lib/httpClient");
};

describe("httpClient — branches de retry y CircuitBreaker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it("reintenta error HTTP_ERROR (4xx genérico) y falla en el último intento", async () => {
    const { httpGet } = await loadHttpClient();

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    });

    const promise = httpGet("https://api.test/http-error");
    void promise.catch(() => undefined);

    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow("HTTP_ERROR");
    // Debería reintentar 3 veces (attempt 0, 1, 2)
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("recupera el circuit breaker cuando vence el cooldown (HALF_OPEN → CLOSED)", async () => {
    const { httpGet } = await loadHttpClient();

    // Producir 5 fallos para abrir el circuito
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    for (let i = 0; i < 5; i++) {
      const a = httpGet("https://api.test/recover");
      await jest.runAllTimersAsync();
      await a.catch(() => undefined);
    }

    // Circuit OPEN → solicitudes rechazadas inmediatamente
    const blockedCall = httpGet("https://api.test/recover");
    void blockedCall.catch(() => undefined);
    await jest.runAllTimersAsync();
    await expect(blockedCall).rejects.toThrow("CIRCUIT_OPEN");

    // Avanzar el tiempo para que venza el cooldown (10s)
    jest.setSystemTime(Date.now() + 15_000);

    // Ahora el circuito pasa a HALF_OPEN: la próxima solicitud se intenta
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const recoveryCall = httpGet("https://api.test/recover");
    await jest.runAllTimersAsync();
    await expect(recoveryCall).resolves.toEqual({ ok: true });
  });

  it("timeout en intento intermedio → reintenta y falla en el último intento con TIMEOUT", async () => {
    const { httpGet } = await loadHttpClient();

    (fetch as jest.Mock).mockImplementation(
      (_: string, options: RequestInit) =>
        new Promise((_, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        }),
    );

    const promise = httpGet("https://api.test/multi-timeout");
    void promise.catch(() => undefined);

    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow("TIMEOUT");
    // retries=2 → 3 intentos
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
