import type { AgentType } from '../shared/schema/task.schema.js';
import type { Agent } from './contracts.js';
import { contextAgent } from './context/index.js';
import { historianAgent } from './historian/index.js';
import { securityAgent } from './security/index.js';
import { qaAgent } from './qa/index.js';
import { evolutionAnalystAgent } from './evolution/index.js';
import { incidentAgent } from './incident/index.js';
import { synthesisAgent } from './synthesis/index.js';

export * from './contracts.js';

/** The deterministic specialists EPOCH can run itself. Bob's subagents call them through EPOCH-MCP. */
export const AGENTS: Partial<Record<AgentType, Agent>> = {
  context: contextAgent,
  historian: historianAgent,
  security: securityAgent,
  qa: qaAgent,
  evolution: evolutionAnalystAgent,
  incident: incidentAgent,
  synthesis: synthesisAgent
};

export function getAgent(type: AgentType): Agent | undefined {
  return AGENTS[type];
}

export { contextAgent, historianAgent, securityAgent, qaAgent, evolutionAnalystAgent, incidentAgent, synthesisAgent };
