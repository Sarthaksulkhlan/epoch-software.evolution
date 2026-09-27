# Technology stack

Every choice keeps the demo self-contained: `pnpm install && pnpm demo-reset && pnpm dev` on any machine with Node 22, with no database server, container or credentials. Rationale for the larger choices is in [DECISIONS.md](../DECISIONS.md).

## Platform

| Concern | Choice | Notes | ADR |
| --- | --- | --- | --- |
| Language | TypeScript 5.5, strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) | One language for API, engine, agents, scripts and console | ADR-001 |
| Runtime | Node.js 22, ESM | `tsx` runs TypeScript directly | ADR-001 |
| HTTP | Hono 4 on `@hono/node-server` | REST, Server-Sent Events via `streamSSE`, `app.request` in tests | ADR-004 |
| Persistence | SQLite through better-sqlite3 11 | One file, WAL mode, recursive CTEs for graph traversal | ADR-002, ADR-003 |
| Validation | Zod 3.25 | Schemas are the types; request bodies and stored rows are parsed | ADR-008 |
| Events | `node:events` behind a typed bus | Envelopes with ids for SSE resume | ADR-006 |
| IDs | nanoid | Prefixed ids (`wf_`, `evt_`, …); sequences for mutations, epochs, incidents, findings | |
| Git | the `git` CLI through `execFile` | Never a shell; validated identifiers; worktrees for futures | ADR-027 |
| IBM Bob integration | `@modelcontextprotocol/sdk` 1.30, stdio transport | EPOCH-MCP, 21 tools | ADR-026 |

## Watched service

| Concern | Choice |
| --- | --- |
| Code | TypeScript ESM, no runtime dependencies (`packages/sample-app`) |
| Tests | `node:test` and `node:assert`, run through tsx, one process per file |
| Runtime probes | plain TypeScript scenarios printing JSON (`scenarios/run.ts`) |
| Rules | `invariants.json` evaluated by EPOCH's scanner |

## Console

| Concern | Choice | ADR |
| --- | --- | --- |
| Framework | React 19 with Vite | ADR-017, ADR-028 |
| Routing | React Router 7 | ADR-017 |
| Styling | Tailwind CSS 4 | |
| Charts | Recharts | |
| Evolution graph | custom SVG | ADR-028 |
| Icons and motion | lucide-react, motion | |
| Live updates | `EventSource` on `/api/v1/stream` | ADR-006 |

## Tooling

| Concern | Choice |
| --- | --- |
| Package manager | pnpm workspaces (the platform and `packages/sample-app`) |
| Tests | Vitest 3 (unit, integration, end to end; files run sequentially) |
| Formatting | Prettier |
| Dev processes | concurrently (API and console) |

## Deliberately not used

| Not used | Why |
| --- | --- |
| Docker, PostgreSQL, Neo4j, Redis | No infrastructure to start or debug during a demo (ADR-025) |
| An LLM inside EPOCH | Drift, causal ranking and verification must be deterministic and explainable (ADR-015, ADR-018); reasoning is Bob's job |
| Shell-built commands | Command injection risk; everything goes through `execFile` |
