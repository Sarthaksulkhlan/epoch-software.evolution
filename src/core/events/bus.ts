import EventEmitter from 'eventemitter3';

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
  | 'mutation.committed'
  | 'drift.detected'
  | 'invariant.changed'
  | 'simulation.started'
  | 'simulation.completed'
  | 'epoch.proposed'
  | 'incident.detected'
  | 'incident.resolved';

const ALL_EVENT_TYPES: PlatformEventType[] = [
  'event.ingested',
  'workflow.created',
  'workflow.updated',
  'workflow.completed',
  'task.started',
  'task.completed',
  'task.failed',
  'evidence.created',
  'decision.recorded',
  'mutation.committed',
  'drift.detected',
  'invariant.changed',
  'simulation.started',
  'simulation.completed',
  'epoch.proposed',
  'incident.detected',
  'incident.resolved'
];

export interface PlatformEvent {
  type: PlatformEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export class EventBus {
  private emitter = new EventEmitter();
  
  emit(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }
  
  on(type: string, handler: (payload: unknown) => void): void {
    this.emitter.on(type, handler);
  }
  
  off(type: string, handler: (payload: unknown) => void): void {
    this.emitter.off(type, handler);
  }
  
  once(type: string, handler: (payload: unknown) => void): void {
    this.emitter.once(type, handler);
  }
  
  onAny(handler: (event: PlatformEvent) => void): void {
    for (const type of ALL_EVENT_TYPES) {
      this.emitter.on(type, handler);
    }
  }
  
  offAny(handler: (event: PlatformEvent) => void): void {
    for (const type of ALL_EVENT_TYPES) {
      this.emitter.off(type, handler);
    }
  }
  
  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const eventBus = new EventBus();
