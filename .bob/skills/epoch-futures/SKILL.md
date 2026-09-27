---
name: epoch-futures
description: >-
  Fork two futures for a hypothesis, implement them in parallel subagents,
  evaluate, and compare results.
metadata:
  user-invocable: true
  disable-model-invocation: true
  argument-hint: '<hypothesis> [future-a-label] [future-b-label]'
---

The argument is a hypothesis string and optionally two future labels (default: `future-a` and `future-b`).

1. Call `fork_futures` with the hypothesis and two scenario objects (`id`, `label`, `description`). Note `simulation_id` and the two `worktree_path` values.
2. Spawn two subagents in parallel — one per future:
   - Each subagent receives its `scenario_id`, `simulation_id`, and `worktree_path`.
   - Each implements the future by editing files inside its `worktree_path` only.
   - Each calls `evaluate_future` with its `simulation_id` and `scenario_id` when done.
   - Each returns a one-paragraph summary of what it changed and the evaluation outcome.
3. Wait for both subagents to complete.
4. Call `get_simulation` to retrieve the measured outcomes for both scenarios.
5. Report a comparison table with columns: Future | What changed | Test result | Structural score | Recommendation.
   Mark the recommended future per `get_simulation`.
