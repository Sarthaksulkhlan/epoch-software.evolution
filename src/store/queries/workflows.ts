import { getDb } from '../db.js';

export interface Workflow {
  workflow_id: string;
  trigger_event_id: string | null;
  status: string;
  current_stage: string | null;
  created_at: number;
  completed_at: number | null;
  context_ref: string | null;
  plan_ref: string | null;
  mutation_id: string | null;
}

export function insertWorkflow(workflow: Workflow): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO workflows (
      workflow_id, trigger_event_id, status, current_stage,
      created_at, completed_at, context_ref, plan_ref, mutation_id
    )
    VALUES (
      @workflow_id, @trigger_event_id, @status, @current_stage,
      @created_at, @completed_at, @context_ref, @plan_ref, @mutation_id
    )
  `);
  stmt.run(workflow);
}

export function getWorkflow(workflowId: string): Workflow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM workflows WHERE workflow_id = ?');
  return stmt.get(workflowId) as Workflow | undefined;
}

export function updateWorkflowStatus(workflowId: string, status: string, currentStage?: string): void {
  const db = getDb();
  if (currentStage !== undefined) {
    const stmt = db.prepare('UPDATE workflows SET status = ?, current_stage = ? WHERE workflow_id = ?');
    stmt.run(status, currentStage, workflowId);
  } else {
    const stmt = db.prepare('UPDATE workflows SET status = ? WHERE workflow_id = ?');
    stmt.run(status, workflowId);
  }
}

export function completeWorkflow(workflowId: string, mutationId?: string): void {
  const db = getDb();
  const completedAt = Date.now();
  if (mutationId) {
    const stmt = db.prepare('UPDATE workflows SET status = ?, completed_at = ?, mutation_id = ? WHERE workflow_id = ?');
    stmt.run('COMPLETED', completedAt, mutationId, workflowId);
  } else {
    const stmt = db.prepare('UPDATE workflows SET status = ?, completed_at = ? WHERE workflow_id = ?');
    stmt.run('COMPLETED', completedAt, workflowId);
  }
}

export function listWorkflows(options: { status?: string, limit?: number, offset?: number } = {}): Workflow[] {
  const db = getDb();
  let query = 'SELECT * FROM workflows';
  const params: any[] = [];

  if (options.status) {
    query += ' WHERE status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit !== undefined) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset !== undefined) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as Workflow[];
}

export function getActiveWorkflows(): Workflow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM workflows WHERE status NOT IN (?, ?, ?)');
  return stmt.all('COMPLETED', 'FAILED', 'CANCELLED') as Workflow[];
}
