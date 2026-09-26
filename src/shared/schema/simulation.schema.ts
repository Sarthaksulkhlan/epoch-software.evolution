import { z } from 'zod';
import { TrajectoryDeltaSchema } from './mutation.schema.js';

export const SimulationStatus = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'ABANDONED']);
export type SimulationStatus = z.infer<typeof SimulationStatus>;

export const ScenarioStatus = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);
export type ScenarioStatus = z.infer<typeof ScenarioStatus>;

export const ScenarioSchema = z.object({
  scenario_id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  branch_name: z.string().min(1),
  worktree_path: z.string().optional(),
  status: ScenarioStatus.default('PENDING'),
  changes: z.array(z.string()),
  diff: z.string().optional(),
  invariant_outcomes: z.array(z.object({
    invariant_id: z.string(),
    status: z.enum(['HOLDING', 'WEAKENED', 'VIOLATED'])
  })).optional(),
  tests_passed: z.number().int().optional(),
  tests_failed: z.number().int().optional(),
  probes_failed: z.array(z.string()).optional(),
  trajectory_delta: TrajectoryDeltaSchema.optional(),
  evidence_refs: z.array(z.string()).optional(),
  coupling_score_after: z.number().optional(),
  boundary_integrity_after: z.number().optional(),
  test_pass_rate: z.number().optional()
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const SimulationSchema = z.object({
  simulation_id: z.string().min(1),
  base_mutation_id: z.string().min(1),
  base_state_hash: z.string().min(1),
  hypothesis: z.string().min(1),
  scenarios: z.array(ScenarioSchema).min(1),
  status: SimulationStatus,
  outcome_ref: z.string().optional(),
  selected_scenario_id: z.string().optional(),
  created_at: z.number().int().positive(),
  completed_at: z.number().int().positive().optional()
});

export type Simulation = z.infer<typeof SimulationSchema>;
