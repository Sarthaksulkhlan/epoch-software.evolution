# IBM Bob session evidence

Screenshots of each Bob task's consumption summary, with the task history exported from IBM Bob IDE 2.2. Credentials and API keys are removed before a file is added here.

```text
bob_sessions/
  <member>/
    epoch_task<NN>_<task>_summary.png   consumption summary (required by the hackathon guide)
    epoch_task<NN>_<task>.json          exported task history (Bob 2.2 exports JSON)
    epoch_task<NN>_<task>_*.png|.md     extra evidence: plans, progress screenshots
```

Each export also carries its own consumption figures under `tasks[0].task.costs`: Bobcoins spent, context tokens and the context breakdown.

The index, with what each task did and the commits and EPOCH mutations it produced, is in [docs/BOB_SESSIONS.md](../docs/BOB_SESSIONS.md).
