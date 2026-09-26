import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid(21);
}

export function generateEventId(): string {
  return `evt_${nanoid(12)}`;
}

export function generateWorkflowId(): string {
  return `wf_${nanoid(12)}`;
}

export function generateTaskId(): string {
  return `task_${nanoid(12)}`;
}

export function generateEvidenceId(): string {
  return `ev_${nanoid(12)}`;
}

export function generateArtifactId(): string {
  return `art_${nanoid(12)}`;
}

export function generateDecisionId(): string {
  return `dec_${nanoid(12)}`;
}

export function generateSimulationId(): string {
  return `sim_${nanoid(12)}`;
}

export function generateEdgeId(): string {
  return `edge_${nanoid(12)}`;
}

export function generateMutationId(sequence: number): string {
  return `M-${sequence.toString().padStart(4, '0')}`;
}

export function generateIncidentId(sequence: number): string {
  return `INC-${sequence.toString().padStart(4, '0')}`;
}

export function generateEpochId(sequence: number): string {
  return `E-${sequence.toString().padStart(3, '0')}`;
}
