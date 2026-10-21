import { CurrentUserProvider, LocalTenantSignIn, RequireSession, SIGN_IN_PATH } from '@lms/auth';
import { NotFoundPage, RouteErrorPage } from '@lms/ui';
import { createBrowserRouter } from 'react-router';
import { AdminShell } from './AdminShell';
import { HomePage } from './pages/HomePage';
import { api, localAuthApi } from './runtime';

export const router = createBrowserRouter([
  {
    path: SIGN_IN_PATH,
    element: <LocalTenantSignIn localApi={localAuthApi} portalName="admin portal" />,
    errorElement: <RouteErrorPage fullScreen />,
  },
  {
    path: '/',
    element: (
      <RequireSession>
        <CurrentUserProvider api={api}>
          <AdminShell />
        </CurrentUserProvider>
      </RequireSession>
    ),
    errorElement: <RouteErrorPage fullScreen />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <HomePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
