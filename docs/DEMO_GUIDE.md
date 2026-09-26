# EPOCH — Golden Demo Guide

> This is the complete script for the hackathon submission demo.
> Every second is accounted for. Every judge question is anticipated.
> Run `pnpm demo-reset` before every demo to guarantee a clean starting state.

**Total runtime:** 4 minutes 30 seconds  
**Prepared for:** IBM Bob 2.0 Hackathon — lablab.ai, September 2026  

---

## Pre-Demo Checklist

Run these steps before any demo — live or recorded.

```bash
# 1. Reset to clean state
pnpm demo-reset

# 2. Start all servers
pnpm dev

# 3. Verify startup (all three must print "ready")
#    API server:   http://localhost:3000/api/health → { status: "ok" }
#    MCP server:   http://localhost:3001/health     → { status: "ok" }
#    Console:      http://localhost:5173            → loads four-lens UI

# 4. Open Bob IDE — verify EPOCH-MCP server is connected
#    Bob → MCP panel → epoch-evolution → status: connected

# 5. Open browser at http://localhost:5173
# 6. Set browser zoom to 100% — console layout is designed for this
# 7. Have terminal visible alongside browser for Bob session visibility
```

**Seeded state you start with:**
- 25 mutations in the evolution graph (M-1001 through M-1025)
- Epoch 1 (baseline monolith) and Epoch 2 (event-driven) boundaries established
- Mutations M-1023, M-1024, M-1025 have introduced boundary erosion drift (not yet surfaced — will be detected during the demo)
- 4 declared invariants, all currently in HOLDING status
- No active workflows

---

## The Demo Narrative Arc

The story has a clear three-act structure:

1. **ACT 1 (0:00–1:20):** The platform exists. Bob coordinates real work. The system has a history.
2. **ACT 2 (1:20–3:10):** A sequence of locally-correct changes is making the system globally worse. EPOCH detects it. We can see exactly why.
3. **ACT 3 (3:10–4:30):** We fix it. The trajectory returns to the intended envelope. The system is back on course.

**The line that opens the demo:**

> *"AI has made software changes cheap. The unresolved problem is keeping the system coherent through those changes. This is EPOCH."*

---

## Minute-by-Minute Script

### 0:00–0:20 — System Overview (CURRENT lens)

**Screen:** CURRENT lens (`/`)

**What to show:** The console loads showing no active workflow. The status bar reads "System stable — last mutation 3 hours ago." The navigation shows four lenses.

**What to say:**
> "This is EPOCH's console — mission control for a living software system. You're looking at the CURRENT lens: it shows what's happening right now in the lifecycle. But the platform is about more than current work. Let me show you the history first."

**Click:** HISTORY lens in the nav.

---

### 0:20–0:50 — System History (HISTORY lens)

**Screen:** HISTORY lens (`/history`)

**What to show:** The mutation list shows 25 mutations. Each entry shows: mutation ID, intent, touched components, date, epoch label. Scroll to show M-1018 (the chargeback extension mutation from the PDF).

**What to say:**
> "This payment application has been through 25 changes. Each one is not just a commit — it's a mutation: a structured record of intent, what was touched, what evidence was collected, and what the system became as a result. Click any mutation and you see the full WEAVE workflow that created it."

**Click:** M-1018 → workflow detail opens → show the task graph: Historian, Security, QA ran in parallel. Show the evidence cards.

> "Bob coordinated this. Historian, Security, and QA ran as parallel subagents. The evidence store captured what each one found. A human approved the change. All of that is preserved, replayable, and linked to the evolution graph."

---

### 0:50–1:20 — The Trajectory (TRAJECTORY lens)

**Screen:** TRAJECTORY lens (`/trajectory`)

**What to show:** The React Flow evolution graph renders. Four component rows (API, Auth, PaymentService, DataLayer). 25 mutation nodes. Two epoch boundaries (Epoch 1 | Epoch 2). Two incidents marked as red X.

**What to say:**
> "Now we're looking at the trajectory — the system through time. Each circle is a mutation. The vertical lines are epoch boundaries: moments when the system became structurally different. You can see the payment application moved from a synchronous monolith to an event-driven architecture at Epoch 2. That was a deliberate phase transition."

**Hover:** Over the boundary line to show epoch label and defining properties.

> "What I want you to notice is the last three mutations here — M-1023, M-1024, M-1025. Each one looks fine in isolation. Each passed its tests. But watch the drift indicator."

**Point to:** The drift panel showing boundary erosion score climbing across the last 3 mutations.

---

