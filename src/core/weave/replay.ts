export interface StateTransition {
  from: string;
  to: string;
  timestamp: number;
}

/**
 * Replay engine for deterministic workflow replay from event log.
 * Reads the workflow's state transition log and replays each transition.
 */
export class ReplayEngine {
  private logs = new Map<string, StateTransition[]>();

  /**
   * Replay a workflow from its event log.
   * Returns the sequence of states the workflow passed through.
   */
  replay(workflowId: string): StateTransition[] {
    return this.getReplayLog(workflowId);
  }
  
  /**
   * Get the current replay state for a workflow.
   */
  getReplayLog(workflowId: string): StateTransition[] {
    return this.logs.get(workflowId) || [];
  }

  /**
   * Logs a state transition to memory.
   */
  logTransition(workflowId: string, from: string, to: string, timestamp: number): void {
    const currentLog = this.logs.get(workflowId) || [];
    currentLog.push({ from, to, timestamp });
    this.logs.set(workflowId, currentLog);
  }
}

export const replayEngine = new ReplayEngine();
