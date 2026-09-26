import { eventBus } from '../events/bus.js';
import { updateTaskStatus, createEvidence } from '../../store/index.js';
import type { TaskGraph, Task } from './task-graph.js';
import type { ContextBundle } from '../../shared/schema/index.js';

// @ts-ignore
import type { Evidence as SchemaEvidence } from '../../shared/schema/evidence.schema.js';

export interface Evidence {
  id: string;
  taskId: string;
  status: 'observed' | 'inferred' | 'hypothesised';
  content: any;
  timestamp: number;
}

export type AgentFunction = (context: ContextBundle, task: Task) => Promise<Evidence[]>;

const agentRegistry = new Map<string, AgentFunction>();

export function registerAgent(agentType: string, fn: AgentFunction): void {
  agentRegistry.set(agentType, fn);
}

export function getAgent(agentType: string): AgentFunction | undefined {
  return agentRegistry.get(agentType);
}

export class AgentRunner {
  async runParallel(tasks: Task[], context: ContextBundle): Promise<Evidence[]> {
    const results = await Promise.all(tasks.map(task => this.runTask(task, context)));
    return results.flat();
  }
  
  async runTask(task: Task, context: ContextBundle): Promise<Evidence[]> {
    const agentFn = getAgent(task.type);
    if (!agentFn) {
      throw new Error(`No agent registered for type: ${task.type}`);
    }

    let attempts = 0;
    const maxRetries = 3;

    while (attempts <= maxRetries) {
      try {
        const nowStarted = Date.now();
        updateTaskStatus(task.id, 'RUNNING');
        task.status = 'RUNNING';
        
        eventBus.emit('task.started', { taskId: task.id, type: task.type });

        const evidence = await agentFn(context, task);

        const nowCompleted = Date.now();
        updateTaskStatus(task.id, 'COMPLETED');
        task.status = 'COMPLETED';

        for (const ev of evidence) {
          createEvidence({
            evidence_id: ev.id,
            workflow_id: task.workflowId,
            task_id: task.id,
            claim: typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content),
            status: ev.status,
            source_artifact_ref: `agent:${task.type}:${task.id}`,
            finding_severity: null,
            created_at: ev.timestamp
          });
          eventBus.emit('evidence.created', { evidenceId: ev.id, taskId: task.id });
        }

        eventBus.emit('task.completed', { taskId: task.id });

        return evidence;
      } catch (error) {
        attempts++;
        task.retryCount = attempts;
        
        if (attempts > maxRetries) {
          const nowFailed = Date.now();
          updateTaskStatus(task.id, 'FAILED');
          task.status = 'FAILED';

          eventBus.emit('task.failed', { taskId: task.id, error: String(error) });

          eventBus.emit('incident.detected', { reason: 'TASK_RETRIES_EXHAUSTED', taskId: task.id });

          throw new Error(`Task ${task.id} failed after ${maxRetries} retries: ${String(error)}`);
        }
      }
    }
    return [];
  }
  
  async executeGraph(graph: TaskGraph, context: ContextBundle): Promise<Evidence[]> {
    const allEvidence: Evidence[] = [];

    while (!graph.isComplete() && !graph.hasFailed()) {
      const readyTasks = graph.getReadyTasks();
      
      if (readyTasks.length === 0) {
         // Prevent deadlock loop in case dependencies aren't progressing
         break;
      }

      const results = await this.runParallel(readyTasks, context);
      allEvidence.push(...results);

      for (const task of readyTasks) {
        graph.completeTask(task.id);
      }
    }

    if (graph.hasFailed()) {
      throw new Error('Graph execution failed due to task failure.');
    }

    return allEvidence;
  }
}

export const agentRunner = new AgentRunner();
