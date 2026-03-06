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
];

export { http, HttpResponse };
