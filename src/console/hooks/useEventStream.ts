import { useState, useEffect, useCallback } from 'react';
import { mockInitialEvents, mockStreamingEventsQueue } from '../data/mock/events';
import type { ActivityEvent } from '../types';

/**
 * Hook for live real-time activity stream in the control plane.
 *
 * TODO(IBM Bob): Wire real Server-Sent Events (SSE) stream:
 * Expected Contract:
 * - Protocol: Native EventSource against GET /api/v1/stream
 * - Reconnect: automatic exponential backoff
 * - Event schemas:
 *   - event: "epoch.mutation" payload: Mutation
 *   - event: "epoch.drift" payload: DriftFinding
 *   - event: "epoch.invariant" payload: Invariant
 *   - event: "epoch.task" payload: SpecialistTask
 */
export function useEventStream(isStreamingActive: boolean = true) {
  const [events, setEvents] = useState<ActivityEvent[]>(mockInitialEvents);
  const [isPaused, setIsPaused] = useState<boolean>(!isStreamingActive);

  // Simulate periodic incoming events for demonstration
  useEffect(() => {
    if (isPaused) return;

    let queueIndex = 0;
    const interval = setInterval(() => {
      if (queueIndex < mockStreamingEventsQueue.length) {
        const template = mockStreamingEventsQueue[queueIndex];
        const newEvent: ActivityEvent = {
          id: `EVT-${Date.now().toString().slice(-4)}`,
          timestamp: 'Just now',
          ...template
        };

        setEvents(prev => [newEvent, ...prev.slice(0, 19)]);
        queueIndex += 1;
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const addManualEvent = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newEvent: ActivityEvent = {
      id: `EVT-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just now',
      ...event
    };
    setEvents(prev => [newEvent, ...prev.slice(0, 19)]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isPaused,
    setIsPaused,
    addManualEvent,
    clearEvents
  };
}
