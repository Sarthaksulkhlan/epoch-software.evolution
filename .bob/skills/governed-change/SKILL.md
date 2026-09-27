---
name: governed-change
description: >-
  Use when making any change to the watched service in .epoch/sample-repo through the EPOCH WEAVE
  workflow. Provides the full step-by-step lifecycle: read context, open workflow, plan, run
  specialists, edit, and request approval.
---

# Governed Change Skill (WEAVE over EPOCH-MCP)

Follow every step in order. Do not skip steps or reorder them.

## Step 1 — Read Context Before Opening a Workflow

Call these three tools and read their output before proceeding:

1. `get_trajectory_snapshot` -- current coupling score, boundary integrity, epoch status.
2. `check_invariants` with the relevant components -- which invariants are HOLDING, WEAKENED, or VIOLATED.
3. `get_mutation_history` with the relevant component -- recent mutations, open drift findings.

Label every observation `observed`. Do not open a workflow until you have this context.

## Step 2 — Open a Workflow

Call `start_workflow` with `kind` (`feature`, `incident`, or `remediation`) and a `requirement`
string that precisely describes the change. Note the returned `workflow_id`.

## Step 3 — Get Context Bundle

Call `get_context_bundle` with the `workflow_id`. Read the returned bundle: acceptance criteria,
relevant files, prior mutations, and invariants in scope. This is your working context.

## Step 4 — Record a Plan

Call `record_plan` with the `workflow_id` and a `plan` that covers:
- What files will change and why
- Which invariants the change touches
- How each acceptance criterion will be met
- Risks and mitigations

The workflow moves to EXECUTING after this call.

## Step 5 — Run Specialists (Sequential, This Task)

Run the three specialists one after another in this task -- do not use subagents:

1. `run_specialist` with `agent: "historian"` -- prior mutations and open drift findings.
2. `run_specialist` with `agent: "security"` -- secrets, boundary imports, added risk.
3. `run_specialist` with `agent: "qa"` -- test results and consistency checks.

Read each result before running the next. Record your own claims with `record_evidence` using the
correct status (`observed` / `inferred` / `hypothesised`) and a `source_ref` that points to the
evidence.

## Step 6 — Edit Only .epoch/sample-repo

Make the minimal change that satisfies the acceptance criteria. Edit only files under
`.epoch/sample-repo/`. Do not touch `src/`, configuration outside the sample repo, or test
infrastructure unless the workflow requirement explicitly covers it.

## Step 7 — Request Approval

Call `request_approval` with the `workflow_id`. This triggers the verification phase
(security, QA, and evolution analyst run again against the working tree). The workflow moves to
APPROVAL_PENDING.

A human decides in the EPOCH console. There is no `approve` tool -- do not poll or simulate
approval.

## Step 8 — Summarise

Write a summary under 10 lines covering: what changed, which invariants were in scope, specialist
findings (one line each), and the approval gate status.

## Evidence Labelling Rules

| Situation | Label |
|---|---|
| You measured it from a tool result | `observed` |
| You concluded it from evidence | `inferred` |
| A candidate explanation without proof | `hypothesised` |

Never upgrade a claim. Never assert causality without evidence.
