import { requestOperationalSession } from "@/services/api/auth";

describe("api/auth.ts", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/";
    jest.clearAllMocks();
    global.fetch = fetchMock;
    Object.defineProperty(global, "crypto", {
      value: {
        randomUUID: jest.fn(() => "uuid-test"),
      },
      configurable: true,
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;

    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
      return;
    }

    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
  });

  it("debe enviar encabezados de correlacion e idempotencia al solicitar sesion operativa", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          Token: "jwt-operativo",
          ExpiresIn: 7200,
          TokenType: "Bearer",
        }),
    } as Response);

    const session = await requestOperationalSession("doctor", "12345678");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];

    expect(requestUrl).toMatch(/\/api\/auth\/token$/);
    expect(requestInit).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Correlation-Id": "auth-doctor-12345678-uuid-test",
          "Idempotency-Key": "auth-token-doctor-12345678-uuid-test",
        }),
      }),
    );
    expect(session.token).toBe("jwt-operativo");
    expect(session.role).toBe("doctor");
  });

  it("debe propagar el mensaje del backend cuando la autenticacion falla", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ Error: "Rol invalido" }),
    } as Response);

    await expect(
      requestOperationalSession("cashier", "87654321"),
    ).rejects.toThrow("Rol invalido");
  });
});
