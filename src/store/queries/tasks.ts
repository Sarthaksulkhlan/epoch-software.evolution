import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { TaskSchema, type Task, type TaskStatus } from '../../shared/schema/task.schema.js';

type FinishedStatus = Extract<TaskStatus, 'COMPLETED' | 'FAILED' | 'SKIPPED'>;

function toTask(row: Row): Task {
  return TaskSchema.parse(compact(decodeJson(row, ['dependencies'])));
}

export function insertTask(task: Task): void {
  getDb().prepare(`
    INSERT INTO tasks (
      task_id, workflow_id, agent_type, status, dependencies,
      started_at, completed_at, input_ref, output_ref, retry_count
    ) VALUES (
      @task_id, @workflow_id, @agent_type, @status, @dependencies,
      @started_at, @completed_at, @input_ref, @output_ref, @retry_count
    )
  `).run({
    task_id: task.task_id,
    workflow_id: task.workflow_id,
    agent_type: task.agent_type,
    status: task.status,
    dependencies: json(task.dependencies),
    started_at: param(task.started_at),
    completed_at: param(task.completed_at),
    input_ref: param(task.input_ref),
    output_ref: param(task.output_ref),
    retry_count: task.retry_count
  });
}

export function getTask(taskId: string): Task | undefined {
  const row = getDb().prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId) as Row | undefined;
  return row ? toTask(row) : undefined;
}

export function listTasksByWorkflow(workflowId: string): Task[] {
  const rows = getDb().prepare('SELECT * FROM tasks WHERE workflow_id = ? ORDER BY rowid ASC').all(workflowId) as Row[];
  return rows.map(toTask);
}

export function markTaskRunning(taskId: string, at: number): void {
  getDb().prepare('UPDATE tasks SET status = ?, started_at = ? WHERE task_id = ?').run('RUNNING', at, taskId);
}

export function markTaskFinished(taskId: string, status: FinishedStatus, at: number, outputRef?: string): void {
  getDb()
    .prepare('UPDATE tasks SET status = ?, completed_at = ?, output_ref = COALESCE(?, output_ref) WHERE task_id = ?')
    .run(status, at, param(outputRef), taskId);
}

export function incrementRetry(taskId: string): number {
  const row = getDb()
    .prepare('UPDATE tasks SET retry_count = retry_count + 1 WHERE task_id = ? RETURNING retry_count')
    .get(taskId) as { retry_count: number } | undefined;
  return row?.retry_count ?? 0;
}
