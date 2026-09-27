# Evolution Report — Implementation Plan

## Overview

Add a human-readable Markdown evolution report to EPOCH. A reader gets a
single document describing **what changed** in the watched service and **why**,
without opening any database or console. Every figure comes from the existing
store queries; nothing is invented.

The report module lives in `src/api/console/report.ts` (alongside views.ts and
routes.ts) because it renders view-layer prose and reuses the existing
`consoleDriftFinding()` and `consoleIncident()` view helpers. Core never
imports from the API layer.

The work touches six places: a new console module, one new API route, one new
MCP tool, one new script, one new integration test, and documentation/config
updates. Sub-tasks are ordered so each builds cleanly on the last.

---

## Sub-task 1 — Core module: `src/api/console/report.ts`

**Intent**
Produce the Markdown document from the store and view helpers. All prose is
derived from data; nothing is hard-coded.

**Sections (in order)**

1. **Current state** — one paragraph: epoch label, boundary-integrity score
   (as a percentage), coupling score (as a percentage), whether inside or
   outside the envelope, count of open drift findings.
   Sources: `trajectory.getLatestTrajectoryPoint()`,
   `epochs.getLatestEpoch()`, `driftFindings.listDriftFindings({ status: 'open' })`,
   `ENVELOPE` constant from `../../core/epoch/trajectory.js`.

2. **Recorded mutations** — Markdown table with columns `Mutation | Epoch |
   Author | Intent`. Show the 10 most recent mutations (newest first:
   `mutations.listMutations({ order: 'desc', limit: 10 })`). Below the table,
   if there are more than 10 total (`mutations.countMutations()`), add a line
   such as: `_N earlier mutations not shown._`

3. **Drift findings** — one `###` heading per finding, open findings first
   (sorted by `detectedAt` descending), then resolved. Each entry shows:
   severity badge, detected-at timestamp, status (`open` / `resolved by M-xxx`),
   and the `whyExplanation` field from `consoleDriftFinding()`.

4. **Incidents** — one `###` heading per incident. Shows: severity, status,
   affected component, candidate causal chain (labelled **hypothesised** per
   evidence discipline), evidence count from
   `evidence.listEvidenceByWorkflow()` for the linked `remediation_workflow_id`
   (0 if none).
   Uses `consoleIncident()` for the `candidateCausalChain` and status.

5. **Latest futures comparison** — shows the hypothesis, then one row per
   scenario in a table: `Scenario | Integrity | Coupling | Tests | Probe |
   Recommended | Adopted`. Sources: `simulations.listSimulations()`, taking the
   most recent completed (or any, if none completed) simulation.

6. **Human decisions** — table: `Decision | Actor | Workflow | Rationale`.
   Sources: `decisions.listDecisions(50)`.

**Expected outcomes**
- `src/api/console/report.ts` exports `buildEvolutionReport(): string`.
- The function builds the document purely from store imports and two view
  helpers (`consoleDriftFinding`, `consoleIncident`) imported from `./views.js`.
- No import cycles (the view helpers already exist in the same `api/console/`
  layer).
- `pnpm typecheck` passes.

**Todo list**
- [ ] Create `src/api/console/report.ts`
- [ ] Import store namespaces: `driftFindings`, `epochs`, `evidence`,
      `incidents`, `mutations`, `simulations`, `decisions`, `trajectory`
      from `../../store/index.js`
- [ ] Import `ENVELOPE` from `../../core/epoch/trajectory.js`
- [ ] Import `consoleDriftFinding` and `consoleIncident` from `./views.js`
- [ ] Write each section as a private helper returning a string
- [ ] Compose helpers in `buildEvolutionReport()`
- [ ] Run `pnpm typecheck`

**Relevant context**
- `src/store/index.ts` — namespace exports for all query modules
- `src/core/epoch/trajectory.ts` — exports `ENVELOPE`
- `src/api/console/views.ts` — `consoleDriftFinding()`, `consoleIncident()` (the
  view helpers are already in the same layer, so no layer violation)
