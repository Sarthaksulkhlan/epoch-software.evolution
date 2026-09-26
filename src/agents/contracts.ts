import type { ContextBundle, Evidence, FindingSeverity } from '../shared/schema/index.js';
import { generateEvidenceId } from '../shared/utils/id.js';

/**
 * Context passed to every specialist agent. Contains the shared ContextBundle
 * plus workflow/task identifiers and any optional analysis inputs (diff,
 * dependency manifest, acceptance criteria, affected components).
 */
export interface AgentContext {
  workflowId: string;
  taskId: string;
  contextBundle: ContextBundle;
  diff?: string;
  dependencyManifest?: string;
  acceptanceCriteria?: string[];
  affectedComponents?: string[];
}

/**
 * Result returned by a specialist agent. Evidence uses the canonical schema
 * shape so it can be persisted directly by the coordinator or workflow engine.
 */
export interface AgentResult {
  agentName: string;
  evidence: Evidence[];
  summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Specialist agent contract. Every agent is stateless and implements a single
 * `run` method that produces evidence and a risk assessment.
 */
export interface Agent {
  readonly name: string;
  run(ctx: AgentContext): Promise<AgentResult>;
}

/**
 * Helper to build a schema-shaped Evidence record from an AgentContext.
 */
export function createEvidence(
  ctx: AgentContext,
  claim: string,
  status: Evidence['status'],
  sourceArtifactRef: string,
  findingSeverity?: FindingSeverity
): Evidence {
  const evidence: Evidence = {
    evidence_id: generateEvidenceId(),
    workflow_id: ctx.workflowId,
    task_id: ctx.taskId,
    claim,
    status,
    source_artifact_ref: sourceArtifactRef,
    created_at: Date.now()
  };
  if (findingSeverity !== undefined) {
    evidence.finding_severity = findingSeverity;
  }
  return evidence;
}
