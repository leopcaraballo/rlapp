describe("env config", () => {
  const modulePath = "@/config/env";

  afterEach(() => {
    jest.resetModules();
  });

  it("throws when required variables are missing", async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_WS_URL;

    await expect(
      jest.isolateModulesAsync(async () => {
        await import(modulePath);
      }),
    ).rejects.toThrow(/Missing env variable/);
  });

  it("exports values when env is set", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
    process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";

    let loadedEnv: { env: { API_BASE_URL: string; WS_URL: string } };

    await jest.isolateModulesAsync(async () => {
      loadedEnv = (await import(modulePath)) as {
        env: { API_BASE_URL: string; WS_URL: string };
      };
    });

    const { env } = loadedEnv!;
    expect(env.API_BASE_URL).toBe("http://api.test");
    expect(env.WS_URL).toBe("ws://ws.test");
  });

  it("WS_URL es null cuando NEXT_PUBLIC_WS_URL no está definida (rama optional null)", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
    delete process.env.NEXT_PUBLIC_WS_URL;

    let loadedEnv: { env: { WS_URL: string | null } };
    await jest.isolateModulesAsync(async () => {
      loadedEnv = (await import(modulePath)) as { env: { WS_URL: string | null } };
    });
    expect(loadedEnv!.env.WS_URL).toBeNull();
  });

  it("WS_DISABLED es true cuando NEXT_PUBLIC_WS_DISABLED es 'true'", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
    process.env.NEXT_PUBLIC_WS_DISABLED = "true";

    let loadedEnv: { env: { WS_DISABLED: boolean } };
    await jest.isolateModulesAsync(async () => {
      loadedEnv = (await import(modulePath)) as { env: { WS_DISABLED: boolean } };
    });
    expect(loadedEnv!.env.WS_DISABLED).toBe(true);
    delete process.env.NEXT_PUBLIC_WS_DISABLED;
  });

  it("DEFAULT_QUEUE_ID usa fallback 'QUEUE-01' cuando variable no está definida", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
    delete process.env.NEXT_PUBLIC_DEFAULT_QUEUE_ID;

    let loadedEnv: { env: { DEFAULT_QUEUE_ID: string } };
    await jest.isolateModulesAsync(async () => {
      loadedEnv = (await import(modulePath)) as { env: { DEFAULT_QUEUE_ID: string } };
    });
    expect(loadedEnv!.env.DEFAULT_QUEUE_ID).toBe("QUEUE-01");
  });
});
