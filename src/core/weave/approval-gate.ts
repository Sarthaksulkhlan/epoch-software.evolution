import { eventBus } from '../events/bus.js';
import { decisions, events, evidence, graphEdges, mutations, simulations, tasks, workflows } from '../../store/index.js';
import type { Decision, DecisionAction } from '../../shared/schema/decision.schema.js';
import type { Evidence } from '../../shared/schema/evidence.schema.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';
import type { ProbeResult } from '../../sandbox/runner.js';
import { generateDecisionId, generateEdgeId } from '../../shared/utils/id.js';
import { type RiskLevel, type Verification } from '../../agents/contracts.js';
import { assessChange } from '../../agents/synthesis/index.js';
import { diffStat, discardChanges, sampleRepoPath, workingTreeDiff } from '../../sandbox/sample-repo.js';
import { mutationEngine } from '../epoch/mutation-engine.js';
import { futuresSimulator } from '../futures/simulator.js';
import { loadHistory } from '../epoch/history.js';
import { agentRunner } from './agent-runner.js';
import { loadVerification, verifyWorkingTree } from './verification.js';
import { workflowEngine } from './workflow-engine.js';

export interface DecisionPackage {
  workflowId: string;
  title: string;
  kind: string;
  status: string;
  requirement: string;
  riskLevel: RiskLevel;
  recommendation: string;
  counts: { total: number; observed: number; inferred: number; hypothesised: number };
  evidenceByAgent: Record<string, Evidence[]>;
  openQuestions: string[];
  improvements: string[];
  trajectoryPreview: {
    before: { couplingScore: number; boundaryIntegrityScore: number } | null;
    after: { couplingScore: number; boundaryIntegrityScore: number };
    withinEnvelope: boolean;
    invariantTransitions: Array<{ invariantId: string; from: string; to: string }>;
    addedDependencies: string[];
    addedViolations: string[];
  } | null;
  driftPreview: Array<{ pattern: string; severity: string; title: string; summary: string }>;
  changedFiles: string[];
  diffStat: { files: string[]; additions: number; deletions: number };
  tests: { passed: number; failed: number } | null;
  probes: ProbeResult[];
  decision?: Decision;
  generatedAt: number;
}

/**
 * The human (or policy) gate (ADR-019). Nothing reaches the evolution graph
 * until a decision is recorded here.
 */
export class ApprovalGate {
  /** Verify the working tree, run the verification specialists and open the gate. */
  async requestApproval(workflowId: string, actor: string): Promise<DecisionPackage> {
    const workflow = workflowEngine.require(workflowId);
    if (workflow.status === 'AWAITING_APPROVAL') return this.buildPackage(workflowId);
    if (workflow.status === 'EXECUTING') workflowEngine.transition(workflowId, 'VERIFYING', { actor, stage: 'Verifying the working tree' });
    else if (workflow.status !== 'VERIFYING') {
      throw new Error(`Workflow ${workflowId} is ${workflow.status}; approval can be requested from EXECUTING or VERIFYING`);
    }

    const verification = await verifyWorkingTree(workflowId);
    await Promise.all(['security', 'qa', 'evolution'].map(agent =>
      agentRunner.runSingle(workflowId, agent as 'security' | 'qa' | 'evolution', 'verification', verification)
    ));
    await agentRunner.runSingle(workflowId, 'synthesis', 'verification', verification);

    workflowEngine.transition(workflowId, 'AWAITING_APPROVAL', { actor, stage: 'Decision package ready' });
    const pkg = this.buildPackage(workflowId, verification);
    eventBus.emit('approval.requested', { workflowId, riskLevel: pkg.riskLevel, recommendation: pkg.recommendation, title: pkg.title });
    return pkg;
  }

  /** Record the human decision. Approval commits the change and records the mutation. */
  async recordDecision(
    workflowId: string,
    actor: string,
    action: DecisionAction,
    rationale?: string,
    scope?: string
  ): Promise<{ decision: Decision; mutation: Mutation | undefined }> {
    const workflow = workflowEngine.require(workflowId);
    if (workflow.status !== 'AWAITING_APPROVAL') {
      throw new Error(`Workflow ${workflowId} is ${workflow.status}, not AWAITING_APPROVAL`);
    }
    if (actor.trim().length === 0) throw new Error('A decision needs a named actor');

    const decision: Decision = { decision_id: generateDecisionId(), workflow_id: workflowId, actor, action, timestamp: Date.now() };
    if (rationale) decision.rationale = rationale;
    if (scope) decision.scope = scope;
    decisions.insertDecision(decision);
    eventBus.emit('decision.recorded', { workflowId, decisionId: decision.decision_id, actor, action, rationale: rationale ?? null });

    if (action === 'REJECTED') {
      workflowEngine.transition(workflowId, 'REJECTED', { actor, stage: 'Rejected at the approval gate' });
      discardChanges(sampleRepoPath());
      return { decision, mutation: undefined };
    }

    workflowEngine.transition(workflowId, 'COMPLETED', { actor, stage: 'Approved' });
    await mutationEngine.processWorkflowCompletion(workflowId);
    const mutationId = workflows.getWorkflow(workflowId)?.mutation_id;
    if (mutationId) this.linkAdoptedFuture(workflowId, mutationId);
    return { decision, mutation: mutationId ? mutations.getMutation(mutationId) : undefined };
  }

