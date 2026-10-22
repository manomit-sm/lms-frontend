/** One server-sent event. `event` is "message" when the server named none. */
export interface ServerEvent {
  event: string;
  data: string;
  id?: string;
}

/**
 * Turns `text/event-stream` text, in chunks of any size, into events (the WHATWG rules for `event`,
 * `data` and `id` fields; comments such as heartbeats are skipped).
 */
export class EventStreamParser {
  private buffer = '';
  private event = '';
  private data: string[] = [];
  private id: string | undefined;

  constructor(private readonly onEvent: (event: ServerEvent) => void) {}

  push(chunk: string): void {
    this.buffer += chunk;
    for (;;) {
      // A lone \r at the end may be the first half of a \r\n still to come
      const end = /\r\n|\r(?!$)|\n/.exec(this.buffer);
      if (!end) {
        return;
      }
      const line = this.buffer.slice(0, end.index);
      this.buffer = this.buffer.slice(end.index + end[0].length);
      this.line(line);
    }
  }

  private line(line: string): void {
    if (line === '') {
      this.dispatch();
      return;
    }
    if (line.startsWith(':')) {
      return;
    }
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }
    if (field === 'event') {
      this.event = value;
    } else if (field === 'data') {
      this.data.push(value);
    } else if (field === 'id') {
      this.id = value;
    }
  }

  private dispatch(): void {
    if (this.data.length > 0) {
      this.onEvent({ event: this.event || 'message', data: this.data.join('\n'), id: this.id });
    }
    this.event = '';
    this.data = [];
  }
}

export interface EventStreamOptions {
  url: string;
  /** The current access token; the stream stops when there is none (signed out). */
  getAccessToken: () => string | null;
  /** Called on 401, like the API clients: the session is over. */
  onUnauthorized: () => void;
  onEvent: (event: ServerEvent) => void;
  /** Called on every (re)connection, e.g. to refetch what may have been missed while disconnected. */
  onOpen?: () => void;
  /** Stops the stream for good. */
  signal: AbortSignal;
  /** Wait before reconnecting, by consecutive failures (0 after a stream that simply ended). */
  retryDelay?: (failures: number) => number;
  fetch?: typeof fetch;
}

const defaultRetryDelay = (failures: number) => Math.min(30_000, 1000 * 2 ** failures);

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** Client errors other than timeouts and rate limits will not go away by retrying. */
function isPermanent(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/**
 * Keeps a server-sent event stream open until `signal` aborts, reconnecting when it ends or fails.
 * Unlike `EventSource` it sends the bearer header, since the API never takes tokens in the URL.
 */
export async function runEventStream(options: EventStreamOptions): Promise<void> {
  const { signal } = options;
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const retryDelay = options.retryDelay ?? defaultRetryDelay;
  let failures = 0;

  while (!signal.aborted) {
    const token = options.getAccessToken();
    if (!token) {
      return;
    }
    try {
      const response = await doFetch(options.url, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal,
      });
      if (response.status === 401) {
        options.onUnauthorized();
        return;
      }
      if (isPermanent(response.status)) {
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(`Event stream answered ${response.status}`);
      }
      failures = 0;
      options.onOpen?.();
      const parser = new EventStreamParser(options.onEvent);
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        parser.push(value);
      }
    } catch {
      if (signal.aborted) {
        return;
      }
      failures += 1;
    }
    await sleep(retryDelay(failures), signal);
  }
}
