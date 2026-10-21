import { useContext, useSyncExternalStore } from 'react';
import type { Session } from './SessionStore';
import { StoreContext } from './storeContext';

export interface SessionValue {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

export function useSession(): SessionValue {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  const session = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.get(),
  );
  return { session, signIn: (next) => store.set(next), signOut: () => store.clear() };
}