### 1:20–2:00 — Submitting a New Requirement (WEAVE lifecycle)

**Screen:** CURRENT lens — submit a new requirement

**Action:** Click "New Workflow" → paste requirement:
```
Extend chargeback eligibility from 15 days to 30 days.
All customer-facing touchpoints must reflect the new window.
```

**What to say:**
> "I'm submitting a new requirement. Watch Bob take over."

**What happens (live, streamed via SSE):**
1. WEAVE creates workflow W-0026 — shows in the active workflow timeline
2. Context builder assembles the bundle — "Loading context: 3 prior mutations, 2 invariants, telemetry snapshot"
3. Bob enters Plan mode — plan graph renders: "Historian → SecurityScan + QA (parallel) → Implementation → Verification → Approval Gate"
4. Bob spawns subagents — task cards appear: Historian (reading), Security (scanning), QA (analysing) — concurrent timestamps

**What to say:**
> "Bob is in Plan mode. It's querying EPOCH's mutation history via MCP — it knows this component has been touched 4 times recently and has a weakening invariant. That context shapes the plan. Historian, Security, and QA are running in parallel as Bob subagents."

**Wait:** 15–20 seconds for the agents to complete. Evidence cards populate.

> "Each agent writes its findings independently to the evidence store. Security found no new vulnerabilities. QA identified 3 test cases to update. Historian flagged that the archival job also enforces the 15-day window — something the requirement didn't mention."

---

### 2:00–2:30 — Drift Detection (The Core Moment)

**Screen:** Still on CURRENT lens — Bob has implemented the change. Now show the drift alert.

**What happens:** Bob Agent mode runs, implements the change, QA re-runs tests. Workflow reaches AWAITING_APPROVAL. **Before the approval gate**, the evolution layer processes the mutation and the drift detector fires.

A red banner appears: **"Drift detected — Boundary erosion critical"**

**What to say:**
> "Stop. Before we approve this — EPOCH just detected something. This new mutation would bring boundary erosion to the critical threshold. Let me show you what that means."

**Click:** The drift alert banner → opens drift detail panel.

> "Three of the last four mutations — including this one — add direct DataLayer access to services that are supposed to go through the PaymentService boundary. Each change was correct in isolation. But together, they're eroding an architectural invariant that the team declared when they built this system."

**Point to:** The boundary integrity score trend line dropping from 0.95 to 0.61 across M-1023–M-1026 (proposed).

---

### 2:30–3:00 — Causal Archaeology

**Screen:** TRAJECTORY lens — causal archaeology panel

**Action:** Click "Why?" on the drift alert → causal archaeology trace opens.

**What to say:**
> "EPOCH can trace this backward. This is causal archaeology — not AI magic, but a disciplined graph traversal through the mutation history, scored by component overlap, temporal proximity, and the intent-outcome mismatch."

**What shows:** The causal chain highlights M-1023 as the earliest plausible mutation. Evidence panel shows: `status: hypothesised` — "M-1023 introduced the first direct DataLayer call in PaymentService; subsequent mutations followed the same pattern without triggering a review."

> "The earliest plausible mutation is M-1023, three changes ago. Each subsequent mutation followed the same pattern — probably because it looked like an established precedent rather than a violation. Notice: EPOCH says *candidate causal chain*, not *proven root cause*. The evidence supports the hypothesis; a human confirms."

---

### 3:00–3:40 — Counterfactual Futures (FUTURES lens)

**Screen:** FUTURES lens (`/futures`)

**Action:** Right-click mutation M-1026 (the proposed change) → "Fork counterfactual" → EPOCH launches 2 scenarios.

**What to say:**
> "Instead of approving or rejecting, we can explore futures. EPOCH forks two candidate scenarios and runs Bob in Agent mode on each — in isolated sandbox branches."

**What shows:**
- **Scenario A (Keep current plan):** Apply the mutation as-is. Faster. Boundary erosion reaches critical. Invariant moves to VIOLATED.
- **Scenario B (Repair boundary):** Move shared data access logic behind the PaymentService interface before applying the chargeback change. Takes slightly longer. Boundary integrity recovers to 0.88.

**Evidence cards show:** Coupling score delta, boundary integrity delta, test results, estimated implementation time.

> "Scenario A gets the feature done faster but pushes the system further off course. Scenario B takes a bit more work but restores the architectural health. EPOCH surfaces the evidence — the human decides."

**Click:** "Select Scenario B" → new WEAVE workflow created for the boundary repair.

---

### 3:40–4:20 — Remediation & Closed Loop

**Screen:** CURRENT lens — new remediation workflow W-0027

