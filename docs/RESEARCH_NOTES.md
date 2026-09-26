# Research and sources

The sources behind EPOCH's problem statement and its use of IBM Bob. All links were checked on 27 September 2026. Figures come from each paper's abstract, for the version named. Benchmark results depend on the model, the agent framework and the setup, so they are used here only to show that a gap exists, not as universal performance claims.

## The problem: long-horizon evolution

### SWE-EVO

**SWE-EVO: Benchmarking Coding Agents in Long-Horizon Software Evolution Scenarios.** Thai et al., arXiv:2512.18470, first version December 2025. <https://arxiv.org/abs/2512.18470v1>

- 48 evolution tasks from 7 Python projects; each task touches 21 files on average.
- Version 1: GPT-5 with OpenHands resolves 21% of SWE-EVO tasks, against 65% on the single-issue SWE-Bench Verified.
- Later versions (v5 onwards, 2026) report 25% for GPT-5.4 with OpenHands on SWE-EVO, against 72.8% for GPT-5.2 on SWE-Bench Verified.

### EvoClaw (renamed SWE-Milestone)

**EvoClaw: Evaluating AI Agents on Continuous Software Evolution.** Deng et al., arXiv:2603.13428, March 2026. Renamed *SWE-Milestone* in version 3 (July 2026). <https://arxiv.org/abs/2603.13428v1>

- Across 12 frontier models and 4 agent frameworks, overall performance scores drop from above 80% on isolated tasks to at most 38% in continuous settings (38.03% in version 4).
- This is the accumulated-error effect EPOCH is built around: changes that are each fine in isolation compound.

### RoadmapBench

**RoadmapBench: Evaluating Long-Horizon Agentic Software Development Across Version Upgrades.** Xu et al., arXiv:2605.15846, May 2026. <https://arxiv.org/abs/2605.15846>

- 115 version-upgrade tasks across 17 repositories and 5 languages, 13 models evaluated.
- The strongest model, Claude Opus 4.7, resolves 39.1% of tasks.

### AgenticFlict

**AgenticFlict: A Large-Scale Dataset of Merge Conflicts in AI Coding Agent Pull Requests on GitHub.** Ogenrwot and Businge, arXiv:2604.03551, April 2026. Dataset: <https://github.com/unlv-evol/AgenticFlict>. Paper: <https://arxiv.org/abs/2604.03551>

- More than 142,000 agent-authored pull requests across 59,000 repositories; 27.67% of them conflict.
- The authors state as a limitation that the dataset captures only syntactic conflicts reported by Git's three-way merge: semantic conflicts, where changes are syntactically compatible but behaviourally incompatible, are not detected (README, Limitations; the paper's threats to validity). That class of problem is what EPOCH's invariants and probes look for.

## IBM Bob

### Bob V2 general availability

**Bob V2: Faster, better, smarter.** IBM Bob Team, 24 June 2026. <https://bob.ibm.com/blog/bob-v2-release-announcement/>

- Bob V2 ships background tasks, rebuilt rollback, working with documents, subagents and workflows, on a single agent that behaves the same in every client, starting with Bob IDE.
- At general availability the available workflows are the ones that ship with Bob and its packages; broader authoring comes later. This is why EPOCH does not package its own Bob workflows (ADR-026).

> "Bob V2 reaches general availability on June 24, and it's a real step up in daily use: it's faster, it can keep tasks running in the background while you stay on something else, and it's built on a single agent that behaves identically across every client."

### Premium Packages and the enterprise foundation

**IBM Bob advances agentic software development with Premium Packages and a new enterprise AI foundation.** Neel Sundaresan and Michael Kwok, IBM, 9 July 2026. <https://www.ibm.com/new/announcements/ibm-bob-expands-with-premium-packages-new-architecture-and-greater-enterprise-control>

