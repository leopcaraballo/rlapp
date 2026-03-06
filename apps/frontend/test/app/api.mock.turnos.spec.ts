jest.mock("next/server", () => {
  const json = (body: any, init?: { status?: number }) =>
    ({
      status: init?.status ?? 200,
      headers: new Map<string, string>(),
      json: async () => body,
    }) as any;

  return { NextResponse: { json } };
});

import { GET, POST } from "@/app/api/mock/turnos/route";

describe("mock turnos api", () => {
  it("returns mock snapshot on GET", async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(3);
  });

  it("validates POST body", async () => {
    const badRes = await POST({ json: async () => ({}) } as any);
    expect(badRes.status).toBe(400);

    const okRes = await POST({
      json: async () => ({ fullName: "X", idCard: 1 }),
    } as any);
    const body = await okRes.json();
    expect(okRes.status).toBe(200);
    expect(body.status).toBe("accepted");
  });
});
