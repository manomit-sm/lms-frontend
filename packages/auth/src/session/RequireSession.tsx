import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { SIGN_IN_PATH } from './paths';
import { useSession } from './useSession';

/** Renders its children only with a session; otherwise sends the user to sign in and back here after. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) {
    const returnTo = location.pathname + location.search + location.hash;
    const search = returnTo === '/' ? '' : `?returnTo=${encodeURIComponent(returnTo)}`;
    return <Navigate to={`${SIGN_IN_PATH}${search}`} replace />;
  }
  return children;
}
