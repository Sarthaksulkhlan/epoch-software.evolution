---
name: epoch-why
description: >-
  Explain the causal chain behind an incident, drift finding, or invariant using
  EPOCH-MCP.
metadata:
  user-invocable: true
  disable-model-invocation: true
  argument-hint: <incident-id | finding-id | invariant-id>
---

The argument is an incident ID (INC-N), drift finding ID, or invariant ID.

1. Call `get_causal_chain` with the appropriate argument (`incident_id`, `finding_id`, or `invariant_id`).
2. From the returned candidates identify:
   - **Earliest plausible mutation** — the oldest mutation in the chain. Label this `hypothesised` (a candidate explanation without proof).
   - **Most proximate mutation** — the mutation most directly preceding the symptom. Label this `inferred` (concluded from ranked evidence).
3. For each, state: mutation ID, title, what it changed, and the evidence that links it to the finding.
4. Keep the full response under 12 lines. Do not assert causality; report candidates and their evidence labels.
