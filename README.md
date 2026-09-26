# EPOCH — Software Evolution Control Plane

> **AI-Native Mission Control for Continuous Software Evolution, Boundary Invariants, and Counterfactual Reasoning**

EPOCH is an operational control plane engineered to monitor, govern, and reason about autonomous and agent-assisted software mutations. While AI coding agents (such as IBM Bob 2.0 and orchestrators like WEAVE) synthesize and commit code rapidly, EPOCH acts as the architectural sentinel—tracking causal mutation lineage, evaluating boundary invariant drift, gating risky changes, and projecting counterfactual futures.

---

## 🧭 Four Operational Lenses

EPOCH organizes complex system evolution into four interconnected, high-cohesion operational lenses:

### 1. `CURRENT` — Workflow Lifecycle Deck
* **Real-time Lifecycle Pipeline**: Interactive inspection across stages: `INTAKE` (statutory requirements/directives), `PLAN` (task decomposition and boundary checks), `IMPLEMENT` (synthesized diffs and mutations), `VERIFY` (regression oracles), and `APPROVAL` (governance gate).
* **Agent Fabric Orchestration**: Live telemetry for specialist synthesizers (IBM Bob 2.0) and architectural sentinels.
* **Governed Approval Gate**: Two-step human-in-the-loop checkpoint (`GATE-774`). Approving requires an explicit confirmation dialogue before committing to production (`Approve ≠ Automatic Commit`).
* **Live SSE Telemetry Stream**: Streaming event bus for mutation logs, oracle passes, and drift warnings with pause/resume controls.

### 2. `HISTORY` — Temporal Lineage & Causal Archaeology
* **Causal Mutation DAG**: Visual graph of interconnected codebase mutations (`M-1042`, `M-1051`, `M-1077`, etc.) mapped against incident timelines.
* **Semantic Diff Inspector**: Line-by-line syntax inspection with diff highlights, author metadata, and affected subsystems.
* **Evidence Archaeology**: Cryptographically verified audit artifacts linking changes to statutory directives (`EU-2026-PAY-882`).

### 3. `TRAJECTORY` — Evolution & Architectural Drift
* **Drift Trajectory Detection**: Identifies subtle architectural divergences before catastrophic production failure (e.g., expanding dispute windows to 30 days while settlement ledger partition archival remains set to 15 days).
* **Evidence-Backed "Why?" Reasoning Panel**:
  - Diagnostic assessment of candidate causal chains.
  - Identification of earliest plausible mutations.
  - Affected components (`Payment API`, `Order Service`, `Ledger DB Partitions`, `Archival Job Cron`).
  - Boundary invariant status (`INV-BOUND-04`: Cross-Service Ledger Boundary Isolation).
* **Epistemic Qualification**: Rigorous qualification as heuristic candidate correlation rather than unsupported mathematical certainty.

### 4. `FUTURES` — Counterfactual Simulation & Branch Forking
* **Forking Counterfactual Realities**: Simulate *"What if mutation M-1042 was deployed with an updated 45-day archival partition cron?"*
* **Side-by-side Outcome Projections**: Real-time divergence metrics comparing production trajectory vs. counterfactual branches.
* **Risk Delta & Mitigation**: Automated policy recommendations for architectural debt reduction.

---

## ⚡ Tech Stack & Architecture

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 8](https://vitejs.dev/) with [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing**: [React Router v7](https://reactrouter.com/) (SPA architecture with direction-aware 800ms lens-shift transitions)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts & Visualization**: [Recharts](https://recharts.org/)
- **Server / Middleware**: Node.js + Express (with Vite dev middlewares)
- **AI SDK**: `@google/genai` (Gemini API ready)

---

## 🚀 Getting Started Locally (VS Code / Terminal)

Follow these simple steps to run EPOCH on your local machine:

### 1. Prerequisites
- **Node.js**: Version `18.0.0` or higher (Node `20.x` or `22.x` recommended)
- **Package Manager**: `npm` (included with Node.js) or `pnpm` / `yarn`
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/Sarthaksulkhlan/epoch-software-evolution.git
cd epoch-software-evolution
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables (Optional)
Copy the example environment configuration:
```bash
cp .env.example .env
```
*(Note: EPOCH runs out-of-the-box in local simulation mode without external API keys required).*

### 5. Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on `http://localhost:3000` |
| `npm run build` | Compiles TypeScript and builds production-ready static assets in `dist/` |
| `npm run preview` | Locally serves the production build to verify bundle output |
| `npm run lint` | Runs `tsc --noEmit` to validate all TypeScript types and imports |
| `npm run clean` | Removes compiled `dist/` artifacts |

---

## 📂 Project Structure

```
epoch-software-evolution/
├── src/
│   ├── console/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar navigation, TopBar, and ConsoleLayout
│   │   │   ├── shared/          # MetricCards, StatusBadges, EventFeed, Search
│   │   │   ├── trajectory/      # DriftAlertBanner, "Why?" Reasoning Panel
│   │   │   └── workflow/        # Interactive WorkflowTimeline, ApprovalGate, EvidencePanel
│   │   ├── data/
│   │   │   └── mock/            # Canonical workflows, mutations, invariants, telemetry
│   │   ├── hooks/               # useWorkflow, useEventStream, useLineage
│   │   ├── types/               # TypeScript domain interfaces (Lifecycle, Invariants, Gates)
│   │   └── views/               # Four Operational Lenses:
│   │       ├── CurrentView.tsx  # CURRENT lens
│   │       ├── HistoryView.tsx  # HISTORY lens
│   │       ├── TrajectoryView.tsx # TRAJECTORY lens
│   │       └── FuturesView.tsx  # FUTURES lens
│   ├── App.tsx                  # Root application & Router configuration
│   ├── index.css                # Tailwind CSS v4, live grid keyframes, motion styling
│   └── main.tsx                 # React 19 entry point
├── public/                      # Static assets & icons
├── metadata.json                # AI Studio application metadata
├── package.json                 # Project dependencies & scripts
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration with Tailwind CSS plugin
└── README.md                    # Project documentation
```

---

## 🔒 Governance & Architectural Invariants

EPOCH monitors core architectural invariants across every mutation:
- **`INV-BOUND-04`**: Cross-Service Ledger Boundary Isolation (prevents order and payment services from bypassing service APIs to query database partitions directly).
- **`INV-TIME-02`**: Temporal Archival Parity (ensures dispute eligibility windows and archival cron partition retention remain synchronized).
- **`INV-AUTH-01`**: Idempotent Dispute Token Validation.

---

## 📄 License

This project is licensed under the MIT License.
