import { renderWithProviders } from '@lms/ui/testing';
import { act, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RequireSession } from './RequireSession';
import { SessionProvider } from './SessionContext';
import { SessionStore } from './SessionStore';

function SignInProbe() {
  const location = useLocation();
  return <p>Sign in {location.search}</p>;
}

function renderAt(path: string, store: SessionStore) {
  const router = createMemoryRouter(
    [
      { path: '/sign-in', element: <SignInProbe /> },
      {
        path: '/leave',
        element: (
          <RequireSession>
            <p>Leave page</p>
          </RequireSession>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  renderWithProviders(
    <SessionProvider store={store}>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
}

describe('RequireSession', () => {
  it('sends a signed-out user to sign in, remembering the page', () => {
    renderAt('/leave?tab=mine', new SessionStore('employee'));

    expect(screen.getByText('Sign in ?returnTo=%2Fleave%3Ftab%3Dmine')).toBeInTheDocument();
  });

  it('shows the page with a session, and leaves it when the session ends', () => {
    const store = new SessionStore('employee');
    store.set({ accessToken: 'a', expiresAt: Date.now() + 3_600_000, label: 'asha' });
    renderAt('/leave', store);
    expect(screen.getByText('Leave page')).toBeInTheDocument();

    act(() => store.clear());

    expect(screen.getByText('Sign in ?returnTo=%2Fleave')).toBeInTheDocument();
  });
});
