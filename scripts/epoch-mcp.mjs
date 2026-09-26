#!/usr/bin/env node
/**
 * Start EPOCH-MCP from any working directory. MCP hosts such as IBM Bob spawn
 * servers from their own directory, so this launcher resolves tsx and the
 * server relative to itself instead of the current directory.
 *
 *   node <repo>/scripts/epoch-mcp.mjs
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { register } = await import(pathToFileURL(require.resolve('tsx/esm/api')).href);
register();

const { startMcpServer } = await import(new URL('../src/api/mcp/mcp-server.ts', import.meta.url).href);
await startMcpServer();
