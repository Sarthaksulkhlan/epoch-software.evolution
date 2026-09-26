import { EventEmitter } from 'node:events';

export type PlatformEventType =
  | 'event.ingested'
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.completed'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'evidence.created'
  | 'decision.recorded'
  | 'approval.requested'
  | 'mutation.committed'
  | 'trajectory.updated'
  | 'drift.detected'
  | 'drift.resolved'
  | 'invariant.changed'
  | 'epoch.proposed'
  | 'epoch.confirmed'
  | 'incident.detected'
  | 'incident.resolved'
  | 'simulation.started'
  | 'simulation.updated'
  | 'simulation.completed'
  | 'repo.file_changed';

export interface PlatformEvent<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Monotonic id; the SSE stream uses it as the event id for resumption. */
  id: number;
  type: PlatformEventType;
  timestamp: number;
  payload: P;
}

type Handler = (event: PlatformEvent) => void;

const RECENT_LIMIT = 500;
const ANY = '*';

/**
 * In-process event bus. Every emit is wrapped in a PlatformEvent envelope so
 * subscribers (SSE, metrics, the macro loop) always know the event type.
 */
export class EventBus {
  private emitter = new EventEmitter().setMaxListeners(0);
  private nextId = 1;
  private recentEvents: PlatformEvent[] = [];

  emit<P extends Record<string, unknown>>(type: PlatformEventType, payload: P): PlatformEvent<P> {
    const event: PlatformEvent<P> = { id: this.nextId++, type, timestamp: Date.now(), payload };
    this.recentEvents.push(event);
    if (this.recentEvents.length > RECENT_LIMIT) this.recentEvents.shift();
    this.emitter.emit(type, event);
    this.emitter.emit(ANY, event);
    return event;
  }

  on(type: PlatformEventType, handler: Handler): void {
    this.emitter.on(type, handler);
  }

  off(type: PlatformEventType, handler: Handler): void {
    this.emitter.off(type, handler);
  }

  onAny(handler: Handler): void {
    this.emitter.on(ANY, handler);
  }

  offAny(handler: Handler): void {
    this.emitter.off(ANY, handler);
  }

  /** Events emitted after `afterId` (all retained events when omitted), oldest first. */
  recent(afterId = 0): PlatformEvent[] {
    return this.recentEvents.filter(e => e.id > afterId);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const eventBus = new EventBus();
