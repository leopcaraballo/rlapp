/**
 * @jest-environment jsdom
 */
export {};

type FetchMock = jest.Mock;

function mockFetch(body: unknown, status = 200) {
  (global as unknown as { fetch: FetchMock }).fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

describe("services/api/waitingRoom — validación de contrato", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
    (global as unknown as { fetch: FetchMock }).fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rechaza respuestas CommandSuccess incompletas", async () => {
    const { checkInPatient } = await import("@/services/api/waitingRoom");

    mockFetch({ success: true });

    await expect(
      checkInPatient({
        queueId: "QUEUE-1",
        patientId: "PAT-1",
        patientName: "Paciente Contrato",
        priority: "High",
        consultationType: "General",
        actor: "receptionist",
      }),
    ).rejects.toThrow(/Contrato inválido en CommandSuccess/i);
  });

  it("rechaza respuestas de monitor con campos obligatorios ausentes", async () => {
    const { getMonitor } = await import("@/services/api/waitingRoom");

    mockFetch({
      queueId: "QUEUE-1",
      totalPatientsWaiting: 1,
      highPriorityCount: 1,
      normalPriorityCount: 0,
      lowPriorityCount: 0,
      averageWaitTimeMinutes: 4,
      utilizationPercentage: 10,
    });

    await expect(getMonitor("QUEUE-1")).rejects.toThrow(
      /Contrato inválido en WaitingRoomMonitorView/i,
    );
  });

  it("acepta el contrato de rebuild cuando el backend responde 202 con body válido", async () => {
    const { rebuildProjection } = await import("@/services/api/waitingRoom");

    mockFetch(
      {
        message: "Projection rebuild initiated",
        queueId: "QUEUE-1",
      },
      202,
    );

    await expect(rebuildProjection("QUEUE-1")).resolves.toEqual({
      message: "Projection rebuild initiated",
      queueId: "QUEUE-1",
    });
  });
});
