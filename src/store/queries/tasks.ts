import { getDb } from '../db.js';

export interface Task {
  task_id: string;
  workflow_id: string | null;
  agent_type: string;
  status: string;
  dependencies: string[]; // JSON stored as string
  started_at: number | null;
  completed_at: number | null;
  input_ref: string | null;
  output_ref: string | null;
  retry_count: number;
}

export function insertTask(task: Task): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tasks (
      task_id, workflow_id, agent_type, status,
      dependencies, started_at, completed_at,
      input_ref, output_ref, retry_count
    ) VALUES (
      @task_id, @workflow_id, @agent_type, @status,
      @dependencies, @started_at, @completed_at,
      @input_ref, @output_ref, @retry_count
    )
  `);
  stmt.run({
    ...task,
    dependencies: JSON.stringify(task.dependencies)
  });
}

export function getTask(taskId: string): Task | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tasks WHERE task_id = ?');
  const row = stmt.get(taskId) as any;
  if (!row) return undefined;
  return {
    ...row,
    dependencies: JSON.parse(row.dependencies)
  };
}

export function updateTaskStatus(taskId: string, status: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tasks SET status = ? WHERE task_id = ?');
  stmt.run(status, taskId);
}

export function startTask(taskId: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tasks SET status = ?, started_at = ? WHERE task_id = ?');
  stmt.run('RUNNING', Date.now(), taskId);
}

export function completeTask(taskId: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE task_id = ?');
  stmt.run('COMPLETED', Date.now(), taskId);
}

export function failTask(taskId: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE task_id = ?');
  stmt.run('FAILED', Date.now(), taskId);
}

export function listTasksByWorkflow(workflowId: string): Task[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tasks WHERE workflow_id = ?');
  const rows = stmt.all(workflowId) as any[];
  return rows.map(row => ({
    ...row,
    dependencies: JSON.parse(row.dependencies)
  }));
}

export function getPendingTasks(workflowId: string): Task[] {
  const tasks = listTasksByWorkflow(workflowId);
  const completedTaskIds = new Set(tasks.filter(t => t.status === 'COMPLETED').map(t => t.task_id));
  
  return tasks.filter(t => {
    if (t.status !== 'PENDING') return false;
    // Check if all dependencies are completed
    return t.dependencies.every(dep => completedTaskIds.has(dep));
  });
}

export function incrementRetry(taskId: string): number {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE tasks 
    SET retry_count = retry_count + 1 
    WHERE task_id = ? 
    RETURNING retry_count
  `);
  const row = stmt.get(taskId) as { retry_count: number };
  return row.retry_count;
}
