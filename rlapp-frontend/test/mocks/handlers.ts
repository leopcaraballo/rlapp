import { http, HttpResponse } from 'msw';

// Base handlers for TDD: expand per test with server.use(...)
export const handlers = [
  // SignalR Negotiation Mock
  http.post('*/ws/waiting-room/negotiate', () => {
    return HttpResponse.json({
      connectionId: "mock-connection-id",
      negotiateVersion: 1,
      availableTransports: [
        { transport: "WebSockets", transferFormats: ["Text", "Binary"] },
        { transport: "LongPolling", transferFormats: ["Text", "Binary"] }
      ]
    });
  }),

  http.get('/api/appointments', () => {
    return HttpResponse.json([
      { id: '1', fullName: 'John Doe', status: 'PENDING' },
      { id: '2', fullName: 'Jane Roe', status: 'PENDING' },
    ]);
  }),
  http.post('/api/appointments', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),

  // Waiting-room query endpoints (respuestas por defecto para evitar warnings de MSW)
  http.get('*/api/v1/waiting-room/:queueId/monitor', () => {
    return HttpResponse.json({
      queueId: 'QUEUE-01',
      waiting: [],
      inProgress: [],
      completed: [],
      totalWaiting: 0,
      totalInProgress: 0,
      totalCompleted: 0,
    });
  }),

  http.get('*/api/v1/waiting-room/:queueId/queue-state', () => {
    return HttpResponse.json({
      queueId: 'QUEUE-01',
      patients: [],
      totalPatients: 0,
    });
  }),

  http.get('*/api/v1/waiting-room/:queueId/next-turn', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('*/api/v1/waiting-room/:queueId/recent-history', () => {
    return HttpResponse.json([]);
  }),

  // Waiting-room command endpoints
  http.post('*/api/v1/waiting-room/:queueId/rebuild', () => {
    return HttpResponse.json({ message: 'OK', queueId: 'QUEUE-01' });
  }),
];

export { http, HttpResponse };
