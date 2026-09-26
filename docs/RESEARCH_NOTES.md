# EPOCH — Research & Source Notes

> Every benchmark figure, product claim, and positioning statement in the EPOCH platform
> is backed by a cited source. This document is the complete reference list.
>
> **Attribution standard:** Claims attributed to primary IBM sources use IBM's own published language.
> Benchmark figures are reproduced from the cited papers with explicit attribution.
> Content was paraphrased for compliance with licensing restrictions where noted.

---

## Why This Document Exists

The EPOCH platform makes claims about a real research gap — the degraded performance of frontier coding agents on long-horizon software evolution tasks. These claims underpin the platform's thesis and its judging narrative.

Judges are sophisticated engineers. Unsubstantiated performance claims invite scepticism. This document turns every claim into a citable, verifiable reference.

---

## Primary Sources

---

### R1 — IBM Bob V2: Faster, Better, Smarter

**Source:** IBM Bob Engineering Blog  
**URL:** https://bob.ibm.com/blog/bob-v2-release-announcement/  
**Published:** June 24, 2026  
**Type:** Primary product documentation (IBM)  

**What it establishes:**
Bob V2 reaches general availability with background tasks, rollback, document understanding, subagents, and reusable workflows. The architecture uses a single agent that behaves identically across every client — Bob IDE first, Bob Shell following.

**How EPOCH uses it:**
- Section 8 of ARCHITECTURE.md ("IBM Bob 2.0: Execution Fabric") maps each EPOCH use case to a specific Bob V2 capability
- ADR-009 (MCP integration) references Bob's MCP support documented in this release
- ADR-020 (Bob workflows) references the reusable workflow capability

**Direct quote used in platform PDF:**
> "Bob V2 reaches general availability on June 24, and it's a real step up in daily use: it's faster, it can keep tasks running in the background while you stay on something else, and it's built on a single agent that behaves identically across every client."

---

### R2 — IBM Bob Expands with Premium Packages (July 9, 2026)

**Source:** IBM Announcements  
**URL:** https://www.ibm.com/new/announcements/ibm-bob-expands-with-premium-packages-new-architecture-and-greater-enterprise-control  
**Published:** July 9, 2026  
**Type:** Primary product announcement (IBM)  

**What it establishes:**
IBM Bob includes a shared workflow engine, parallel execution, subagents, background task orchestration, and enterprise lifecycle framing. IBM positions this as an agentic SDLC platform.

**How EPOCH uses it:**
- Confirms that "WEAVE should extend Bob rather than duplicate it" (Architecture principle, ARCHITECTURE.md Section 4)
- Validates the decision to use Bob's workflow engine rather than building a separate orchestrator

---

### R3 — IBM Newsroom: Multi-Agent Capabilities (July 9, 2026)

**Source:** IBM UK Newsroom  
**URL:** https://uk.newsroom.ibm.com/IBM-Bob  
**Published:** July 9, 2026  
**Type:** Primary product announcement (IBM)  

**What it establishes:**
IBM's public statement that AI is shifting bottlenecks in software development toward review and validation, not code generation. IBM explicitly frames the broader SDLC as the next frontier.

**How EPOCH uses it:**
- Validates the "bottleneck has shifted" framing in the problem statement (ARCHITECTURE.md Section 2)
- Supports the judge-facing narrative: "code generation is commoditized; coherence is the hard problem"

---

### R4 — IBM Bob: Your Editor, Your Policies, Your Audit Trail (August 2026)

**Source:** IBM Bob Engineering Blog  
**URL:** https://bob.ibm.com/blog/august-2026-release-2/  
**Published:** August 2026  
**Type:** Primary product documentation (IBM)  

**What it establishes:**
Bob V2 ships hooks, deterministic rails around agent loops, and enterprise policy/audit framing. This directly supports EPOCH's governance model.

**How EPOCH uses it:**
- Bob hooks (PostFileSave, PostTaskExec) are used in the EPOCH integration — reference for the hook capability
- "Deterministic rails" framing supports ADR-015 (deterministic drift patterns rather than non-deterministic LLM analysis)
- Audit trail framing aligns with EPOCH's immutable event log design (ADR-012)

---

## Research Sources (Benchmarks)

---

### R5 — SWE-EVO: Benchmarking Coding Agents on Long-Horizon Software Evolution (2025)

**Source:** arXiv  
**URL:** https://arxiv.org/abs/2512.18470  
**Published:** December 2025  
**Type:** Academic benchmark paper  

**What it establishes:**
Long-horizon software evolution tasks average approximately 21 files touched. On these tasks, GPT-5 + OpenHands resolved approximately 21% of tasks, compared to approximately 65% on the isolated SWE-Bench Verified benchmark in the same cited setup.

**The gap:** ~44 percentage points between isolated coding performance and long-horizon evolution performance.

**How EPOCH uses it:**
- ARCHITECTURE.md Section 2 comparison table (row: SWE-EVO)
- Establishes the "frontier research gap" that EPOCH's thesis addresses
- PDF page 4 of the platform dossier cites this paper

**Claim in our platform:** "SWE-EVO: Long-horizon evolution tasks average ~21 files; GPT-5 + OpenHands resolved 21% vs 65% on SWE-Bench Verified in the cited setup."  
**Attribution:** This figure is reproduced from the paper with attribution. Paraphrased for compliance.

---

### R6 — EvoClaw: Evaluating AI Agents on Continuous Software Evolution (2026)

**Source:** arXiv  
**URL:** https://arxiv.org/abs/2603.13428  
**Published:** 2026  
**Type:** Academic benchmark paper  

