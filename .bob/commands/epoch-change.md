---
description: Execute a governed change to .epoch/sample-repo through the full WEAVE lifecycle.
argument-hint: "<requirement>"
---

The argument is the requirement for the change. Execute the full WEAVE lifecycle:

1. Call `get_trajectory_snapshot`, `check_invariants`, and `get_mutation_history` (relevant component). Read and label findings `observed`.
2. Call `start_workflow` with the requirement. Note `workflow_id`.
3. Call `get_context_bundle`. Read acceptance criteria and invariants in scope.
4. Call `record_plan` describing what changes, which invariants are touched, and how each criterion is met.
5. Call `run_specialist` with `agent: "historian"`. Read output.
6. Call `run_specialist` with `agent: "security"`. Read output.
7. Call `run_specialist` with `agent: "qa"`. Read output.
   Do not use subagents for specialists — run each sequentially in this task.
8. Edit only files under `.epoch/sample-repo/`. Make the minimal change that meets the criteria.
9. Call `request_approval`. A human approves in the EPOCH console — there is no approve tool.
10. Write a summary under 10 lines: what changed, invariants in scope, one-line specialist findings each, approval gate status.
