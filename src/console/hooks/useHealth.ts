import { useSyncExternalStore } from 'react';
import { apiGet } from '../api/client';
import { refreshAll, subscribeLive } from '../api/live';

/** GET /api/health (src/api/routes/system.ts). */
export interface Health {
  status: string;
  timestamp: number;
  database: string;
  sampleRepo: { path: string; head: string; branch: string } | null;
  mutations: number;
  seeded: boolean;
  demo: {
    mode: 'public' | 'local';
    showcase: 'idle' | 'building' | 'ready' | 'failed';
    restoresAfterIdleMinutes: number | null;
  };
}

export interface HealthState {
  health: Health | undefined;
  error: unknown;
  latencyMs: number | undefined;
  loaded: boolean;
}

const POLL_MS = 15_000;

let state: HealthState = { health: undefined, error: null, latencyMs: undefined, loaded: false };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let unsubscribeLive: (() => void) | undefined;
let inFlight: Promise<void> | undefined;

function emit(next: HealthState): void {
  state = next;
  for (const listener of [...listeners]) listener();
}

/** Fetch health now. When the recorded history or the sample repo HEAD changed underneath us (a reset elsewhere), refetch everything. */
export function refreshHealth(): Promise<void> {
  if (inFlight) return inFlight;
  const started = performance.now();
  inFlight = apiGet<Health>('/api/health')
    .then(health => {
      const previous = state.health;
      emit({ health, error: null, latencyMs: Math.round(performance.now() - started), loaded: true });
      if (previous && (previous.mutations !== health.mutations || previous.sampleRepo?.head !== health.sampleRepo?.head || (previous.demo.showcase !== 'ready' && health.demo.showcase === 'ready'))) {
        refreshAll();
      }
    })
    .catch(error => {
      emit({ ...state, error, loaded: true });
    })
    .finally(() => {
      inFlight = undefined;
    });
  return inFlight;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refreshHealth();
    timer = setInterval(() => void refreshHealth(), POLL_MS);
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const off = subscribeLive(topic => {
      if (topic !== 'mutation' && topic !== 'workflow') return;
      clearTimeout(debounce);
      debounce = setTimeout(() => void refreshHealth(), 800);
    });
    unsubscribeLive = () => {
      clearTimeout(debounce);
      off();
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      unsubscribeLive?.();
      unsubscribeLive = undefined;
    }
  };
}

const getState = (): HealthState => state;

export function useHealth(): HealthState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export const shortSha = (sha: string | undefined | null): string => (sha ? sha.slice(0, 7) : '—');