- `src/store/queries/mutations.ts` — `listMutations()`, `countMutations()`
- `src/store/queries/simulations.ts` — `Simulation`, `Scenario` types;
  `scenarios` is a JSON array stored on each `Simulation`
- `src/store/queries/decisions.ts` — `Decision` type

**Status** — `[ ] pending`

---

## Sub-task 2 — API: `GET /api/v1/report`

**Intent**
Expose the report as a `text/markdown` HTTP endpoint so any HTTP client
(curl, the script, tests) can fetch it without authentication.

**Expected outcomes**
- `GET /api/v1/report` returns `200 text/markdown; charset=utf-8` with the
  Markdown string.
- Route registered in `src/api/console/routes.ts` following the existing
  `consoleRoutes.get(...)` pattern.
- `pnpm typecheck` passes.

**Todo list**
- [ ] Add `import { buildEvolutionReport } from './report.js'` at the top of
      `src/api/console/routes.ts` (alongside the existing view imports)
- [ ] Append before `registerConsoleRoutes`:
      ```typescript
      consoleRoutes.get('/report', c =>
        c.text(buildEvolutionReport(), 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
      );
      ```
- [ ] Run `pnpm typecheck`

**Relevant context**
- `src/api/console/routes.ts` — all `/api/v1` routes live here; the
  `consoleRoutes` Hono instance is exported at the top, routes are appended
  before `registerConsoleRoutes`
- Hono's `c.text()` accepts a third `headers` argument

**Status** — `[ ] pending`

---

## Sub-task 3 — MCP tool: `get_evolution_report`

**Intent**
Give Bob a read-only MCP tool that fetches the Markdown report from the running
API and returns it as tool output, following the same `call` → `ok` pattern
used by every other read tool in the server.

The existing `call()` helper JSON-parses the response. A small companion
`callText()` helper is needed that does the same fetch but returns
`response.text()` directly (skips JSON parsing).

**Expected outcomes**
- `get_evolution_report` registered in `createMcpServer()` with
  `annotations: READ_ONLY`, no input schema (no parameters).
- Tool calls `GET /api/v1/report` via `callText()`.
- Added to `alwaysAllow` in `.bob/mcp.json` (list goes from 12 to 13 entries).
- `pnpm typecheck` passes.

**Tool registration (exact):**
```typescript
server.registerTool('get_evolution_report', {
  title: 'Evolution report',
  description: 'A Markdown document describing how the watched service has changed and why: current state, mutations table, drift findings, incidents, latest futures comparison and human decisions. Every figure comes from the EPOCH store.',
  annotations: READ_ONLY
}, () => run(async () => {
  const md = await callText('/api/v1/report');
  return ok(md);
}));
```

**Todo list**
- [ ] Add `callText(path: string): Promise<string>` private helper in
      `src/api/mcp/mcp-server.ts` (same fetch as `call()`, same error-handling,
      but return `text` directly instead of `JSON.parse(text)`)
- [ ] Register `get_evolution_report` tool (code above) after the
      `get_simulation` tool, before the closing of `createMcpServer()`
- [ ] Add `"get_evolution_report"` to `alwaysAllow` in `.bob/mcp.json`
- [ ] Run `pnpm typecheck`

**Relevant context**
- `src/api/mcp/mcp-server.ts` — full file reviewed; `call()` helper at line 20;
  `READ_ONLY`, `ok()`, `run()` constants at lines 60-65; `get_simulation` is the
  last registered tool (line 335); `createMcpServer()` closes at line 352
- `.bob/mcp.json` — `alwaysAllow` currently has 12 entries

**Status** — `[ ] pending`

---

## Sub-task 4 — Script: `scripts/report.ts` and `pnpm report`

**Intent**
Provide `pnpm report` to fetch the live report and write it to
`EVOLUTION_REPORT.md` at the repo root. Follows the same pattern as
`scripts/demo-replay.ts` (uses `apiIsUp`, `API_URL`, `fail` from
`scripts/cli.ts`).