**What it establishes:**
On isolated settings, tested agents performed above 80%. On continuous-evolution settings (where changes accumulate over time), performance dropped to at most 38% across all tested agents and frameworks.

**The gap:** >42 percentage points between isolated and continuous-evolution performance.

**How EPOCH uses it:**
- ARCHITECTURE.md Section 2 comparison table (row: EvoClaw)
- Directly supports the "trajectory / accumulated-error thesis" — the core claim that the problem is not model capability but accumulated state

**Claim in our platform:** "Performance drops from >80% on isolated settings to at most 38% in continuous-evolution settings."  
**Attribution:** Reproduced from paper with attribution.

---

### R7 — RoadmapBench: Long-Horizon Version-Upgrade Tasks (2026)

**Source:** arXiv  
**URL:** https://arxiv.org/abs/2605.15846  
**Published:** 2026  
**Type:** Academic benchmark paper  

**What it establishes:**
A benchmark of 115 long-horizon version-upgrade tasks across 17 repositories and 5 languages. Even Claude Opus 4.7 resolved only 39.1% of tasks in the reported evaluation, establishing that multi-version, multi-file development remains difficult for frontier models.

**How EPOCH uses it:**
- ARCHITECTURE.md Section 2 comparison table (row: RoadmapBench)
- Shows the problem persists across languages and repositories, not just a specific benchmark artifact

**Claim in our platform:** "115 long-horizon version-upgrade tasks; Claude Opus 4.7 resolved 39.1%."  
**Attribution:** Reproduced from paper with attribution.

---

### R8 — AgenticFlict: Merge Conflicts in AI Coding Agent PRs (2026)

**Source:** GitHub / arXiv  
**URL:** https://github.com/unlv-evol/AgenticFlict  
**Published:** 2026  
**Type:** Dataset + paper  

**What it establishes:**
A large dataset of merge conflicts in AI coding-agent PRs on GitHub. The paper explicitly notes that semantic conflicts — where two changes are both syntactically valid but disagree on behavior — are not captured by textual merge-conflict detection.

**How EPOCH uses it:**
- Supports the "Semantic conflict" drift pattern in ARCHITECTURE.md Section 17
- Demonstrates that snapshot-based review is insufficient for detecting the class of problems EPOCH targets
- The EPOCH trajectory model is explicitly designed to capture semantic conflicts that textual tools miss

**Claim in our platform:** "Semantic conflicts are not captured by textual merge-conflict detection."  
**Attribution:** Reproduced from paper with attribution.

---

### R9 — IBM Bob Developer Tutorials (2026)

**Source:** IBM Developer  
**URL:** https://developer.ibm.com/components/ibm-bob/tutorials/  
**Published:** 2026 (ongoing)  
**Type:** Primary technical documentation (IBM)  

**What it establishes:**
Practical examples of Bob workflows and integrations in modernization and agentic development scenarios. Confirms integration patterns used in EPOCH.

**How EPOCH uses it:**
- Reference for Bob workflow YAML syntax used in `.bob/workflows/`
- Reference for MCP integration patterns in the EPOCH-MCP server design

---

## Claim → Source Mapping

This table maps every external claim in the platform to its source.

| Claim | Source | Status |
|---|---|---|
| "AI agents can now implement features at extraordinary speed" | R1, R2 | Primary IBM docs |
| "~65% isolated task performance, ~21% long-horizon" | R5 (SWE-EVO) | Cited paper |
| ">80% isolated, ≤38% continuous-evolution" | R6 (EvoClaw) | Cited paper |
| "Claude Opus 4.7 resolved 39.1% of version-upgrade tasks" | R7 (RoadmapBench) | Cited paper |
| "Semantic conflicts not captured by textual merge detection" | R8 (AgenticFlict) | Cited paper |
| "Bob V2 ships background tasks, rollback, subagents, reusable workflows" | R1 | Primary IBM doc |
| "IBM positions Bob as agentic SDLC platform with shared workflow engine" | R2, R3 | Primary IBM docs |
| "AI is shifting bottlenecks toward review and validation" | R3 | Primary IBM doc |
| "Bob ships hooks and deterministic rails" | R4 | Primary IBM doc |

---

## What Is Not Claimed

Intellectual honesty requires stating what EPOCH does not claim.

| Non-claim | Why not claimed |
|---|---|
| "EPOCH provably detects all architectural drift" | Drift detection is heuristic. The three patterns are deterministic but not exhaustive. |
| "EPOCH proves causality" | The platform produces candidate causal chains with evidence, explicitly labelled `hypothesised`. Causal proof is not claimed. |
| "EPOCH improves agent performance by X%" | This would require a controlled experiment EPOCH has not run. The platform measures its own specific metrics (listed in ARCHITECTURE.md Section 27). |
| "EPOCH is production-ready" | The prototype is a 48-hour MVP. ADR-025 and ARCHITECTURE.md Section 19 document the explicit scope limitations. |
| "Counterfactual simulations predict production outcomes" | Simulations are isolated experiments for comparison, not production predictors. This is enforced by the `hypothesised` labelling. |

---

## Note on Benchmark Figures

The SWE-EVO, EvoClaw, and RoadmapBench figures represent performance in the specific evaluation setups described in each paper. Benchmark results are sensitive to evaluation methodology, model version, and setup specifics. These figures are used to establish that a performance gap exists at the research frontier — not to make precise universal performance claims.

The EPOCH platform dossier (the PDF, page 4) includes this same caveat: "Current product claims are attributed to IBM/primary sources; benchmark figures are reproduced only where explicitly stated by the source."