- Bob is "architected for agentic software development across the enterprise software development lifecycle", with a shared workflow engine for "reusable, governed, multi-step engineering workflows" and "native tool calling, parallel execution, subagents and background task orchestration".
- EPOCH builds on this rather than duplicating it: Bob plans, implements and runs subagents; EPOCH supplies the system's history and the governance around each change.

### Multi-agent capabilities

**IBM Advances Enterprise AI Software Development with Multi-Agent Capabilities and Specialized Modernization Workflows.** IBM Newsroom, 9 July 2026. <https://newsroom.ibm.com/2026-07-09-ibm-advances-enterprise-ai-software-development-with-multi-agent-capabilities-and-specialized-modernization-workflows>

- IBM cites a GitLab survey (*The 2026 AI Accountability Report*) in which 85% of DevSecOps professionals agree that AI has shifted the bottleneck from writing code to reviewing and validating it. EPOCH is aimed at that review and validation step.

### Hooks, policies and audit

**New in Bob: Your editor, your policies, your audit trail.** IBM Bob Team, 31 August 2026. <https://bob.ibm.com/blog/august-2026-release-2/>

- "An agent loop is non-deterministic by nature. Hooks are how you put deterministic rails around it." Bob IDE hooks run on `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse` and `Stop`; policies can enforce hooks across an organisation, and audit events can be forwarded to a SIEM.
- EPOCH exposes hook endpoints (`/api/hooks/*`) that Bob's hooks can call, and keeps its own drift checks deterministic for the same reason (ADR-015).

### Bob documentation

The Bob IDE documentation describes the configuration EPOCH uses:

| Topic | Page |
| --- | --- |
| MCP servers (`.bob/mcp.json`) | <https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob> |
| Custom modes (`.bob/custom_modes.yaml`) | <https://bob.ibm.com/docs/ide/configuration/custom-modes> |
| Skills (`.bob/skills/<name>/SKILL.md`) | <https://bob.ibm.com/docs/ide/features/skills> |
| Slash commands (`.bob/commands/*.md`) | <https://bob.ibm.com/docs/ide/features/slash-commands> |
| Lifecycle hooks (`.bob/settings.json`) | <https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks> |
| Rules and `AGENTS.md` | <https://bob.ibm.com/docs/ide/configuration/rules> |

Tutorials: <https://developer.ibm.com/components/ibm-bob/tutorials/>

## Claims and their sources

| Claim | Source |
| --- | --- |
| Agents resolve far fewer long-horizon evolution tasks than isolated ones (21% vs 65% for GPT-5 with OpenHands, SWE-EVO v1) | SWE-EVO |
| Overall scores fall from above 80% on isolated tasks to at most 38% under continuous evolution | EvoClaw / SWE-Milestone |
| The strongest model resolves 39.1% of version-upgrade tasks | RoadmapBench |
| Textual merge-conflict detection does not capture semantic conflicts | AgenticFlict (stated limitation) |
| Bob V2 ships background tasks, rollback, subagents and workflows; custom workflow authoring comes later | Bob V2 announcement |
| Bob's shared workflow engine supports parallel execution, subagents and background tasks | Premium Packages announcement |
| 85% of surveyed DevSecOps professionals say AI moved the bottleneck to review and validation | IBM Newsroom, citing GitLab |
| Bob hooks put deterministic rails around the agent loop | August 2026 release |

## What EPOCH does not claim

| Not claimed | Why |
| --- | --- |
| EPOCH detects all architectural drift | The three drift patterns are deterministic but not exhaustive. |
| EPOCH proves causality | Causal chains are candidates ranked by evidence and labelled `inferred` or `hypothesised`. |
| EPOCH improves agent performance by a given percentage | That needs a controlled experiment we have not run. EPOCH reports its own measurements (`GET /api/metrics`). |
| EPOCH is production-ready | It is a hackathon prototype built around one watched service; see the limits in [ARCHITECTURE.md](../ARCHITECTURE.md#14-limits). |
| Futures predict production outcomes | Futures are measured experiments in isolated worktrees, for comparison. |
