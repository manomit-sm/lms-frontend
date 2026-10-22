import { LocalPlatformSignIn, RequireSession, SIGN_IN_PATH } from '@lms/auth';
import { NotFoundPage, RouteErrorPage } from '@lms/ui';
import { createBrowserRouter, Navigate } from 'react-router';
import { PlatformShell } from './PlatformShell';
import { TenantPage } from './tenants/TenantPage';
import { TenantsPage } from './tenants/TenantsPage';
import { localAuthApi } from './runtime';

export const router = createBrowserRouter([
  {
    path: SIGN_IN_PATH,
    element: <LocalPlatformSignIn localApi={localAuthApi} />,
    errorElement: <RouteErrorPage fullScreen />,
  },
  {
    path: '/',
    element: (
      <RequireSession>
        <PlatformShell />
      </RequireSession>
    ),
    errorElement: <RouteErrorPage fullScreen />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/tenants" replace /> },
          { path: 'tenants', element: <TenantsPage /> },
          { path: 'tenants/:tenantId', element: <TenantPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
