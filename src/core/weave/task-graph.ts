import { nanoid } from 'nanoid';
import { createTask } from '../../store/index.js';

// Temporary inline types
// @ts-ignore
import type { Task as SchemaTask } from '../../shared/schema/task.schema.js';

export interface Task {
  id: string;
  workflowId: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  created_at: number;
}

export interface TaskNode {
  task: Task;
  dependsOn: string[];  // task IDs
  dependedBy: string[]; // task IDs
}

export class TaskGraph {
  private nodes: Map<string, TaskNode> = new Map();
  
  addTask(task: Task): void {
    if (!this.nodes.has(task.id)) {
      this.nodes.set(task.id, {
        task,
        dependsOn: [],
        dependedBy: []
      });
      createTask(task);
    }
  }
  
  addDependency(taskId: string, dependsOnTaskId: string): void {
    const node = this.nodes.get(taskId);
    const dependsOnNode = this.nodes.get(dependsOnTaskId);
    
    if (node && dependsOnNode) {
      if (!node.dependsOn.includes(dependsOnTaskId)) {
        node.dependsOn.push(dependsOnTaskId);
      }
      if (!dependsOnNode.dependedBy.includes(taskId)) {
        dependsOnNode.dependedBy.push(taskId);
      }
    }
  }
  
  getReadyTasks(): Task[] {
    const ready: Task[] = [];
    for (const node of this.nodes.values()) {
      if (node.task.status === 'PENDING') {
        const allDepsMet = node.dependsOn.every(depId => {
          const depNode = this.nodes.get(depId);
          return depNode && depNode.task.status === 'COMPLETED';
        });
        if (allDepsMet) {
          ready.push(node.task);
        }
      }
    }
    return ready;
  }
  
  completeTask(taskId: string): Task[] {
    const node = this.nodes.get(taskId);
    if (node) {
      node.task.status = 'COMPLETED';
    }
    return this.getReadyTasks();
  }
  
  failTask(taskId: string): void {
    const node = this.nodes.get(taskId);
    if (node) {
      node.task.status = 'FAILED';
    }
  }
  
  isComplete(): boolean {
    for (const node of this.nodes.values()) {
      if (node.task.status !== 'COMPLETED') {
        return false;
      }
    }
    return true;
  }
  
  hasFailed(): boolean {
    for (const node of this.nodes.values()) {
      if (node.task.status === 'FAILED') {
        return true;
      }
    }
    return false;
  }
  
  getAllTasks(): Task[] {
    return Array.from(this.nodes.values()).map(n => n.task);
  }
  
  getExecutionOrder(): Task[] {
    const order: Task[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) throw new Error(`Cycle detected at task ${taskId}`);
      
      visiting.add(taskId);
      const node = this.nodes.get(taskId);
      if (node) {
        for (const dep of node.dependsOn) {
          visit(dep);
        }
        visited.add(taskId);
        visiting.delete(taskId);
        order.push(node.task);
      }
    };

    for (const taskId of this.nodes.keys()) {
      visit(taskId);
    }

    return order;
  }
  
  static buildFeatureWorkflowGraph(workflowId: string): TaskGraph {
    const graph = new TaskGraph();
    const now = Date.now();
    
    const historian: Task = { id: nanoid(), workflowId, type: 'HISTORIAN', status: 'PENDING', retryCount: 0, created_at: now };
    const security: Task = { id: nanoid(), workflowId, type: 'SECURITY', status: 'PENDING', retryCount: 0, created_at: now };
    const qa: Task = { id: nanoid(), workflowId, type: 'QA', status: 'PENDING', retryCount: 0, created_at: now };
    const context: Task = { id: nanoid(), workflowId, type: 'CONTEXT', status: 'PENDING', retryCount: 0, created_at: now };
    const synthesis: Task = { id: nanoid(), workflowId, type: 'SYNTHESIS', status: 'PENDING', retryCount: 0, created_at: now };

    [historian, security, qa, context, synthesis].forEach(t => graph.addTask(t));

    // Synthesis sequentially follows all parallel tasks
    graph.addDependency(synthesis.id, historian.id);
    graph.addDependency(synthesis.id, security.id);
    graph.addDependency(synthesis.id, qa.id);
    graph.addDependency(synthesis.id, context.id);

    return graph;
  }
  
  static buildIncidentGraph(workflowId: string): TaskGraph {
    const graph = new TaskGraph();
    const now = Date.now();
    
    // Group 1
    const historian: Task = { id: nanoid(), workflowId, type: 'HISTORIAN', status: 'PENDING', retryCount: 0, created_at: now };
    const incident: Task = { id: nanoid(), workflowId, type: 'INCIDENT', status: 'PENDING', retryCount: 0, created_at: now };
    const evolution: Task = { id: nanoid(), workflowId, type: 'EVOLUTION', status: 'PENDING', retryCount: 0, created_at: now };
    
    // Group 2
    const security: Task = { id: nanoid(), workflowId, type: 'SECURITY', status: 'PENDING', retryCount: 0, created_at: now };
    const qa: Task = { id: nanoid(), workflowId, type: 'QA', status: 'PENDING', retryCount: 0, created_at: now };
    
    // Synthesis
    const synthesis: Task = { id: nanoid(), workflowId, type: 'SYNTHESIS', status: 'PENDING', retryCount: 0, created_at: now };

    [historian, incident, evolution, security, qa, synthesis].forEach(t => graph.addTask(t));

    // Group 2 depends on Evolution from Group 1
    graph.addDependency(security.id, evolution.id);
    graph.addDependency(qa.id, evolution.id);
    
    // Synthesis depends on all tasks being done
    graph.addDependency(synthesis.id, historian.id);
    graph.addDependency(synthesis.id, incident.id);
    graph.addDependency(synthesis.id, security.id);
    graph.addDependency(synthesis.id, qa.id);

    return graph;
  }
}
