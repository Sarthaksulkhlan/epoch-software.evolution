import { decisions, driftFindings, events, graphEdges, incidents, mutations, simulations, tasks, trajectory, workflows } from '../store/index.js';
import { causalArchaeologist } from '../graph/causal/archaeologist.js';

export interface WorkflowMetrics {
  workflowId: string;
  title: string;
  kind: string;
  status: string;
  /** Requirement event → plan-ready (PLANNING) in ms. */
  timeToPlanMs: number | null;
  /** Requirement event → approval gate opened in ms. */
  timeToGateMs: number | null;
  /** First specialist start → last specialist end. */
  specialistWallClockMs: number | null;
  /** Sum of specialist durations ÷ wall clock; above 1 means work ran in parallel. */
  parallelism: number | null;
  specialistTasks: number;
  humanDecisions: number;
  transitions: number;
  mutationId: string | null;
}

export interface PlatformMetrics {
  workflows: WorkflowMetrics[];
  drift: { findings: number; open: number; detectionLatencyMs: number[] };
  incidents: Array<{ incidentId: string; detectedAt: number; remediatedAt: number | null; timeToRemediationMs: number | null }>;
  causalSearch: Array<{ subject: string; durationMs: number; examined: number; chainLength: number }>;
  futures: Array<{ simulationId: string; compared: number; selected: string | null }>;
  replay: { seededMutations: number; baselineStateHashes: number };
  generatedAt: number;
}

/**
 * Dossier §27: measure the prototype instead of claiming percentages. Every
 * number here is computed from the persisted event log and records.
 */
export function computeMetrics(): PlatformMetrics {
  const list = workflows.listWorkflows({ limit: 500 }).filter(w => w.kind !== 'seed');
  const perWorkflow: WorkflowMetrics[] = list.map(w => {
    const event = events.getEvent(w.trigger_event_id);
    const log = workflows.listWorkflowEvents(w.workflow_id);
    const planAt = log.find(e => e.to_status === 'PLANNING')?.timestamp;
    const gateAt = log.find(e => e.to_status === 'AWAITING_APPROVAL')?.timestamp;
    const specialist = tasks.listTasksByWorkflow(w.workflow_id).filter(t => t.agent_type !== 'scanner' && t.started_at && t.completed_at);
    const starts = specialist.map(t => t.started_at!);
    const ends = specialist.map(t => t.completed_at!);
    const wall = specialist.length > 0 ? Math.max(...ends) - Math.min(...starts) : null;
    const busy = specialist.reduce((sum, t) => sum + (t.completed_at! - t.started_at!), 0);
    return {
      workflowId: w.workflow_id,
      title: w.title ?? w.workflow_id,
      kind: w.kind,
      status: w.status,
      timeToPlanMs: event && planAt ? planAt - event.timestamp : null,
      timeToGateMs: event && gateAt ? gateAt - event.timestamp : null,
      specialistWallClockMs: wall,
      parallelism: wall && wall > 0 ? Math.round((busy / wall) * 100) / 100 : null,
      specialistTasks: specialist.length,
      humanDecisions: decisions.listDecisionsByWorkflow(w.workflow_id).filter(d => !d.actor.startsWith('policy')).length,
      transitions: log.length,
      mutationId: w.mutation_id ?? null
    };
  });

  const findings = driftFindings.listDriftFindings();
  const detectionLatencyMs = findings.map(f => f.detected_at - (mutations.getMutation(f.detected_by_mutation_id)?.created_at ?? f.detected_at));

  const incidentMetrics = incidents.listIncidents().map(i => {
    const remediated = graphEdges.getEdgesTo(i.incident_id, 'REMEDIATES')[0];
    return {
      incidentId: i.incident_id,
      detectedAt: i.detected_at,
      remediatedAt: remediated?.created_at ?? null,
      timeToRemediationMs: remediated ? remediated.created_at - i.detected_at : null
    };
  });

  const causalSearch = [
    ...incidents.listIncidents().map(i => ({ id: i.incident_id, trace: () => causalArchaeologist.traceIncident(i.incident_id) })),
    ...findings.filter(f => f.status === 'open').map(f => ({ id: f.finding_id, trace: () => causalArchaeologist.traceFinding(f.finding_id) }))
  ].map(item => {
    const started = performance.now();
    const chain = item.trace();
    return { subject: item.id, durationMs: Math.round((performance.now() - started) * 10) / 10, examined: chain.traversal.examined, chainLength: chain.chain.length };
  });

  const seeded = workflows.listWorkflows({ limit: 1000 }).filter(w => w.kind === 'seed').length;
  const baselineHashes = new Set(trajectory.listTrajectoryPoints().slice(0, seeded).map(p => p.state_hash)).size;

  return {
    workflows: perWorkflow,
    drift: { findings: findings.length, open: findings.filter(f => f.status === 'open').length, detectionLatencyMs },
    incidents: incidentMetrics,
    causalSearch,
    futures: simulations.listSimulations().map(s => ({ simulationId: s.simulation_id, compared: s.scenarios.length, selected: s.selected_scenario_id ?? null })),
    replay: { seededMutations: seeded, baselineStateHashes: baselineHashes },
    generatedAt: Date.now()
  };
}