**Expected outcomes**
- `scripts/report.ts` calls `GET /api/v1/report` and writes the body to
  `EVOLUTION_REPORT.md` at `process.cwd()`.
- If the API is not running, the script prints a clear error and exits non-zero.
- `pnpm report` added to `package.json` `scripts` section.
- `EVOLUTION_REPORT.md` added to `.gitignore`.
- `pnpm typecheck` passes.

**Script skeleton:**
```typescript
#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { apiIsUp, API_URL, fail } from './cli.js';

async function main(): Promise<void> {
  if (!(await apiIsUp())) {
    throw new Error('EPOCH API is not running. Start it with "pnpm api:dev" or "pnpm dev".');
  }
  const response = await fetch(`${API_URL}/api/v1/report`, {
    headers: { Accept: 'text/markdown' }
  });
  if (!response.ok) throw new Error(`/api/v1/report failed with ${response.status}`);
  const md = await response.text();
  const out = path.join(process.cwd(), 'EVOLUTION_REPORT.md');
  fs.writeFileSync(out, md, 'utf8');
  console.log(`✔ Written to ${out} (${md.length} chars)`);
}

main().catch(fail);
```

**Todo list**
- [ ] Create `scripts/report.ts` (content above)
- [ ] Add `"report": "tsx scripts/report.ts"` to the `scripts` section of
      `package.json` (after `"demo:futures"`)
- [ ] Add `EVOLUTION_REPORT.md` to `.gitignore` (after the existing
      `.sandbox-lock` entry or at end of file)
- [ ] Run `pnpm typecheck`

**Relevant context**
- `scripts/demo-replay.ts` — the fetch-from-API pattern to follow
- `scripts/cli.ts` — `apiIsUp`, `API_URL`, `fail` helpers
- `package.json` scripts — current list ends at `"format"`

**Status** — `[ ] pending`

---

## Sub-task 5 — Integration test: `tests/integration/evolution-report.test.ts`

**Intent**
Verify the report contains `INC-3312`, `DRIFT-401`, and `M-1085` after the
full showcase story is played out (showcase + adopt future B + approve).

**Why M-1085 requires the extra steps:**
The showcase snapshot (`POST /api/demo/showcase`) stops before a future is
adopted. M-1085 is only recorded after:
1. `POST /api/v1/simulations/remediate` with future B's scenarioId
2. `POST /api/workflows/:id/run-to-approval`
3. `POST /api/v1/workflows/:id/decision { decision: 'APPROVED' }`

This is exactly the "allowed action flow" in `tests/integration/public-demo.test.ts`.

**Expected outcomes**
- `tests/integration/evolution-report.test.ts` creates an isolated env,
  seeds the showcase, completes the story, fetches `GET /api/v1/report`, and
  asserts:
  - Status `200`
  - `content-type` header contains `text/markdown`
  - Body contains `INC-3312`
  - Body contains `DRIFT-401`
  - Body contains `M-1085`
- `pnpm test:integration` passes.

**Todo list**
- [ ] Create `tests/integration/evolution-report.test.ts`
- [ ] Mirror the env/app setup from `public-demo.test.ts`:
  `isolate`, `EPOCH_PUBLIC_DEMO=1`, `EPOCH_SHOWCASE_SNAPSHOT`, `createApp`
- [ ] `beforeAll`:
  - `POST /api/demo/showcase` → assert `200`
  - Find future B from `GET /api/v1/simulations`
  - `POST /api/v1/simulations/remediate { scenarioId: b.id, author: 'test' }` → assert `201`
  - `POST /api/workflows/:workflowId/run-to-approval { actor: 'test' }` → assert `200`
  - `POST /api/v1/workflows/:workflowId/decision { decision: 'APPROVED', actor: 'test' }` → assert `200`, confirm `body.mutation.id === 'M-1085'`
