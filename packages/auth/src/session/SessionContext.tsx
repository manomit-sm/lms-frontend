import type { ReactNode } from 'react';
import { StoreContext } from './storeContext';
import type { SessionStore } from './SessionStore';

export function SessionProvider({ store, children }: { store: SessionStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
