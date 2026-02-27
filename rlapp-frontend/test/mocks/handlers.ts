import { http, HttpResponse } from 'msw';

// Base handlers for TDD: expand per test with server.use(...)
export const handlers = [
  http.get('/api/appointments', () => {
    return HttpResponse.json([
      { id: '1', fullName: 'John Doe', status: 'PENDING' },
      { id: '2', fullName: 'Jane Roe', status: 'PENDING' },
    ]);
  }),
  http.post('/api/appointments', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),
];

export { http, HttpResponse };
