# Changelog

All notable changes to EPOCH. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The four-lens console (React 19, Vite, Tailwind CSS 4), merged from the console branch; `pnpm dev` runs it next to the API and proxies `/api` to it.
- Public demo mode (`EPOCH_PUBLIC_DEMO=1`): open reads, a short list of allowed writes run one at a time, 403 for everything else (ADR-029).
- The showcase: the demo replayed to the moment a reviewer chooses a future, restorable from a snapshot in about a second (`POST /api/demo/showcase`, `pnpm showcase:snapshot`).
- The API serves the built console when `EPOCH_CONSOLE_DIR` is set; `pnpm start` runs it without watch mode.
- A `Dockerfile` that runs everything as one service, a Render blueprint, and CI that typechecks, tests and builds the console and the image.
- 6 tests for public demo mode (38 in total).

### Changed

- `pnpm typecheck` also checks the console, with its own strict tsconfig.
- Test and probe processes share a concurrency limit (`EPOCH_TEST_CONCURRENCY`).

### Removed

- AI Studio scaffolding from the console template (Gemini SDK, express, `metadata.json`), unused dependencies and `bun.lock`.

## [0.4.0] — 2026-09-27

The platform runs end to end on a real watched service.

### Added

- Sample payments service (`packages/sample-app`): seven modules, eleven tests, a late-dispute runtime probe, four machine-checkable invariants, a seeded E-0 history and replayable AI changes and futures.
- Structural scanner: import graph, component coupling, policy constants and invariant rules evaluated against the code; deterministic state hashes.
- Mutation engine that records every approved workflow as a mutation with its commit, evidence, graph edges (PRODUCES, TOUCHES, FOLLOWS, WEAKENS, BOUNDARY, CAUSED_BY, REMEDIATES, SPAWNED) and trajectory point.
- Drift patterns from ADR-015 (boundary erosion, invariant weakening, dependency growth) with persisted findings that escalate and resolve.
- Persisted epochs with ADR-023 detection (symmetric, so recoveries are regime changes too).
- Incidents opened and resolved from runtime probe results.
- Causal archaeology over the persisted history with earliest-plausible and most-proximate candidates.
- Verification before approval: tests, probes, a scan of the working tree and a drift preview in the decision package.
- Counterfactual futures in git worktrees, measured with the same tests, probes and scanner; adoption through a remediation workflow.
- Seven deterministic specialists: context, historian, security, QA, evolution analyst, incident and synthesis.
- REST API, `/api/v1` console adapter, Server-Sent Events with `Last-Event-ID` resume, metrics from the event log, hook endpoints.
- EPOCH-MCP: a stdio MCP server with 20 tools for IBM Bob.
- Commands: `demo-reset`, `seed`, `demo:replay`, `demo:futures`.
- 32 tests: unit, integration and an end-to-end golden path.

### Changed

- The store parses every row through the Zod schemas and never passes undefined parameters.
- The event bus wraps each event in a typed envelope with an id.
- The workflow state machine persists every transition with its actor; replay reads the log.
- Mutations are immutable: undoing one records a compensating mutation.
- The API binds to 127.0.0.1 with a CORS allowlist.

### Removed

- Checkout-based sandbox branches (they switched the platform repository's own branch) and shell-built git commands.
- Heuristic "what-if" projections, generic threshold drift detectors and agents that reported simulated results.

## [0.1.0] — 2026-09-26

### Added

- Architecture, decision records, data model, agent contracts and research notes.
- Initial TypeScript scaffold for the WEAVE and EPOCH layers.
- The four-lens console (Current, History, Trajectory, Futures) on mock data.
