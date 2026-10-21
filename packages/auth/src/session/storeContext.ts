import { createContext } from 'react';
import type { SessionStore } from './SessionStore';

export const StoreContext = createContext<SessionStore | null>(null);
