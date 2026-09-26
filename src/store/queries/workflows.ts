import { getDb } from '../db.js';
import { compact, param, type Row } from '../rows.js';
import {
  WorkflowSchema,
  WorkflowEventSchema,
  type Workflow,
  type WorkflowEvent,
  type WorkflowStatus
} from '../../shared/schema/workflow.schema.js';

const TERMINAL: readonly WorkflowStatus[] = ['COMPLETED', 'REJECTED'];

function toWorkflow(row: Row): Workflow {
  return WorkflowSchema.parse(compact(row));
}

export function insertWorkflow(workflow: Workflow): void {
  getDb().prepare(`
    INSERT INTO workflows (
      workflow_id, trigger_event_id, kind, title, status, current_stage,
      created_at, completed_at, context_ref, plan_ref, mutation_id
    ) VALUES (
      @workflow_id, @trigger_event_id, @kind, @title, @status, @current_stage,
      @created_at, @completed_at, @context_ref, @plan_ref, @mutation_id
    )
  `).run({
    workflow_id: workflow.workflow_id,
    trigger_event_id: workflow.trigger_event_id,
    kind: workflow.kind,
    title: param(workflow.title),
    status: workflow.status,
    current_stage: param(workflow.current_stage),
    created_at: workflow.created_at,
    completed_at: param(workflow.completed_at),
    context_ref: param(workflow.context_ref),
    plan_ref: param(workflow.plan_ref),
    mutation_id: param(workflow.mutation_id)
  });
}

export function getWorkflow(workflowId: string): Workflow | undefined {
  const row = getDb().prepare('SELECT * FROM workflows WHERE workflow_id = ?').get(workflowId) as Row | undefined;
  return row ? toWorkflow(row) : undefined;
}

export function updateWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus,
  currentStage: string | undefined,
  completedAt: number | undefined
): void {
  getDb().prepare(`
    UPDATE workflows
    SET status = @status,
        current_stage = COALESCE(@current_stage, current_stage),
        completed_at = COALESCE(@completed_at, completed_at)
    WHERE workflow_id = @workflow_id
  `).run({
    workflow_id: workflowId,
    status,
    current_stage: param(currentStage),
    completed_at: param(completedAt)
  });
}

export function setWorkflowRefs(workflowId: string, refs: { context_ref?: string; plan_ref?: string; mutation_id?: string }): void {
  getDb().prepare(`
    UPDATE workflows
    SET context_ref = COALESCE(@context_ref, context_ref),
        plan_ref = COALESCE(@plan_ref, plan_ref),
        mutation_id = COALESCE(@mutation_id, mutation_id)
    WHERE workflow_id = @workflow_id
  `).run({
    workflow_id: workflowId,
    context_ref: param(refs.context_ref),
    plan_ref: param(refs.plan_ref),
    mutation_id: param(refs.mutation_id)
  });
}

export function listWorkflows(options: { status?: string | undefined; limit?: number | undefined; offset?: number | undefined } = {}): Workflow[] {
  const params: unknown[] = [];
  let sql = 'SELECT * FROM workflows';
  if (options.status) {
    sql += ' WHERE status = ?';
    params.push(options.status);
  }
  sql += ' ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?';
  params.push(options.limit ?? 100, options.offset ?? 0);
  return (getDb().prepare(sql).all(...params) as Row[]).map(toWorkflow);
}

export function getActiveWorkflows(): Workflow[] {
  const placeholders = TERMINAL.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(`SELECT * FROM workflows WHERE status NOT IN (${placeholders}) AND kind != 'seed' ORDER BY created_at DESC, rowid DESC`)
    .all(...TERMINAL) as Row[];
  return rows.map(toWorkflow);
}

export function insertWorkflowEvent(event: WorkflowEvent): void {
  getDb().prepare(`
    INSERT INTO workflow_events (workflow_id, from_status, to_status, stage, actor, timestamp)
    VALUES (@workflow_id, @from_status, @to_status, @stage, @actor, @timestamp)
  `).run({
    workflow_id: event.workflow_id,
    from_status: event.from_status,
    to_status: event.to_status,
    stage: param(event.stage),
    actor: event.actor,
    timestamp: event.timestamp
  });
}

export function listWorkflowEvents(workflowId: string): WorkflowEvent[] {
  const rows = getDb()
    .prepare('SELECT * FROM workflow_events WHERE workflow_id = ? ORDER BY id ASC')
    .all(workflowId) as Row[];
  return rows.map(row => WorkflowEventSchema.parse(compact(row)));
}
