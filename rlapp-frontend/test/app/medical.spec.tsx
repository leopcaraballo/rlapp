import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('@/config/env', () => ({
  env: {
    API_BASE_URL: 'http://localhost:3000',
    POLLING_INTERVAL: 3000,
    WS_URL: null,
    WS_DISABLED: false,
    DEFAULT_QUEUE_ID: 'QUEUE-01',
  },
}));

jest.mock('@/hooks/useMedicalStation', () => ({
  useMedicalStation: () => ({
    busy: false,
    error: null,
    lastResult: null,
    claim: jest.fn(),
    call: jest.fn(),
    complete: jest.fn(),
    markAbsent: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('@/hooks/useConsultingRooms', () => ({
  useConsultingRooms: () => ({
    busy: false,
    error: null,
    lastResult: null,
    activate: jest.fn(),
    deactivate: jest.fn(),
    clearError: jest.fn(),
  }),
}));

import MedicalPage from '@/app/medical/page';

describe('MedicalPage', () => {
  it('renders medical controls', () => {
    render(<MedicalPage />);
    expect(screen.queryByText(/Estación Médica/)).toBeTruthy();
    expect(screen.queryByText(/Llamar siguiente/)).toBeTruthy();
  });
});
