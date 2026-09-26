import { getDb } from '../db.js';
import { compact, param, type Row } from '../rows.js';
import { DecisionSchema, type Decision } from '../../shared/schema/decision.schema.js';

function toDecision(row: Row): Decision {
  return DecisionSchema.parse(compact(row));
}

export function insertDecision(decision: Decision): void {
  getDb().prepare(`
    INSERT INTO decisions (decision_id, workflow_id, actor, action, rationale, scope, timestamp)
    VALUES (@decision_id, @workflow_id, @actor, @action, @rationale, @scope, @timestamp)
  `).run({
    decision_id: decision.decision_id,
    workflow_id: decision.workflow_id,
    actor: decision.actor,
    action: decision.action,
    rationale: param(decision.rationale),
    scope: param(decision.scope),
    timestamp: decision.timestamp
  });
}

export function listDecisionsByWorkflow(workflowId: string): Decision[] {
  const rows = getDb()
    .prepare('SELECT * FROM decisions WHERE workflow_id = ? ORDER BY timestamp ASC, rowid ASC')
    .all(workflowId) as Row[];
  return rows.map(toDecision);
}

export function listDecisions(limit = 100): Decision[] {
  const rows = getDb().prepare('SELECT * FROM decisions ORDER BY timestamp DESC, rowid DESC LIMIT ?').all(limit) as Row[];
  return rows.map(toDecision);
}
