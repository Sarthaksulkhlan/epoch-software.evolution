# Bob Setup Plan for EPOCH

## Overview

Configure IBM Bob for the EPOCH repository by creating the full complement of Bob configuration
files: AGENTS.md, custom modes, skills, commands, hooks, .bobignore, and cleanup of legacy artifacts.
The goal is an opinionated Bob persona that enforces the WEAVE workflow discipline over the watched
service in `.epoch/sample-repo`.

---

## Sub-Task 1 — Root AGENTS.md

**Intent:** Give any AI agent opening this repo the five operating rules for EPOCH without reading
deeper docs.

**Expected Outcomes:**
- `/AGENTS.md` exists and is under 20 lines
- Covers: read trajectory/invariants/history first; WEAVE lifecycle; claim labelling; no approve tool;
  change `src/` only when asked; commit prefix `bob(<task>):`

**Todo List:**
- [ ] Create `AGENTS.md` at the workspace root

**Relevant Context:** `docs/AGENTS.md` — provides domain vocabulary and claim-label convention.

**Status:** [ ] pending

---

## Sub-Task 2 — Custom Modes (.bob/custom_modes.yaml)

**Intent:** Define two focused personas so Bob is constrained to the correct tool set depending on
whether the session is an active change or a read-only investigation.

**Expected Outcomes:**
- `.bob/custom_modes.yaml` contains exactly two entries: `epoch-engineer` and `evolution-analyst`
- `epoch-engineer` groups: `read`, `mcp`, `todo`, `subagent`, `edit` (fileRegex restricts edits to
  `.epoch/sample-repo/` and `.epoch/futures/` — regex handles both `/` and `\` separators)
- `evolution-analyst` groups: `read`, `mcp`
- Both have `roleDefinition`, `whenToUse`, and `customInstructions`

**Todo List:**
- [ ] Write `.bob/custom_modes.yaml` with both modes
- [ ] Verify fileRegex compiles: `\\.epoch[/\\\\](sample-repo|futures)[/\\\\]`

**Relevant Context:** `create-mode` skill — slug rules, group names, fileRegex tuple syntax.

**Status:** [ ] pending

---

## Sub-Task 3 — Skills

### 3a — Migrate evolution-analyst skill

**Intent:** Move the existing flat skill file to the canonical `SKILL.md` layout (directory +
frontmatter) so Bob can auto-invoke it.

**Expected Outcomes:**
- `.bob/skills/evolution-analyst/SKILL.md` exists with `name` and `description` frontmatter; body
  is the existing content from `.bob/skills/evolution-analyst.md`
- Old flat file `.bob/skills/evolution-analyst.md` is deleted

**Todo List:**
- [ ] Write `.bob/skills/evolution-analyst/SKILL.md` with frontmatter + existing body
- [ ] Delete `.bob/skills/evolution-analyst.md`

**Status:** [ ] pending

---

### 3b — New governed-change skill

**Intent:** Provide a reusable, step-by-step WEAVE lifecycle guide that epoch-change.md and
any ad-hoc sessions can rely on.

**Expected Outcomes:**
- `.bob/skills/governed-change/SKILL.md` exists with frontmatter and numbered procedure covering
  every WEAVE step over EPOCH-MCP: start_workflow → get_context_bundle → record_plan →
  run_specialist (historian, security, qa) → edit (only .epoch/sample-repo) → record_evidence →
  request_approval

**Todo List:**
- [ ] Write `.bob/skills/governed-change/SKILL.md`

**Status:** [ ] pending

---

## Sub-Task 4 — Commands (.bob/commands/)

**Intent:** Three slash-commands that codify the three most common EPOCH workflows.

### epoch-change.md
- Argument is a requirement string
- Steps: read trajectory + invariants + history; start_workflow; get_context_bundle; record_plan;
  run_specialist historian → security → qa (sequential, no subagents); edit only
  `.epoch/sample-repo`; request_approval; 10-line summary

### epoch-why.md
- Argument is an incident/finding/invariant ID
- Steps: get_causal_chain; name earliest plausible mutation (hypothesised) and most proximate
  mutation (inferred) with evidence labels; under 12 lines

### epoch-futures.md
- Argument is a hypothesis with two named futures
- Steps: fork_futures; one subagent per future in parallel implementing each in its worktree_path;
  evaluate_future for each; report a measured comparison table

**Expected Outcomes:**
- Three files in `.bob/commands/` each under 30 lines
- Each has a front-matter `description` field

**Relevant Context:** `docs/AGENTS.md` — parallel specialist schedule; futures in `.epoch/futures`

**Status:** [ ] pending

---

## Sub-Task 5 — Hooks and Hook Script

**Intent:** Notify the EPOCH API whenever Bob writes a file or stops a task, for live dashboard
integration.

**Expected Outcomes:**
- `.bob/settings.json` contains a `hooks` block with:
  - `PostToolUse` matcher `^(write_file|apply_diff)$` running `node scripts/bob-hook.mjs file-changed`
  - `Stop` running `node scripts/bob-hook.mjs stop`
- `scripts/bob-hook.mjs` reads JSON from stdin; for `file-changed` POSTs `{file, tool}` to
  `http://127.0.0.1:3000/api/hooks/file-changed`; for `stop` POSTs `{event:"stop", detail}` to
  `http://127.0.0.1:3000/api/hooks/bob-activity`; 3-second timeout; always exits 0

**Todo List:**
- [ ] Write `scripts/bob-hook.mjs`
- [ ] Write `.bob/settings.json` with hooks block

**Relevant Context:** `configure-hooks` skill — settings path, input contract (`tool_input.path`,
`last_assistant_message`), exit 0 semantics.

**Status:** [ ] pending

---

## Sub-Task 6 — .bobignore

**Intent:** Keep Bob's context lean by excluding non-source directories and generated files while
preserving `.epoch/`.

**Expected Outcomes:**
- `.bobignore` at workspace root lists the 11 patterns: `.internal/`, `data/`, `node_modules/`,
  `dist/`, `bob_sessions/`, `pnpm-lock.yaml`, `.oxcode/`, `.oxcode-memory/`, `.veris/`, `.env`,
  `.env.*`
- `.epoch/` is NOT in the ignore list

**Todo List:**
- [ ] Create `.bobignore`

**Status:** [ ] pending

---

## Sub-Task 7 — Cleanup

**Intent:** Remove stale artifacts that would confuse Bob or shadow the new files.

**Expected Outcomes:**
- `.bob/workflows/` directory and all its contents are deleted
- `.bob/skills/evolution-analyst.md` flat file is deleted (also covered in Sub-Task 3a)

**Todo List:**
- [ ] Delete `.bob/workflows/feature-lifecycle.yaml`
- [ ] Delete `.bob/workflows/hooks.json`
- [ ] Delete `.bob/workflows/incident-remediation.yaml`

**Status:** [ ] pending

---

## Sub-Task 8 — Test Hook Script

**Intent:** Verify the hook script works end-to-end before declaring the setup complete.

**Expected Outcomes:**
- Running `echo '{"hook_event_name":"PostToolUse","tool_name":"write_file","tool_input":{"path":"test.ts"}}' | node scripts/bob-hook.mjs file-changed` exits 0 and POSTs to the running API (or fails gracefully if API is unreachable)
- A 6-line setup summary is produced

**Todo List:**
- [ ] Run sample payload through `scripts/bob-hook.mjs file-changed`
- [ ] Write 6-line summary

**Status:** [ ] pending
