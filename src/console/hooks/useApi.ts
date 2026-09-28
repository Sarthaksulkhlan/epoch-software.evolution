import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { apiGet } from '../api/client';
import { getStreamStatus, subscribeLive, subscribeStreamStatus, type LiveTopic, type StreamStatus } from '../api/live';

/**
 * Call `reload` (debounced) whenever a live event of one of `topics` arrives,
 * and after every reconnect or demo restore ('reset').
 */
export function useLiveRefresh(topics: readonly LiveTopic[], reload: () => void, delayMs = 300): void {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const key = topics.join(',');

  useEffect(() => {
    const wanted = new Set(key.split(',').filter(Boolean));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeLive(topic => {
      if (topic !== 'reset' && !wanted.has(topic)) return;
      clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), delayMs);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [key, delayMs]);
}

export interface ApiResource<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  reload: () => Promise<void>;
}

/**
 * GET a JSON resource and keep it fresh from the live stream. `path` null skips
 * the request. A background refresh keeps the last good data if it fails.
 */
export function useApi<T>(path: string | null, topics: readonly LiveTopic[] = []): ApiResource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState<boolean>(path !== null);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (background: boolean) => {
    if (path === null) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestId.current;
    if (!background) setIsLoading(true);
    try {
      const next = await apiGet<T>(path, { signal: controller.signal });
      if (id !== requestId.current) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (id !== requestId.current) return;
      setError(err);
      if (!background || (err as { status?: number }).status === 404) setData(undefined);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (path === null) {
      setIsLoading(false);
      return;
    }
    void load(false);
    return () => abortRef.current?.abort();
  }, [load, path]);

  const reload = useCallback(() => load(true), [load]);
  useLiveRefresh(topics, () => void load(true));

  return { data, error, isLoading, reload };
}

export function useStreamStatus(): StreamStatus {
  return useSyncExternalStore(subscribeStreamStatus, getStreamStatus, getStreamStatus);
}
