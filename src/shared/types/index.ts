export * from '../schema/index.js';
import type { Event, Workflow, Task, Artifact, Evidence, Decision, Mutation, Invariant, Epoch, TrajectoryPoint, Incident, Simulation, ContextBundle, GraphEdge } from '../schema/index.js';

export type CreateEvent = Omit<Event, 'event_id'>;
export type CreateWorkflow = Omit<Workflow, 'workflow_id' | 'completed_at' | 'mutation_id'>;
export type CreateTask = Omit<Task, 'task_id' | 'completed_at'>;
export type CreateArtifact = Omit<Artifact, 'artifact_id' | 'created_at'>;
export type CreateEvidence = Omit<Evidence, 'evidence_id' | 'created_at'>;
export type CreateDecision = Omit<Decision, 'decision_id' | 'timestamp'>;
export type CreateMutation = Omit<Mutation, 'mutation_id' | 'created_at'>;
export type CreateInvariant = Omit<Invariant, 'invariant_id' | 'created_at'>;
export type CreateEpoch = Omit<Epoch, 'epoch_id' | 'created_at'>;
export type CreateTrajectoryPoint = Omit<TrajectoryPoint, 'id'>;
export type CreateIncident = Omit<Incident, 'incident_id' | 'detected_at'>;
export type CreateSimulation = Omit<Simulation, 'simulation_id' | 'created_at' | 'completed_at'>;
export type CreateGraphEdge = Omit<GraphEdge, 'edge_id' | 'created_at'>;
