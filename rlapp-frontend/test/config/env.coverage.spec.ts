describe("env config", () => {
  const modulePath = "@/config/env";

  afterEach(() => {
    jest.resetModules();
  });

  it("throws when required variables are missing", () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_WS_URL;

    expect(() => {
      jest.isolateModules(() => {
        require(modulePath);
      });
    }).toThrow(/Missing env variable/);
  });

  it("exports values when env is set", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
    process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";

    const { env } = require(modulePath);
    expect(env.API_BASE_URL).toBe("http://api.test");
    expect(env.WS_URL).toBe("ws://ws.test");
  });
});
