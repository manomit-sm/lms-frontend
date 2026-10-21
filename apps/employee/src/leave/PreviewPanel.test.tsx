import { ApiError } from '@lms/api';
import { renderWithProviders } from '@lms/ui/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PreviewPanel } from './PreviewPanel';

const preview = {
  totalDays: 4.5,
  available: 18,
  availableAfter: 13.5,
  valid: true,
  violations: [],
  days: [
    { date: '2026-11-06', dayType: 'WORKING' as const, session: 'FIRST_HALF' as const, amount: 0.5 },
    { date: '2026-11-07', dayType: 'WEEKEND' as const, session: 'FULL_DAY' as const, amount: 0 },
  ],
};

describe('PreviewPanel', () => {
  it('asks for a type and dates first', () => {
    renderWithProviders(
      <PreviewPanel ready={false} preview={undefined} updating={false} error={null} submitError={null} />,
    );

    expect(
      screen.getByText('Choose a leave type and dates to see how many days this takes.'),
    ).toBeInTheDocument();
  });

  it('shows the days, the balance after and the day-by-day breakdown', async () => {
    renderWithProviders(
      <PreviewPanel ready preview={preview} updating={false} error={null} submitError={null} />,
    );

    expect(screen.getByText('4.5 days')).toBeInTheDocument();
    expect(screen.getByText('13.5')).toBeInTheDocument();
    expect(screen.getByText('of 18 available')).toBeInTheDocument();
    expect(screen.getByText('Ready to submit')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show day by day/i }));
    expect(screen.getByText('Weekend')).toBeInTheDocument();
    expect(screen.getByText('First half')).toBeInTheDocument();
  });

  it('lists every broken rule', () => {
    renderWithProviders(
      <PreviewPanel
        ready
        preview={{
          ...preview,
          valid: false,
          violations: [
            { code: 'INSUFFICIENT_NOTICE', message: 'Annual Leave needs 7 day(s) notice' },
            { code: 'ATTACHMENT_REQUIRED', message: 'Attach a certificate' },
          ],
        }}
        updating={false}
        error={null}
        submitError={null}
      />,
    );

    expect(screen.getByText('This request can’t be submitted yet')).toBeInTheDocument();
    expect(screen.getByText('Annual Leave needs 7 day(s) notice')).toBeInTheDocument();
    expect(screen.getByText('Attach a certificate')).toBeInTheDocument();
    expect(screen.queryByText('Ready to submit')).not.toBeInTheDocument();
  });

  it('shows why a submit failed, preferring its rule violations', () => {
    const { rerender } = renderWithProviders(
      <PreviewPanel
        ready
        preview={preview}
        updating={false}
        error={null}
        submitError={
          new ApiError({
            status: 422,
            errorCode: 'INSUFFICIENT_BALANCE',
            detail: 'Not enough balance',
            violations: [{ code: 'INSUFFICIENT_BALANCE', message: 'Only 2 days left' }],
          })
        }
      />,
    );
    expect(screen.getByText('Only 2 days left')).toBeInTheDocument();

    rerender(
      <PreviewPanel
        ready
        preview={preview}
        updating={false}
        error={null}
        submitError={
          new ApiError({ status: 409, errorCode: 'OVERLAPPING_LEAVE', detail: 'The dates overlap' })
        }
      />,
    );
    expect(screen.getByText('Not submitted')).toBeInTheDocument();
    expect(screen.getByText('The dates overlap')).toBeInTheDocument();
  });

  it('explains a preview the server refused', () => {
    renderWithProviders(
      <PreviewPanel
        ready
        preview={undefined}
        updating={false}
        error={
          new ApiError({
            status: 400,
            errorCode: 'INVALID_SESSIONS',
            detail: 'A single-day request has one session',
          })
        }
        submitError={null}
      />,
    );

    expect(screen.getByText('A single-day request has one session')).toBeInTheDocument();
  });
});
