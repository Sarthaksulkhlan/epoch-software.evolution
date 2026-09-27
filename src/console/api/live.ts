/**
 * One shared EventSource on GET /api/v1/stream for the whole console. Hooks
 * subscribe to topics and refetch when something they show changes.
 *
 * The browser reconnects by itself (sending Last-Event-ID); when the stream
 * fails hard (the API is down and the dev proxy answers an error), we reconnect
 * with backoff. After any reconnect every subscriber refetches, because events
 * may have been missed.
 */

export type LiveTopic = 'activity' | 'task' | 'mutation' | 'drift' | 'invariant' | 'workflow' | 'reset';
export type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

type Listener = (topic: LiveTopic, data: unknown) => void;

const STREAM_PATH = '/api/v1/stream';
const EVENT_TOPICS: Record<string, LiveTopic> = {
  'epoch.activity': 'activity',
  'epoch.task': 'task',
  'epoch.mutation': 'mutation',
  'epoch.drift': 'drift',
  'epoch.invariant': 'invariant',
  'epoch.workflow': 'workflow'
};

const listeners = new Set<Listener>();
const statusListeners = new Set<() => void>();
let source: EventSource | null = null;
let status: StreamStatus = 'connecting';
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function setStatus(next: StreamStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of [...statusListeners]) listener();
}

function publish(topic: LiveTopic, data: unknown): void {
  for (const listener of [...listeners]) listener(topic, data);
}

function scheduleReconnect(): void {
  if (retryTimer) return;
  const delay = Math.min(15_000, 1_000 * 2 ** Math.min(failures, 4));
  failures += 1;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    connect();
  }, delay);
}

/**
 * The API sends the stream's headers with its first event (or the 25 s
 * keep-alive), so 'open' can be late. A stream that is still connecting after
 * a moment, without an error, is up: a down API fails fast through the proxy.
 */
const ASSUME_LIVE_MS = 2_500;

function connect(): void {
  if (source || typeof EventSource === 'undefined') return;
  const es = new EventSource(STREAM_PATH);
  source = es;
  let assume: ReturnType<typeof setTimeout> | undefined;

  /** Up (again): after a drop, every subscriber refetches what it may have missed. */
  const markLive = (): void => {
    clearTimeout(assume);
    if (source !== es || status === 'live') return;
    const recovered = status === 'reconnecting' || status === 'offline';
    failures = 0;
    setStatus('live');
    if (recovered) publish('reset', null);
  };
  const assumeLiveSoon = (): void => {
    clearTimeout(assume);
    assume = setTimeout(() => {
      if (es.readyState === EventSource.CONNECTING) markLive();
    }, ASSUME_LIVE_MS);
  };
  assumeLiveSoon();

  es.onopen = markLive;

  es.onerror = () => {
    clearTimeout(assume);
    if (es.readyState === EventSource.CLOSED) {
      es.close();
      if (source === es) source = null;
      setStatus('offline');
      scheduleReconnect();
    } else {
      // The browser reconnects by itself (with Last-Event-ID).
      setStatus('reconnecting');
      assumeLiveSoon();
    }
  };

  for (const [name, topic] of Object.entries(EVENT_TOPICS)) {
    es.addEventListener(name, event => {
      markLive();
      let data: unknown;
      try {
        data = JSON.parse((event as MessageEvent<string>).data);
      } catch {
        return;
      }
      publish(topic, data);
    });
  }
}

/** Listen to live events; the stream opens on the first subscriber and stays open. */
export function subscribeLive(listener: Listener): () => void {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
  };
}

/** Ask every live hook to refetch (after a demo restore, for example). */
export function refreshAll(): void {
  publish('reset', null);
}

export function subscribeStreamStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  connect();
  return () => {
    statusListeners.delete(listener);
  };
}

export const getStreamStatus = (): StreamStatus => status;
