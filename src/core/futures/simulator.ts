import fs from 'node:fs';
import { eventBus } from '../events/bus.js';
import { incidents, mutations, simulations, trajectory } from '../../store/index.js';
import type { Scenario, Simulation } from '../../shared/schema/simulation.schema.js';
import { generateSimulationId } from '../../shared/utils/id.js';
import { diffScans } from '../../graph/scanner/diff.js';
import { scanRepository, type ScanResult } from '../../graph/scanner/scanner.js';
import { assertSafeId } from '../../sandbox/git.js';
import { applyPatch, hasUncommittedChanges, headSha, sampleRepoPath } from '../../sandbox/sample-repo.js';
import { runProbes, runTests } from '../../sandbox/runner.js';
import { addWorktree, MAX_ACTIVE_FUTURES, removeWorktree, worktreeDiff } from '../../sandbox/worktrees.js';
import { getRepoSpec } from '../epoch/spec-registry.js';
import { trajectoryEngine } from '../epoch/trajectory.js';
import { workflowEngine } from '../weave/workflow-engine.js';

export interface ScenarioInput {
  id: string;
  label: string;
  description: string;
  /** Optional unified diff applied to the worktree right away (tests, fallback). Bob usually writes the change instead. */
  patch?: string | undefined;
}

/**
 * Counterfactual futures: fork the system at a mutation into
 * isolated worktrees, let Bob (or a patch) change each one, then measure every
 * future with the same tests, probes and scanner as real mutations. Results
 * are scenarios for comparison, not predictions of production.
 */
export class FuturesSimulator {
  fork(baseMutationId: string, hypothesis: string, inputs: ScenarioInput[]): Simulation {
    if (inputs.length < 1 || inputs.length > 3) throw new Error('A simulation compares one to three futures');
    const active = simulations.listSimulations({ status: 'RUNNING' });
    if (active.length >= MAX_ACTIVE_FUTURES) throw new Error(`At most ${MAX_ACTIVE_FUTURES} simulations can run at once; finish or abandon one first`);

    const base = mutations.getMutation(baseMutationId);
    if (!base) throw new Error(`Mutation ${baseMutationId} not found`);
    const latest = mutations.getLatestMutation();
    const baseSha = base.commit_sha ?? (latest?.mutation_id === baseMutationId ? headSha(sampleRepoPath()) : undefined);
    if (!baseSha) throw new Error(`Mutation ${baseMutationId} has no commit to fork from`);
    const baseHash = trajectory.getTrajectoryPoint(baseMutationId)?.state_hash ?? 'unknown';

    const simulationId = generateSimulationId();
    const scenarios: Scenario[] = inputs.map(input => {
      const scenarioId = assertSafeId(input.id, 'scenario id');
      const worktree = addWorktree(simulationId, scenarioId, baseSha);
      if (input.patch) applyPatch(input.patch, worktree);
      return {
        scenario_id: scenarioId,
        label: input.label,
        description: input.description,
        branch_name: `epoch/sim-${scenarioId}-${simulationId}`,
        worktree_path: worktree,
        status: 'RUNNING',
        changes: input.patch ? ['patch applied at fork time'] : []
      };
    });

    const simulation: Simulation = {
      simulation_id: simulationId,
      base_mutation_id: baseMutationId,
      base_state_hash: baseHash,
      hypothesis,
      scenarios,
      status: 'RUNNING',
      created_at: Date.now()
    };
    simulations.insertSimulation(simulation);
    eventBus.emit('simulation.started', { simulationId, baseMutationId, hypothesis, scenarios: scenarios.map(s => ({ id: s.scenario_id, label: s.label, worktree: s.worktree_path ?? null })) });
    return simulation;
  }

