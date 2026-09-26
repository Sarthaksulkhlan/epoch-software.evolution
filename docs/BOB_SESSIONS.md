# IBM Bob sessions

This page indexes the IBM Bob task sessions used to build and run EPOCH. Each entry links to the task history exported from Bob IDE and the screenshot of its consumption summary, both stored in [`bob_sessions/`](../bob_sessions/).

Only sessions with an export are listed. Nothing here is reconstructed after the fact.

| Task | Member | Date | What Bob did | Bob features used | Export | Commits |
| --- | --- | --- | --- | --- | --- | --- |

## How the sessions connect to EPOCH

- Bob reaches EPOCH through the `epoch` MCP server (`.bob/mcp.json`). Tool calls appear in each exported history.
- Workflows Bob starts are recorded in EPOCH with the author `IBM Bob`, so every mutation Bob produced can be found with `GET /api/mutations` and traced back to its workflow, plan, evidence and approval.
- Commits Bob makes in this repository use the prefix `bob(<task>):` so they can be matched to the exported task.
