# Agent Operating Rules — EPOCH

Before changing the watched service, read its trajectory, the invariants in scope, and relevant
history through the epoch MCP server (`get_trajectory_snapshot`, `check_invariants`,
`get_mutation_history`).

Every change to `.epoch/sample-repo` goes through a WEAVE workflow:
`start_workflow` → `get_context_bundle` → `record_plan` → `run_specialist` → edit → `request_approval`.

Label every claim: **observed** (you measured it), **inferred** (you concluded it from evidence),
**hypothesised** (a candidate explanation without proof).

There is no `approve` tool. A person decides in the EPOCH console.

Change `src/` only when explicitly asked. Bob's commits start with `bob(<task>):`.