  /** Measure one future: tests, probes and a structural scan of its worktree. */
  async evaluate(simulationId: string, scenarioId: string): Promise<Simulation> {
    const simulation = this.require(simulationId);
    const scenario = simulation.scenarios.find(s => s.scenario_id === scenarioId);
    if (!scenario?.worktree_path) throw new Error(`Scenario ${scenarioId} not found in ${simulationId}`);
    if (!fs.existsSync(scenario.worktree_path)) throw new Error(`Worktree for ${scenarioId} no longer exists`);

    const spec = getRepoSpec();
    const baseScan = trajectory.getScanForMutation(simulation.base_mutation_id) as ScanResult | undefined;
    const [tests, probes] = await Promise.all([runTests(scenario.worktree_path), runProbes(scenario.worktree_path)]);
    const scan = scanRepository(scenario.worktree_path, spec, { tests, probes, previous: baseScan });
    const diff = diffScans(baseScan ?? scan, scan);
    const patch = worktreeDiff(scenario.worktree_path);

    const updated: Scenario = {
      ...scenario,
      status: 'COMPLETED',
      changes: patch.split('\n').filter(l => l.startsWith('+++ b/')).map(l => l.slice(6)),
      diff: patch,
      invariant_outcomes: scan.invariants.map(r => ({ invariant_id: r.invariantId, status: r.status })),
      tests_passed: tests.passed,
      tests_failed: tests.failed,
      probes_failed: probes.filter(p => !p.ok).map(p => p.id),
      coupling_score_after: scan.couplingScore,
      boundary_integrity_after: scan.boundaryIntegrityScore,
      test_pass_rate: tests.passed + tests.failed > 0 ? Math.round((tests.passed / (tests.passed + tests.failed)) * 1000) / 1000 : 0,
      trajectory_delta: {
        couplingDelta: diff.couplingDelta,
        boundaryIntegrityDelta: diff.boundaryIntegrityDelta,
        behaviorDelta: diff.behaviorDelta,
        invariantChanges: diff.invariantTransitions.map(t => ({ invariant_id: t.invariantId, previousStatus: t.from, newStatus: t.to }))
      }
    };
    const scenarios = simulation.scenarios.map(s => (s.scenario_id === scenarioId ? updated : s));
    const allDone = scenarios.every(s => s.status === 'COMPLETED' || s.status === 'FAILED');
    const next: Simulation = { ...simulation, scenarios, status: allDone ? 'COMPLETED' : 'RUNNING' };
    if (allDone) next.completed_at = Date.now();
    simulations.updateSimulation(next);

    eventBus.emit('simulation.updated', {
      simulationId,
      scenarioId,
      boundaryIntegrityAfter: scan.boundaryIntegrityScore,
      couplingAfter: scan.couplingScore,
      withinEnvelope: trajectoryEngine.isWithinEnvelope(scan.couplingScore, scan.boundaryIntegrityScore),
      testsFailed: tests.failed,
      probesFailed: updated.probes_failed ?? []
    });
    if (allDone) eventBus.emit('simulation.completed', { simulationId, recommended: this.recommend(next)?.scenario_id ?? null });
    return next;
  }

  async evaluateAll(simulationId: string): Promise<Simulation> {
    const simulation = this.require(simulationId);
    let latest = simulation;
    for (const scenario of simulation.scenarios) latest = await this.evaluate(simulationId, scenario.scenario_id);
    return latest;
  }

  /** The future with the best measured outcome: fewest failures, then highest boundary integrity, then smallest diff. */
  recommend(simulation: Simulation): Scenario | undefined {
    return simulation.scenarios
      .filter(s => s.status === 'COMPLETED')
      .sort((a, b) =>
        (a.tests_failed ?? 0) + (a.probes_failed?.length ?? 0) - ((b.tests_failed ?? 0) + (b.probes_failed?.length ?? 0)) ||
        (b.boundary_integrity_after ?? 0) - (a.boundary_integrity_after ?? 0) ||
        (a.changes.length - b.changes.length)
      )[0];
  }

  /**
   * Adopt a future: its diff is applied to the sample repo and a remediation
   * workflow is started for it. The change still goes through the approval gate.
   */
  select(simulationId: string, scenarioId: string, actor: string): { simulation: Simulation; workflowId: string } {
    const simulation = this.require(simulationId);
    const scenario = simulation.scenarios.find(s => s.scenario_id === scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);
    if (scenario.status !== 'COMPLETED' || !scenario.diff) throw new Error(`Scenario ${scenarioId} has not been evaluated yet`);
    const repo = sampleRepoPath();
    if (hasUncommittedChanges(repo)) throw new Error('The sample repository has uncommitted changes; approve or reject the open workflow first');
    if (mutations.getLatestMutation()?.mutation_id !== simulation.base_mutation_id) {
      throw new Error(`The system moved past ${simulation.base_mutation_id} since this simulation was forked; fork again from the latest mutation`);
    }

    applyPatch(scenario.diff, repo);
    const openIncidents = incidents.listIncidents().filter(i => i.status !== 'resolved' && i.status !== 'wont_fix');
    const { workflow } = workflowEngine.start({
      kind: 'remediation',
      title: `Adopt future ${scenario.label}`,
      requirement: `${scenario.label}. ${scenario.description}`,
      author: actor,
      source: 'epoch-futures',
      payload: { simulation_id: simulationId, scenario_id: scenarioId, incidents: openIncidents.map(i => i.incident_id) }
    });
    for (const incident of openIncidents) {
      incidents.setRemediationWorkflow(incident.incident_id, workflow.workflow_id);
      incidents.updateIncidentStatus(incident.incident_id, 'remediation_in_progress');
    }

    const next: Simulation = { ...simulation, selected_scenario_id: scenarioId, outcome_ref: workflow.workflow_id };
    simulations.updateSimulation(next);
    eventBus.emit('simulation.updated', { simulationId, selectedScenarioId: scenarioId, workflowId: workflow.workflow_id, actor });
    return { simulation: next, workflowId: workflow.workflow_id };
  }

  /** Remove a simulation's worktrees. */
  cleanup(simulationId: string): Simulation {
    const simulation = this.require(simulationId);
    for (const s of simulation.scenarios) if (s.worktree_path) removeWorktree(s.worktree_path);
    const next: Simulation = { ...simulation, status: simulation.selected_scenario_id ? 'COMPLETED' : 'ABANDONED' };
    if (!next.completed_at) next.completed_at = Date.now();
    simulations.updateSimulation(next);
    return next;
  }

  private require(simulationId: string): Simulation {
    const simulation = simulations.getSimulation(simulationId);
    if (!simulation) throw new Error(`Simulation ${simulationId} not found`);
    return simulation;
  }
}

export const futuresSimulator = new FuturesSimulator();
