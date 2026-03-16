// Plantilla de referencia para tests de hooks con Jest + Testing Library.
// Ajusta la ruta final segun la organizacion actual en apps/frontend/test o pruebas cercanas al codigo.

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// import { useFeature } from '../hooks/useFeature';

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-uid',
      getIdToken: jest.fn().mockResolvedValue('fake-token'),
    },
    loading: false,
  }),
}));

jest.mock('../services/featureService', () => ({
  getFeature: jest.fn(),
}));

describe('useFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Happy Path ──────────────────────────────────────────────────────────

  it('returns data after successful fetch', async () => {
    // const { getFeature } = await import('../services/featureService');
    // jest.mocked(getFeature).mockResolvedValue({ name: 'Test' });
    //
    // const { result } = renderHook(() => useFeature());
    //
    // await waitFor(() => {
    //   expect(result.current.loading).toBe(false);
    // });
    //
    // expect(result.current.data).toEqual({ name: 'Test' });
    // expect(result.current.error).toBeNull();
  });

  // ─── Error Path ─────────────────────────────────────────────────────────

  it('sets error when fetch fails', async () => {
    // const { getFeature } = await import('../services/featureService');
    // jest.mocked(getFeature).mockRejectedValue(new Error('API Error'));
    //
    // const { result } = renderHook(() => useFeature());
    //
    // await waitFor(() => {
    //   expect(result.current.loading).toBe(false);
    // });
    //
    // expect(result.current.error).toBeInstanceOf(Error);
    // expect(result.current.data).toBeNull();
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────

  it('does not fetch when user is null', async () => {
    // mock from useAuth: user = null
    // const { result } = renderHook(() => useFeature());
    // await act(async () => {});
    // expect(result.current.loading).toBe(true); // never resolves without user
  });
});
