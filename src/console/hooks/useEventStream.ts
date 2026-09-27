import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../api/client';
import { subscribeLive } from '../api/live';
import type { ActivityEvent } from '../types';

const MAX_EVENTS = 50;

/**
 * Activity feed: GET /api/v1/activity for the backlog, then `epoch.activity`
 * events from the shared /api/v1/stream connection. Pausing freezes the list;
 * resuming reloads the backlog so nothing is lost.
 */
export function useEventStream(isStreamingActive: boolean = true) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(!isStreamingActive);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const loadBacklog = useCallback(async () => {
    try {
      const backlog = await apiGet<ActivityEvent[]>(`/api/v1/activity?limit=${MAX_EVENTS}`);
      setEvents(backlog);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBacklog();
  }, [loadBacklog]);

  useEffect(() => {
    return subscribeLive((topic, data) => {
      if (topic === 'reset') {
        if (!pausedRef.current) void loadBacklog();
        return;
      }
      if (topic !== 'activity' || pausedRef.current) return;
      const event = data as ActivityEvent;
      setEvents(prev => (prev.some(e => e.id === event.id) ? prev : [event, ...prev].slice(0, MAX_EVENTS)));
    });
  }, [loadBacklog]);

  const setPaused = useCallback((paused: boolean) => {
    setIsPaused(paused);
    if (!paused) void loadBacklog();
  }, [loadBacklog]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isPaused,
    setIsPaused: setPaused,
    clearEvents,
    isLoading,
    error
  };
}
