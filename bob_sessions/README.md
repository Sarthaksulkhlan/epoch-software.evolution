# IBM Bob session exports

Task histories exported from IBM Bob IDE 2.2, with screenshots of the consumption summary where they were taken. Credentials and API keys are removed before a file is added here.

```text
bob_sessions/
  <member>/
    <NN>-<task>.json               exported task history (Bob 2.2 exports JSON)
    <NN>-<task>-consumption.png    consumption summary, where taken
```

Each export carries its own consumption figures under `tasks[0].task.costs`: Bobcoins spent, context tokens and the context breakdown.

The index, with what each session did and the commits and EPOCH mutations it produced, is in [docs/BOB_SESSIONS.md](../docs/BOB_SESSIONS.md).
