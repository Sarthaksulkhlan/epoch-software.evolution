import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from '../../store/db.js';
import { initializeSchema } from '../../store/schema.js';
import {
  queryMutations,
  getMutation,
  queryInvariants,
  getInvariants,
  getTrajectoryTimeSeries,
  getLatestTrajectoryPoint,
  workflows,
  graphEdges,
  incidents,
  getAllGraphEdges
} from '../../store/index.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';
import { mutationGraph } from '../../graph/mutations/mutation-graph.js';
import {
  semanticDriftDetector,
  structuralDriftDetector,
  temporalDriftDetector
} from '../../graph/drift/index.js';
import { trajectoryEngine } from '../../core/epoch/trajectory.js';
import { epochDetector } from '../../core/epoch/epoch-detector.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

const TOOLS: MCPTool[] = [
  {
    name: 'get_mutation_history',
    description: 'Return recent mutations, optionally filtered by component.',
    inputSchema: {
      type: 'object',
      properties: {
        component: { type: 'string', description: 'Component filter (optional)' },
        limit: { type: 'number', description: 'Maximum mutations to return' }
      }
    }
  },
  {
    name: 'get_mutation',
    description: 'Return a single mutation by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        mutation_id: { type: 'string' }
      },
      required: ['mutation_id']
    }
  },
  {
    name: 'check_invariants',
    description: 'Return invariants for the given components.',
    inputSchema: {
      type: 'object',
      properties: {
        components: { type: 'array', items: { type: 'string' } }
      },
      required: ['components']
    }
  },
  {
    name: 'get_trajectory_snapshot',
    description: 'Return the current trajectory snapshot.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_trajectory_timeseries',
    description: 'Return recent trajectory points.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'list_active_workflows',
    description: 'Return workflows that are not terminal.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_causal_chain',
    description: 'Trace a causal chain from a symptom or mutation.',
    inputSchema: {
      type: 'object',
      properties: {
        symptom: { type: 'string' },
        component: { type: 'string' },
        mutation_id: { type: 'string' }
      }
    }
  },
  {
    name: 'check_drift',
    description: 'Run all drift detectors and return findings.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_graph_edges',
    description: 'Return graph edges for a mutation or the full graph.',
    inputSchema: {
      type: 'object',
      properties: {
        mutation_id: { type: 'string' }
      }
    }
  },
  {
    name: 'get_current_epoch',
    description: 'Return the current epoch and recent epoch boundaries.',
    inputSchema: { type: 'object', properties: {} }
  }
];

function handleToolCall(call: MCPToolCall): unknown {
  const args = call.arguments;

  switch (call.name) {
    case 'get_mutation_history': {
      const component = typeof args.component === 'string' ? args.component : undefined;
      const limit = typeof args.limit === 'number' ? args.limit : 10;
      return { mutations: queryMutations({ component, limit }) };
    }

    case 'get_mutation': {
      const mutationId = String(args.mutation_id ?? '');
      return { mutation: getMutation(mutationId) };
    }

    case 'check_invariants': {
      const components = Array.isArray(args.components) ? args.components.map(String) : [];
      const result = components.length > 0
        ? queryInvariants({ component: components[0] })
        : getInvariants();
      return { invariants: result, components };
    }

    case 'get_trajectory_snapshot': {
      return { snapshot: trajectoryEngine.getTrajectorySnapshot() };
    }

    case 'get_trajectory_timeseries': {
      const limit = typeof args.limit === 'number' ? args.limit : 10;
      return { series: getTrajectoryTimeSeries(limit) };
    }

    case 'list_active_workflows': {
      return { workflows: workflows.getActiveWorkflows() };
    }

    case 'get_causal_chain': {
      const mutationId = typeof args.mutation_id === 'string' ? args.mutation_id : '';
      const symptom = typeof args.symptom === 'string' ? args.symptom : '';
      const component = typeof args.component === 'string' ? args.component : '';

      const chain = mutationId
        ? causalArchaeologist.findRootCause(mutationId)
        : causalArchaeologist.traceCausalChain(symptom, component);

      return { chain };
    }

    case 'check_drift': {
      return {
        findings: [
          semanticDriftDetector.detect(mutationGraph),
          structuralDriftDetector.detect(mutationGraph),
          temporalDriftDetector.detect(mutationGraph)
        ]
      };
    }

    case 'get_graph_edges': {
      const mutationId = typeof args.mutation_id === 'string' ? args.mutation_id : '';
      const edges = mutationId
        ? graphEdges.getEdgesFrom(mutationId)
        : getAllGraphEdges();
      return { edges };
    }

    case 'get_current_epoch': {
      return {
        current_epoch: epochDetector.getCurrentEpoch(),
        latest_point: getLatestTrajectoryPoint()
      };
    }

    default:
      return { error: `Unknown tool: ${call.name}` };
  }
}

export function createMCPApp(): Hono {
  const mcp = new Hono();

  mcp.use('*', cors());

  mcp.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

  mcp.get('/tools', (c) => c.json({ tools: TOOLS }));

  mcp.post('/tools/call', async (c) => {
    const body = await c.req.json<MCPToolCall>();

    if (!body.name) {
      return c.json({ error: 'Tool call missing name' }, 400);
    }

    try {
      const result = handleToolCall(body);
      return c.json({ result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool call failed';
      return c.json({ error: message }, 500);
    }
  });

  return mcp;
}

export function startMCPServer(): void {
  const db = getDb();
  initializeSchema(db);

  const mcp = createMCPApp();
  const MCP_PORT = parseInt(process.env.MCP_PORT || '3001', 10);

  serve({ fetch: mcp.fetch, port: MCP_PORT }, (info) => {
    console.log(`EPOCH-MCP server running on http://localhost:${info.port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer();
}