- [ ] Single `it('report contains INC-3312, DRIFT-401 and M-1085')`:
  - `GET /api/v1/report`
  - Assert `200`, content-type contains `text/markdown`
  - `expect(body).toContain('INC-3312')`
  - `expect(body).toContain('DRIFT-401')`
  - `expect(body).toContain('M-1085')`
- [ ] `afterAll`: delete `EPOCH_PUBLIC_DEMO`, `EPOCH_SHOWCASE_SNAPSHOT`, call
      `env.cleanup()`
- [ ] Run `pnpm test:integration`

**Relevant context**
- `tests/integration/public-demo.test.ts` — exact setup to mirror (lines 1-55
  for env setup; lines 95-108 for the adopt+approve flow)
- `tests/helpers/isolated.ts` — `isolate()` helper
- `src/api/public-demo.js` — the `publicDemo` import needed for showcase setup

**Status** — `[ ] pending`

---

## Sub-task 6 — Documentation and tool-count updates

**Intent**
Keep the contract documentation and README accurate. Change only the MCP
tool count references (never other "20"s such as idle minutes). Add the new
tool to CHANGELOG.md under `[Unreleased]`.

**Expected outcomes**
- `docs/API_CONTRACT.md`:
  - Row `GET /api/v1/report` added to the Console endpoints table (after the
    `/api/v1/activity` row).
  - Row `get_evolution_report | read | …` added to the EPOCH-MCP tools table
    (after `get_simulation`).
- `README.md` — **only the four occurrences that are specifically MCP tool
  counts**:
  - Badge: `EPOCH-MCP: 20 tools` → `EPOCH-MCP: 21 tools`
    (line with `img alt="EPOCH-MCP: 20 tools"`)
  - Prose sentence: `20-tool EPOCH-MCP server` → `21-tool EPOCH-MCP server`
  - `<summary>` heading: `All 20 EPOCH-MCP tools` → `All 21 EPOCH-MCP tools`
  - Architecture diagram: `stdio MCP · 20 tools` → `stdio MCP · 21 tools`
  - Add `get_evolution_report` row to the tools table in that `<summary>`
  - **Do NOT change** `restoresAfterIdleMinutes: 20` or any other "20" that is
    not an MCP tool count.
- `CHANGELOG.md` — add under the existing `[Unreleased] → ### Added` section
  (not as a new entry):
  ```
  - `get_evolution_report` MCP tool and `GET /api/v1/report`: a Markdown evolution
    report built from the EPOCH store; `pnpm report` writes it to `EVOLUTION_REPORT.md`.
  ```

**Todo list**
- [ ] Edit `docs/API_CONTRACT.md`: add `| GET | \`/api/v1/report\` | Markdown
      evolution report: current state, mutations, drift findings, incidents,
      futures comparison and human decisions. Returns \`text/markdown\`. |` after
      the `/api/v1/activity` row in the Console endpoints table
- [ ] Edit `docs/API_CONTRACT.md`: add `| \`get_evolution_report\` | read |
      Markdown evolution report built from the EPOCH store |` after the
      `get_simulation` row in the EPOCH-MCP tools table
- [ ] Edit `README.md`: replace the four MCP-tool-count occurrences of `20`
      with `21` (badge alt text, prose line, summary heading, architecture
      diagram label)
- [ ] Edit `README.md`: add `get_evolution_report` row to the tools table
- [ ] Edit `CHANGELOG.md`: add the new bullet under `[Unreleased] → ### Added`

**Status** — `[ ] pending`

---

## Implementation sequence

Sub-tasks must be executed in order:

```
ST-1 src/api/console/report.ts
  → ST-2 GET /api/v1/report in routes.ts
  → ST-3 get_evolution_report MCP tool + mcp.json
  → ST-4 scripts/report.ts + package.json + .gitignore
  → ST-5 integration test
  → ST-6 docs + CHANGELOG
```

After all sub-tasks: run `pnpm typecheck && pnpm test`, then fetch
`http://127.0.0.1:3000/api/v1/report` and show the first 30 lines.