  /** A remediation adopted from a simulation: record the SPAWNED edge and remove the futures' worktrees. */
  private linkAdoptedFuture(workflowId: string, mutationId: string): void {
    const workflow = workflows.getWorkflow(workflowId);
    const simulationId = workflow ? events.getEvent(workflow.trigger_event_id)?.payload.simulation_id : undefined;
    if (typeof simulationId !== 'string') return;
    const simulation = simulations.getSimulation(simulationId);
    if (!simulation) return;
    graphEdges.insertEdge({
      edge_id: generateEdgeId(),
      from_id: simulation.base_mutation_id,
      from_type: 'mutation',
      to_id: mutationId,
      to_type: 'mutation',
      relationship: 'SPAWNED',
      confidence: 1,
      evidence_ref: `simulation:${simulationId}#${simulation.selected_scenario_id ?? ''}`,
      created_at: Date.now()
    });
    futuresSimulator.cleanup(simulationId);
  }

  /** Send the workflow back to EXECUTING so the implementer can revise. */
  requestChanges(workflowId: string, actor: string, rationale: string): void {
    workflowEngine.transition(workflowId, 'EXECUTING', { actor, stage: `Changes requested: ${rationale}` });
  }

  buildPackage(workflowId: string, verification?: Verification): DecisionPackage {
    const workflow = workflowEngine.require(workflowId);
    const event = events.getEvent(workflow.trigger_event_id);
    const all = evidence.listEvidenceByWorkflow(workflowId);
    const agentOf = new Map(tasks.listTasksByWorkflow(workflowId).map(t => [t.task_id, t.agent_type]));
    const evidenceByAgent: Record<string, Evidence[]> = {};
    for (const e of all) {
      const agent = agentOf.get(e.task_id) ?? 'unknown';
      (evidenceByAgent[agent] ??= []).push(e);
    }

    const v = verification ?? loadVerification(workflowId);
    const head = loadHistory().at(-1)?.scan;
    const assessment = assessChange(workflowId);
    const recommendationClaim = [...all].reverse().find(e => e.claim.startsWith('Recommendation: '));
    const riskLevel = assessment.risk;
    const decided = decisions.listDecisionsByWorkflow(workflowId).at(-1);

    const pkg: DecisionPackage = {
      workflowId,
      title: workflow.title ?? workflowId,
      kind: workflow.kind,
      status: workflow.status,
      requirement: typeof event?.payload.requirement === 'string' ? event.payload.requirement : '',
      riskLevel,
      recommendation: recommendationClaim?.claim.replace('Recommendation: ', '') ?? assessment.recommendation,
      counts: {
        total: all.length,
        observed: all.filter(e => e.status === 'observed').length,
        inferred: all.filter(e => e.status === 'inferred').length,
        hypothesised: all.filter(e => e.status === 'hypothesised').length
      },
      evidenceByAgent,
      openQuestions: assessment.openQuestions.map(e => e.claim),
      improvements: assessment.improvements,
      trajectoryPreview: v ? {
        before: head ? { couplingScore: head.couplingScore, boundaryIntegrityScore: head.boundaryIntegrityScore } : null,
        after: { couplingScore: v.scan.couplingScore, boundaryIntegrityScore: v.scan.boundaryIntegrityScore },
        withinEnvelope: v.withinEnvelope,
        invariantTransitions: v.diff.invariantTransitions,
        addedDependencies: v.diff.addedComponentEdges.map(e => `${e.from} → ${e.to}`),
        addedViolations: v.diff.addedViolations.map(x => `${x.importer} → ${x.module} (${x.invariantId})`)
      } : null,
      driftPreview: (v?.driftPreview ?? []).map(o => ({ pattern: o.pattern, severity: o.severity, title: o.title, summary: o.summary })),
      changedFiles: v?.changedFiles ?? [],
      diffStat: diffStat(safeDiff()),
      tests: v ? { passed: v.tests.passed, failed: v.tests.failed } : null,
      probes: v?.probes ?? [],
      generatedAt: Date.now()
    };
    if (decided) pkg.decision = decided;
    return pkg;
  }
}

function safeDiff(): string {
  try {
    return workingTreeDiff(sampleRepoPath());
  } catch {
    return '';
  }
}

export const approvalGate = new ApprovalGate();
