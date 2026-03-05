import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

import MedicalPage from '@/app/medical/page';

describe('MedicalPage', () => {
  it('renders medical controls', () => {
    render(<MedicalPage />);
    expect(screen.queryByText(/Área Médica/)).toBeTruthy();
    expect(screen.queryByText(/Llamar siguiente/)).toBeTruthy();
  });
});
