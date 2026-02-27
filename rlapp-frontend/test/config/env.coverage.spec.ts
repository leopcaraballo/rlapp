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
});
