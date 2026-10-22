import { ApiError } from '@lms/api';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testing';
import { QueriesError } from './QueryError';

const ok = () => ({ isError: false, error: null, refetch: vi.fn() });
const failed = (detail: string) => ({
  isError: true,
  error: new ApiError({ status: 0, errorCode: 'NETWORK_ERROR', detail }),
  refetch: vi.fn(),
});

describe('QueriesError', () => {
  it('shows nothing while every query is fine', () => {
    renderWithProviders(<QueriesError queries={[ok(), ok()]} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the first failure and retries every failed query', async () => {
    const fine = ok();
    const first = failed('Departments are unavailable');
    const second = failed('Locations are unavailable');
    renderWithProviders(<QueriesError queries={[fine, first, second]} />);

    expect(screen.getByText('Departments are unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Locations are unavailable')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(first.refetch).toHaveBeenCalledOnce();
    expect(second.refetch).toHaveBeenCalledOnce();
    expect(fine.refetch).not.toHaveBeenCalled();
  });
});
