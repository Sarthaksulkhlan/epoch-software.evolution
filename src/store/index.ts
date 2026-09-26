export { getDb, closeDb, getDbPath } from './db.js';
export { initializeSchema } from './schema.js';

export * as events from './queries/events.js';
export * as workflows from './queries/workflows.js';
export * as tasks from './queries/tasks.js';
export * as evidence from './queries/evidence.js';
export * as decisions from './queries/decisions.js';
export * as mutations from './queries/mutations.js';
export * as invariants from './queries/invariants.js';
export * as trajectory from './queries/trajectory.js';
export * as graphEdges from './queries/graph-edges.js';
export * as incidents from './queries/incidents.js';
export * as simulations from './queries/simulations.js';
export * as artifacts from './queries/artifacts.js';

// Individual aliases matching consumer imports

import {
  insertMutation,
  getMutation as getMutationById,
  listMutations,
  countMutations,
  getLatestMutationSequence
} from './queries/mutations.js';

import {
  insertEdge,
  getEdgesFrom as getEdgesFromNode,
  getEdgesTo,
  getFullGraph,
  getComponentSubgraph
} from './queries/graph-edges.js';

import {
  insertTrajectoryPoint,
  getLatestTrajectoryPoint,
  listTrajectoryPoints,
  getTrajectoryPoint
} from './queries/trajectory.js';

import {
  insertInvariant,
  listInvariants,
  updateInvariantStatus,
  getInvariantsByComponent,
  getInvariant,
  addViolationMutation
} from './queries/invariants.js';

import {
  insertEvidence,
  listEvidenceByWorkflow,
  listEvidenceByTask,
  listEvidenceByStatus
} from './queries/evidence.js';

import {
  insertTask as createTask,
  updateTaskStatus
} from './queries/tasks.js';

import {
  insertDecision,
  getDecisionByWorkflow
} from './queries/decisions.js';

import {
  listIncidents
} from './queries/incidents.js';

import {
  insertSimulation,
  getSimulation,
  listSimulations
} from './queries/simulations.js';

// Mutations
export const createMutation = insertMutation;
export const getMutation = getMutationById;
export const getAllMutations = () => listMutations();
export const queryMutations = listMutations;
export const getMutationsCount = countMutations;
export { getLatestMutationSequence };

// Graph edges
export const getEdgesFrom = getEdgesFromNode;
export const getGraphEdges = getEdgesFromNode;
export const getGraphEdgesByTarget = getEdgesTo;
export const getGraphEdgesByType = (relationship: string) => getEdgesFromNode(undefined as unknown as string, relationship);
export const getAllGraphEdges = () => getFullGraph().edges;
export { insertEdge, getComponentSubgraph };

// Trajectory
export const createTrajectoryPoint = insertTrajectoryPoint;
export const getTrajectoryTimeSeries = (limit?: number) => listTrajectoryPoints({ limit });
export { getLatestTrajectoryPoint, getTrajectoryPoint };

// Invariants
export const createInvariant = insertInvariant;
export const getInvariants = listInvariants;
export const updateInvariantStore = updateInvariantStatus;
export const queryInvariants = (options: { component?: string; status?: string } = {}) => {
  let result = listInvariants();
  if (options.component) {
    result = result.filter(inv => inv.scope_components.includes(options.component!));
  }
  if (options.status) {
    result = result.filter(inv => inv.status.toLowerCase() === options.status!.toLowerCase());
  }
  return result;
};
export { getInvariantsByComponent, getInvariant, addViolationMutation };

// Evidence
export const createEvidence = insertEvidence;
export const queryEvidence = (options: { taskId?: string; workflowId?: string; status?: string } = {}) => {
  if (options.taskId) return listEvidenceByTask(options.taskId);
  if (options.workflowId) return listEvidenceByWorkflow(options.workflowId);
  if (options.status) return listEvidenceByStatus(options.status as any);
  return listEvidenceByWorkflow('');
};

// Tasks
export { createTask, updateTaskStatus };

// Decisions
export const createDecision = insertDecision;
export const getDecisionsByWorkflow = getDecisionByWorkflow;

// Incidents
export const queryIncidents = listIncidents;

// Simulations
export const saveSimulation = insertSimulation;
export const getAllSimulations = () => listSimulations();
export { getSimulation };
