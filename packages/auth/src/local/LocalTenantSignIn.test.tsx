import type { LocalAuthApi } from '@lms/api';
import { renderWithProviders } from '@lms/ui/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '../session/SessionContext';
import { SessionStore } from '../session/SessionStore';
import { LocalTenantSignIn } from './LocalTenantSignIn';

function localApi(): LocalAuthApi {
  return {
    tenants: vi.fn(async () => [{ id: 'tenant-1', key: 'acme' }]),
    users: vi.fn(async () => [
      {
        id: 'u1',
        email: 'admin@acme.test',
        subject: 'sub-admin',
        status: 'ACTIVE' as const,
        roles: ['TENANT_ADMIN'],
      },
      {
        id: 'u2',
        email: 'asha@acme.test',
        subject: 'sub-asha',
        status: 'INVITED' as const,
        roles: ['EMPLOYEE'],
      },
    ]),
    tenantToken: vi.fn(async () => ({ accessToken: 'token-asha', expiresIn: 3600 })),
    platformToken: vi.fn(),
  };
}

function renderSignIn(api: LocalAuthApi, store: SessionStore) {
  const router = createMemoryRouter(
    [
      { path: '/sign-in', element: <LocalTenantSignIn localApi={api} portalName="employee portal" /> },
      { path: '/leave', element: <p>Leave page</p> },
    ],
    { initialEntries: ['/sign-in?returnTo=%2Fleave'] },
  );
  return renderWithProviders(
    <SessionProvider store={store}>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
}

describe('LocalTenantSignIn', () => {
  it('signs in as the chosen user and returns to the page that asked', async () => {
    const api = localApi();
    const store = new SessionStore('employee');
    renderSignIn(api, store);

    // The only tenant is chosen automatically, so its users are listed straight away
    expect(await screen.findByText('asha@acme.test')).toBeInTheDocument();
    expect(screen.getByText('First sign-in')).toBeInTheDocument();
    const signInButtons = screen.getAllByRole('button', { name: 'Sign in' });
    await userEvent.click(signInButtons[1]!);

    expect(await screen.findByText('Leave page')).toBeInTheDocument();
    expect(api.tenantToken).toHaveBeenCalledWith('sub-asha', 'tenant-1', 480);
    expect(store.get()).toMatchObject({ accessToken: 'token-asha', label: 'asha@acme.test' });
  });

  it('filters users by email or role', async () => {
    renderSignIn(localApi(), new SessionStore('employee'));
    await screen.findByText('asha@acme.test');

    await userEvent.type(screen.getByRole('textbox', { name: 'Search users' }), 'tenant_admin');

    expect(screen.getByText('admin@acme.test')).toBeInTheDocument();
    expect(screen.queryByText('asha@acme.test')).not.toBeInTheDocument();
  });
});
