export { MutationGraph, mutationGraph, type EdgeType } from './mutations/mutation-graph.js';
export { TrajectoryAnalyzer, trajectoryAnalyzer } from './trajectory/trajectory-analyzer.js';
export {
  semanticDriftDetector,
  structuralDriftDetector,
  temporalDriftDetector,
  type DriftDetector,
  type DriftReport
} from './drift/index.js';
export { CausalArchaeologist, causalArchaeologist, type CausalChain, type CausalCandidate } from './causal/archaeologist.js';
export { WhatIfSimulator, whatIfSimulator, type SimulationResult, type WhatIfScenario } from './simulation/what-if.js';
