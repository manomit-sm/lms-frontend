export interface Session {
  accessToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  /** Who is signed in, for display before anything is loaded (e.g. the platform admin's subject). */
  label: string;
}

/** A session ends this long before the token does, so no request is sent with an about-to-expire token. */
const EXPIRY_MARGIN_MS = 30_000;

type Listener = () => void;

/**
 * The signed-in session of one portal, kept in sessionStorage: it survives a reload but is per browser
 * tab, so two tabs can be signed in as different users (an employee and their manager). Listeners hear
 * about sign-in, sign-out and expiry.
 */
export class SessionStore {
  private readonly key: string;
  private readonly listeners = new Set<Listener>();
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private current: Session | null;

  constructor(
    portal: string,
    private readonly storage: Storage = window.sessionStorage,
  ) {
    this.key = `lms.${portal}.session`;
    this.current = this.read();
    this.scheduleExpiry();
  }

  get(): Session | null {
    if (this.current && this.current.expiresAt - EXPIRY_MARGIN_MS <= Date.now()) {
      this.clear();
    }
    return this.current;
  }

  set(session: Session): void {
    this.storage.setItem(this.key, JSON.stringify(session));
    this.current = session;
    this.scheduleExpiry();
    this.emit();
  }

  clear(): void {
    if (!this.current) {
      return;
    }
    this.storage.removeItem(this.key);
    this.current = null;
    this.scheduleExpiry();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private read(): Session | null {
    try {
      const raw = this.storage.getItem(this.key);
      const session = raw ? (JSON.parse(raw) as Session) : null;
      return session && typeof session.accessToken === 'string' && typeof session.expiresAt === 'number'
        ? session
        : null;
    } catch {
      return null;
    }
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    if (this.current) {
      const delay = Math.max(0, this.current.expiresAt - EXPIRY_MARGIN_MS - Date.now());
      this.expiryTimer = setTimeout(() => this.get(), delay);
    }
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
