import { describe, expect, it, vi } from 'vitest';
import { EventStreamParser, runEventStream, type ServerEvent } from './eventStream';

function parse(...chunks: string[]): ServerEvent[] {
  const events: ServerEvent[] = [];
  const parser = new EventStreamParser((event) => events.push(event));
  chunks.forEach((chunk) => parser.push(chunk));
  return events;
}

function streamOf(text: string): Response {
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('EventStreamParser', () => {
  it('reads named events and skips comment heartbeats', () => {
    expect(parse(':heartbeat\n\nevent:unread-count\ndata:{"count":2}\n\n')).toEqual([
      { event: 'unread-count', data: '{"count":2}', id: undefined },
    ]);
  });

  it('joins multi-line data and defaults the event name', () => {
    expect(parse('data: one\ndata: two\nid: 7\n\n')).toEqual([
      { event: 'message', data: 'one\ntwo', id: '7' },
    ]);
  });

  it('handles events and CRLF line ends split across chunks', () => {
    expect(parse('event: notif', 'ication\r', '\ndata: {"id":"n1"}\r\n', '\r\n')).toEqual([
      { event: 'notification', data: '{"id":"n1"}', id: undefined },
    ]);
  });

  it('waits for the blank line before dispatching', () => {
    expect(parse('event: a\ndata: 1\n')).toEqual([]);
  });
});

describe('runEventStream', () => {
  it('sends the bearer token, delivers events and reconnects after the stream ends', async () => {
    const controller = new AbortController();
    const events: ServerEvent[] = [];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(streamOf('event: unread-count\ndata: {"count":1}\n\n'))
      .mockImplementationOnce(async () => {
        controller.abort();
        return streamOf('');
      });
    const onOpen = vi.fn();

    await runEventStream({
      url: '/api/v1/notifications/stream',
      getAccessToken: () => 'token-1',
      onUnauthorized: vi.fn(),
      onEvent: (event) => events.push(event),
      onOpen,
      signal: controller.signal,
      retryDelay: () => 0,
      fetch: fetchMock,
    });

    expect(events).toEqual([{ event: 'unread-count', data: '{"count":1}', id: undefined }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init = fetchMock.mock.calls[0]![1]!;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('ends the session on 401 and stops', async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));

    await runEventStream({
      url: '/stream',
      getAccessToken: () => 'expired',
      onUnauthorized,
      onEvent: vi.fn(),
      signal: new AbortController().signal,
      fetch: fetchMock,
    });

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('backs off after failures and does not connect when signed out', async () => {
    const controller = new AbortController();
    const delays: number[] = [];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    let token: string | null = 'token-1';

    await runEventStream({
      url: '/stream',
      getAccessToken: () => token,
      onUnauthorized: vi.fn(),
      onEvent: vi.fn(),
      signal: controller.signal,
      retryDelay: (failures) => {
        delays.push(failures);
        if (failures === 2) {
          token = null;
        }
        return 0;
      },
      fetch: fetchMock,
    });

    expect(delays).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
