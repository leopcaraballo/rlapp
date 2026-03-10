import { http, HttpResponse } from "msw";

// Base handlers for TDD: expand per test with server.use(...)
export const handlers = [
  // SignalR Negotiation Mock
  http.post("*/ws/waiting-room/negotiate", () => {
    return HttpResponse.json({
      connectionId: "mock-connection-id",
      negotiateVersion: 1,
      availableTransports: [
        { transport: "WebSockets", transferFormats: ["Text", "Binary"] },
        { transport: "LongPolling", transferFormats: ["Text", "Binary"] },
      ],
    });
  }),

  http.get("/api/appointments", () => {
    return HttpResponse.json([
      { id: "1", fullName: "John Doe", status: "PENDING" },
      { id: "2", fullName: "Jane Roe", status: "PENDING" },
    ]);
  }),
  http.post("/api/appointments", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: "3", ...body }, { status: 201 });
  }),

  // Waiting-room query endpoints (respuestas por defecto para evitar warnings de MSW)
  http.get("*/api/v1/waiting-room/:queueId/monitor", () => {
    return HttpResponse.json({
      queueId: "QUEUE-01",
      totalPatientsWaiting: 0,
      highPriorityCount: 0,
      normalPriorityCount: 0,
      lowPriorityCount: 0,
      lastPatientCheckedInAt: null,
      averageWaitTimeMinutes: 0,
      utilizationPercentage: 0,
      projectedAt: "2026-03-10T10:00:00Z",
    });
  }),

  http.get("*/api/v1/waiting-room/:queueId/queue-state", () => {
    return HttpResponse.json({
      queueId: "QUEUE-01",
      currentCount: 0,
      maxCapacity: 20,
      isAtCapacity: false,
      availableSpots: 20,
      patientsInQueue: [],
      projectedAt: "2026-03-10T10:00:00Z",
    });
  }),

  http.get("*/api/v1/waiting-room/:queueId/next-turn", () => {
    return new HttpResponse(null, { status: 404 });
  }),

  http.get("*/api/v1/waiting-room/:queueId/recent-history", () => {
    return HttpResponse.json([]);
  }),

  // Waiting-room command endpoints
  http.post("*/api/v1/waiting-room/:queueId/rebuild", () => {
    return HttpResponse.json(
      { message: "Projection rebuild initiated", queueId: "QUEUE-01" },
      { status: 202 },
    );
  }),
];

export { http, HttpResponse };
