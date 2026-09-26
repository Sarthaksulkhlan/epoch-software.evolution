import { getDb } from '../db.js';

export interface Decision {
  decision_id: string;
  workflow_id: string | null;
  actor: string;
  action: string;
  rationale: string | null;
  scope: string | null;
  timestamp: number;
}

export function insertDecision(decision: Decision): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO decisions (
      decision_id, workflow_id, actor, action,
      rationale, scope, timestamp
    ) VALUES (
      @decision_id, @workflow_id, @actor, @action,
      @rationale, @scope, @timestamp
    )
  `);
  stmt.run(decision);
}

export function getDecision(decisionId: string): Decision | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM decisions WHERE decision_id = ?');
  return stmt.get(decisionId) as Decision | undefined;
}

export function getDecisionByWorkflow(workflowId: string): Decision | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM decisions WHERE workflow_id = ?');
  return stmt.get(workflowId) as Decision | undefined;
}
