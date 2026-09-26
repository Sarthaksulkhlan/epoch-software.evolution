import { evidence, tasks } from '../../store/index.js';
import type { AgentType } from '../../shared/schema/task.schema.js';
import type { EvidenceStatus, FindingSeverity } from '../../shared/schema/evidence.schema.js';
import { generateEvidenceId, generateTaskId } from '../../shared/utils/id.js';

/**
 * Records platform-produced evidence under a task of a workflow, so every
 * claim EPOCH makes has the same provenance chain as an agent's claim.
 */
export class EvidenceWriter {
  readonly taskId: string;
  readonly ids: string[] = [];

  constructor(readonly workflowId: string, agentType: AgentType, private readonly at: number, phase?: 'analysis' | 'verification') {
    this.taskId = generateTaskId();
    const task = {
      task_id: this.taskId,
      workflow_id: workflowId,
      agent_type: agentType,
      status: 'RUNNING' as const,
      dependencies: [],
      started_at: at,
      retry_count: 0
    };
    tasks.insertTask(phase ? { ...task, input_ref: phase } : task);
  }

  record(claim: string, status: EvidenceStatus, sourceRef: string, severity?: FindingSeverity): string {
    const id = generateEvidenceId();
    const record = {
      evidence_id: id,
      workflow_id: this.workflowId,
      task_id: this.taskId,
      claim,
      status,
      source_artifact_ref: sourceRef,
      created_at: this.at
    };
    evidence.insertEvidence(severity ? { ...record, finding_severity: severity } : record);
    this.ids.push(id);
    return id;
  }

  finish(at: number, outputRef?: string): void {
    tasks.markTaskFinished(this.taskId, 'COMPLETED', at, outputRef);
  }
}
