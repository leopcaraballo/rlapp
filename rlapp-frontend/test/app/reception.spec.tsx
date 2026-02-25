import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import ReceptionPage from '@/app/reception/page';

describe('ReceptionPage', () => {
  it('renders the check-in form', () => {
    render(<ReceptionPage />);
    expect(screen.queryByText(/Recepción/)).toBeTruthy();
    expect(screen.queryByText(/Registrar check-in/)).toBeTruthy();
  });
});
