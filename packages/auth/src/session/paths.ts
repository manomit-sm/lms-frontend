export const SIGN_IN_PATH = '/sign-in';

/** Where to go after signing in: the `returnTo` parameter if it is a path in this portal, else home. */
export function returnPath(search: string): string {
  const returnTo = new URLSearchParams(search).get('returnTo');
  return returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
}