**What to say:**
> "The selected future becomes a new WEAVE workflow. Bob implements the boundary repair. QA re-runs tests. We reach the approval gate."

**Action:** Click "Approve" on the approval gate.

**What happens:** Mutation M-1027 (boundary repair) is committed to the evolution graph. Trajectory recalculates. Boundary integrity score climbs back to 0.88. Drift alert clears.

**Switch to:** TRAJECTORY lens — show the graph updated with M-1027. The boundary erosion pattern is interrupted.

> "Return to the trajectory view. The system is back inside the intended envelope. The drift is resolved. And critically — the full audit trail is here: why the drift happened, which mutation caused it, which future was chosen, and who approved the fix."

---

### 4:20–4:30 — Closing Statement

**Screen:** TRAJECTORY lens — full evolution graph visible.

**What to say:**
> "AI can change your software one task at a time. EPOCH makes sure you do not lose the system in the process. WEAVE coordinates the work. EPOCH remembers the evolution. Bob executes it. This is the control plane that AI-native software development has been missing."

---

## Backup Plan: If Something Goes Wrong

| Problem | Recovery |
|---|---|
| API server not responding | `Ctrl+C` → `pnpm demo-reset` → `pnpm dev` → restart from 0:00 |
| SSE stream disconnected | Browser refresh → stream auto-reconnects; pick up from current step |
| Bob session hangs | Bob IDE has a timeout; cancel and re-run the workflow from CURRENT lens |
| Evolution graph not rendering | Check `http://localhost:3000/api/graph` — if 200, hard refresh console |
| MCP server not connected | Restart: `pnpm mcp` in a separate terminal; re-connect in Bob MCP panel |
| Drift detection did not fire | Manually trigger via `POST /api/graph/check-drift` — confirm in terminal |

**Time buffer:** The script above is 4:30. The demo slot is 5 minutes. The 30-second buffer is intentional.

---

## Judge Q&A Preparation

These are the questions most likely to come up. Answers are designed to be under 30 seconds.

**Q: Is this just another code-review tool?**  
A: No. Code review evaluates a diff. EPOCH evaluates how a diff changes the long-term system trajectory, and can trace a current problem back through mutation ancestry. That's a qualitatively different abstraction.

**Q: Why can't Bob do this on its own?**  
A: Bob executes brilliantly within a session. The differentiated layer is *persistent system history* across sessions — mutation relationships, trajectory analysis, phase detection, and counterfactual state management. Bob is more powerful with EPOCH than without it.

**Q: Why not just use Git history?**  
A: Git gives you raw diffs. EPOCH turns history into a structured evolutionary model linking intent, execution, evidence, runtime behaviour, incidents, and futures. Git does not know what a change *meant* or what it did to the system's trajectory.

**Q: Can you actually prove causality?**  
A: No, and we say so explicitly. EPOCH produces candidate causal chains ranked by evidence and temporal/dependency relationships, labelled as `hypothesised`. Consequential decisions stay at human gates. That's more honest and more useful than false certainty.

**Q: This works on one small sample app — does it scale?**  
A: The architecture scales: SQLite swaps to PostgreSQL, embedded BFS swaps to a graph DB — both in one file each (ADR-002, ADR-003). The concepts — mutations, trajectories, causal chains — are more valuable on large repos, not less. We scoped to one vertical slice to prove the thesis deeply, not shallowly.

**Q: What does IBM gain from this?**  
A: EPOCH extends Bob from a powerful execution fabric into a longitudinal intelligence layer for AI-native engineering. Every Bob action becomes more valuable when it's part of a persistent, queryable system model. EPOCH makes Bob stickier and more strategic for enterprise customers.

**Q: How much of this did Bob actually build?**  
A: All of it. The architecture, data model, and agent contracts were designed here. Bob used Plan mode to structure each implementation session, spawned specialist subagents for security and QA review, implemented the core modules in Agent mode, and built the MCP integration. Every session is logged in `.bob/sessions/`.

---

## Demo Reset Instructions (for Judges)

If you want to run the demo yourself after the submission:

```bash
git clone https://github.com/vighriday/epoch-software-evolution.git
cd epoch-software-evolution
pnpm install
pnpm demo-reset   # seeds the database with the 25-mutation history
pnpm dev          # starts API (3000) + MCP (3001) + console (5173)
# Open http://localhost:5173
# Open Bob IDE, load .bob/workflows/feature-lifecycle.yaml
# Follow this guide from 0:00
```

Total setup time on a machine with Node 22 and pnpm already installed: under 2 minutes.
