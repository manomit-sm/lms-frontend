import type * as Auth from '@lms/auth';
import type { Me } from '@lms/auth';
import { renderWithProviders } from '@lms/ui/testing';
import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AdminShell } from './AdminShell';

const me = vi.hoisted(() => ({ current: {} as Me }));

vi.mock('@lms/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof Auth>();
  return {
    ...actual,
    useCurrentUser: () => actual.toCurrentUser(me.current),
    useSession: () => ({ session: null, signIn: vi.fn(), signOut: vi.fn() }),
  };
});

function renderShell(user: Me) {
  me.current = user;
  const router = createMemoryRouter([
    { path: '/', element: <AdminShell />, children: [{ index: true, element: <p>Admin home</p> }] },
  ]);
  renderWithProviders(<RouterProvider router={router} />);
}

describe('AdminShell', () => {
  it('turns away users without admin permissions', () => {
    renderShell({ email: 'asha@acme.test', permissions: ['LEAVE_APPLY', 'LEAVE_APPROVE'] });

    expect(screen.getByRole('heading', { name: 'This portal is for administrators' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the employee portal' })).toHaveAttribute(
      'href',
      'http://localhost:5173',
    );
    expect(screen.queryByText('Admin home')).not.toBeInTheDocument();
  });

  it('opens for users with any admin permission', () => {
    renderShell({ email: 'hr@acme.test', permissions: ['LEAVE_APPLY', 'HOLIDAY_MANAGE'] });

    expect(screen.getByText('Admin home')).toBeInTheDocument();
  });
});
