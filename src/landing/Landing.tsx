import { useEffect, type ReactNode } from 'react';
import { Activity, Compass, Cpu, GitBranch, GitCommit, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Strata, formatScore, scoreTone } from './Strata';
import { FUTURES, FUTURES_WALL_SECONDS, TESTS_PER_CHANGE } from './story';
import { useLiveStatus, type LiveStatus } from './useLiveStatus';
import './landing.css';

const REPO = 'https://github.com/vighriday/epoch-software-evolution';
const CONSOLE = '/console/trajectory';

// Shared with the console: mono labels, graphite panels, rounded-sm corners.
const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';
const PANEL = 'rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur';
const CELL = 'rounded-sm border border-zinc-800 bg-[#06070a]';
const BTN = 'btn-control inline-flex items-center justify-center gap-2 rounded-sm border font-mono font-semibold uppercase tracking-[0.16em]';
const BTN_PRIMARY = `${BTN} border-emerald-300/60 bg-emerald-400 px-4 py-2.5 text-[11px] text-[#04120c] hover:bg-emerald-300`;
const BTN_QUIET = `${BTN} border-zinc-700 bg-zinc-900 px-4 py-2.5 text-[11px] text-zinc-200 hover:bg-zinc-800`;

interface View {
  name: string;
  href: string;
  icon: LucideIcon;
  subtitle: string;
  question: string;
  body: string;
  tone: string;
  hover: string;
}

// The console's four views, in the console's own colours.
const VIEWS: View[] = [
  {
    name: 'Current',
    href: '/console',
    icon: Activity,
    subtitle: 'Work in progress',
    question: 'What is being changed right now?',
    body: 'Every change runs as a tracked workflow. Bob plans, EPOCH’s reviewers check the plan, Bob edits, and the change waits at a gate until a person approves it.',
    tone: 'text-emerald-300',
    hover: 'hover:border-emerald-500/50'
  },
  {
    name: 'History',
    href: '/console/history',
    icon: GitCommit,
    subtitle: 'Every approved change',
    question: 'What changed, and why?',
    body: 'Each change is kept with what it did, why, who made it and who approved it, together with the evidence behind the decision.',
    tone: 'text-amber-300',
    hover: 'hover:border-amber-500/50'
  },
  {
    name: 'Trajectory',
    href: '/console/trajectory',
    icon: Compass,
    subtitle: 'System health over time',
    question: 'Is the system getting worse?',
    body: 'After each change EPOCH checks the team’s rules and scores how well services keep to their own boundaries. Slow damage raises a warning. A broken rule opens an incident, traced back to its likely cause.',
    tone: 'text-cyan-300',
    hover: 'hover:border-cyan-500/50'
  },
  {
    name: 'Futures',
    href: '/console/futures',
    icon: GitBranch,
    subtitle: 'Try two fixes side by side',
    question: 'What if we fixed it this way?',
    body: 'EPOCH copies the code so Bob can build two fixes at the same time. Both are measured like real changes before a person adopts one.',
    tone: 'text-violet-300',
    hover: 'hover:border-violet-500/50'
  }
];

const BOB_STEPS = [
  { name: 'Reads first', text: 'Before touching code, Bob pulls the history, the rules in scope and past incidents from EPOCH.' },
  { name: 'Plans in the open', text: 'It records a plan, and EPOCH’s reviewers for history, security, tests and system health check it.' },
  { name: 'Makes the change', text: 'In its engineer mode Bob can only edit the watched service, and a hook tells EPOCH about every edit.' },
  { name: 'Stops at the gate', text: 'Bob has no approve tool. A person reads the review summary and decides.' }
];

const BOB_FEATURES = [
  { name: 'Custom modes', text: 'An engineer that may only edit the watched service, and a read-only analyst.' },
  { name: 'Slash commands', text: '/epoch-change, /epoch-why and /epoch-futures run the three jobs in the demo.' },
  { name: 'Skills', text: 'Governed change and evolution analysis, written down so Bob follows the same steps every time.' },
  { name: 'Hooks', text: 'After every edit and at the end of each task, Bob reports to EPOCH on its own.' },
  { name: 'MCP server', text: '21 EPOCH tools Bob calls to read history, run reviewers, measure fixes and ask for approval.' },
  { name: 'Subagents', text: 'Two at once, each in its own copy of the code, to build futures A and B.' },
  { name: 'Plan mode', text: 'Bob planned its own setup and the evolution report before building them.' }
];

const RESULTS = [
  {
    label: 'Harmful changes flagged',
    value: '4 / 4',
    text: `Every one passed all ${TESTS_PER_CHANGE} tests. The first warning came at review, two changes before the incident.`
  },
  { label: 'Time to the likely cause', value: '2 s', text: 'for Bob to get the chain of changes behind INC-3312 from EPOCH.' },
  {
    label: 'Two fixes built and measured',
    value: `${FUTURES_WALL_SECONDS} s`,
    text: `by two Bob subagents working in parallel, against ${FUTURES.reduce((s, f) => s + f.buildSeconds, 0)} s one after the other.`
  }
];

const TRY_STEPS = [
  { view: 'Trajectory', tone: 'text-cyan-300', name: 'See the damage', text: 'The boundary score sits below its safe range and INC-3312 is open.' },
  { view: 'Futures', tone: 'text-violet-300', name: 'Adopt future B', text: 'Compare the two measured fixes, then adopt B.' },
  { view: 'Current', tone: 'text-emerald-300', name: 'Approve it', text: 'Run EPOCH’s checks to the gate, about 30 seconds, then approve. The score returns to 1.00.' }
];

const LIVE: Record<LiveStatus['kind'], { status: string; dot: string; tone: string; next: string }> = {
  loading: { status: 'Checking', dot: 'bg-zinc-500', tone: 'text-zinc-400', next: 'One moment' },
  open: { status: 'INC-3312 open', dot: 'bg-rose-400 animate-pulse', tone: 'text-rose-300', next: 'Someone to choose a fix' },
  fixing: { status: 'Fix on its way', dot: 'bg-amber-400', tone: 'text-amber-300', next: 'Approval at the gate' },
  resolved: { status: 'INC-3312 resolved', dot: 'bg-emerald-400', tone: 'text-emerald-300', next: 'Nothing. It resets after 20 quiet minutes' },
  preparing: { status: 'Setting up', dot: 'bg-amber-400', tone: 'text-amber-300', next: 'About a minute' },
  offline: { status: 'Waking up', dot: 'bg-zinc-500', tone: 'text-zinc-400', next: 'About a minute on the free server' }
};

function LiveStatusPanel() {
  const live = LIVE[useLiveStatus().kind];
  const rows: Array<[string, ReactNode]> = [
    [
      'Status',
      <span className={`inline-flex items-center gap-1.5 uppercase tracking-[0.12em] ${live.tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${live.dot}`} aria-hidden="true" />
        {live.status}
      </span>
    ],
    ['Service', 'Payments (sample-app)'],
    ['Waiting for', live.next]
  ];
  return (
    <div className={`${PANEL} font-mono`}>
      <div className={`${LABEL} flex items-center justify-between border-b border-zinc-800/80 px-3 py-2 text-zinc-500`}>
        <span className="text-zinc-300">Live demo</span>
        <span>Right now</span>
      </div>
      <dl className="divide-y divide-zinc-800/60 text-[11.5px]" aria-live="polite">
        {rows.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-4 px-3 py-2">
            <dt className={`${LABEL} text-zinc-500`}>{key}</dt>
            <dd className="text-right text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface SectionProps {
  id: string;
  dot: string;
  label: string;
  meta: string;
  title: string;
  intro: string;
  children: ReactNode;
}

/** Every section has the same frame: a labelled rule, a title column and a content column. */
function Section({ id, dot, label, meta, title, intro, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-14 border-t border-zinc-800/80">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className={`${LABEL} flex flex-wrap items-center justify-between gap-2`}>
          <span className="flex items-center gap-2 text-zinc-300">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
            {label}
          </span>
          <span className="text-zinc-500">{meta}</span>
        </div>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <div>
            <h2 className="text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-zinc-100 [text-wrap:balance] sm:text-[2rem]">{title}</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-zinc-400">{intro}</p>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = 'EPOCH: every change passed its tests, the system still broke';
  }, []);

  return (
    <div className="landing relative min-h-screen bg-[#050608] font-sans text-zinc-100 selection:bg-zinc-700 selection:text-white">
      {/* The console's backdrop: the moving grid and a soft operational glow. */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="live-moving-grid absolute inset-0 opacity-70" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 55% at 50% -12%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 45%, transparent 75%), radial-gradient(ellipse 60% 40% at 92% 100%, rgba(56,189,248,0.05) 0%, transparent 60%)'
          }}
        />
      </div>

      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#08090d]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 font-mono sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2.5" aria-label="EPOCH home">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-[#263550] bg-gradient-to-b from-[#1b2538] to-[#101724] text-zinc-300 shadow-inner">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-bold tracking-[0.16em] text-zinc-100">EPOCH</span>
            <span className="hidden text-zinc-600 sm:inline">//</span>
            <span className={`${LABEL} hidden text-zinc-400 sm:inline`}>The story</span>
          </a>
          <nav className={`${LABEL} ml-auto hidden items-center gap-5 text-zinc-400 lg:flex`} aria-label="Page sections">
            <a className="hover:text-zinc-100" href="#how">How it works</a>
            <a className="hover:text-zinc-100" href="#fixes">Futures</a>
            <a className="hover:text-zinc-100" href="#bob">IBM Bob</a>
            <a className="hover:text-zinc-100" href="#results">Results</a>
            <a className="hover:text-zinc-100" href="#try">Try it</a>
            <a className="hover:text-zinc-100" href={REPO}>GitHub</a>
          </nav>
          <a className={`${BTN} ml-auto border-emerald-300/60 bg-emerald-400 px-3 py-1.5 text-[10px] text-[#04120c] hover:bg-emerald-300 lg:ml-0`} href={CONSOLE}>
            Open console
          </a>
        </div>
      </header>

      <main id="main" className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="flex flex-col gap-7">
            <p className={`${LABEL} flex items-center gap-2 text-zinc-400`}>
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-emerald-400" aria-hidden="true" />
              EPOCH
              <span className="text-zinc-600">//</span>
              For code that AI agents change
            </p>
            <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em] text-zinc-100 [text-wrap:balance] sm:text-5xl xl:text-[3.5rem]">
              Every change passed its tests. The system still broke.
            </h1>
            <p className="max-w-xl text-[16px] leading-relaxed text-zinc-400">
              EPOCH remembers what a codebase has become while AI agents keep changing it. It spots when safe-looking
              changes add up to damage, traces the break back to where it started, and has IBM Bob build two fixes side
              by side so a person can choose with the numbers in front of them.
            </p>
            <div className="flex flex-wrap gap-3">
              <a className={BTN_PRIMARY} href={CONSOLE}>
                Open the live console
              </a>
              <a className={BTN_QUIET} href="#how">
                How it works
              </a>
            </div>
            <LiveStatusPanel />
          </div>
          <Strata />
        </section>

        <Section
          id="how"
          dot="bg-emerald-400"
          label="How it works"
          meta="One console, four views"
          title="Four views, each answering one question"
          intro="EPOCH sits next to a codebase and keeps a record of what the system has become. The live console shows that record in four views, in the same colours you will see inside."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {VIEWS.map(({ name, href, icon: Icon, subtitle, question, body, tone, hover }) => (
              <a key={name} href={href} className={`btn-control group flex flex-col ${CELL} p-5 ${hover}`}>
                <span className={`${LABEL} flex items-center justify-between gap-3`}>
                  <span className={`flex items-center gap-2 ${tone}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {name}
                  </span>
                  <span className="text-zinc-500">{subtitle}</span>
                </span>
                <span className="mt-4 text-[16px] font-semibold text-zinc-100">{question}</span>
                <span className="mt-2 flex-1 text-[13.5px] leading-relaxed text-zinc-400">{body}</span>
                <span className={`${LABEL} mt-5 text-zinc-500 transition-colors group-hover:text-zinc-200`}>Open {name}</span>
              </a>
            ))}
          </div>
        </Section>

        <Section
          id="fixes"
          dot="bg-violet-400"
          label="Futures"
          meta="Forked from M-1084"
          title="Two fixes, built at the same time"
          intro="When INC-3312 opened, Bob split into two subagents, each working in its own copy of the code. EPOCH measured both like real changes. Both passed every test and fixed the day-20 dispute. Only one put the system back in shape."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {FUTURES.map(f => (
              <article
                key={f.key}
                className={`rounded-sm border p-5 ${f.recommended ? 'border-violet-500/45 bg-violet-950/20' : 'border-zinc-800 bg-[#06070a]'}`}
              >
                <div className={`${LABEL} flex h-5 items-center justify-between gap-3`}>
                  <span className={f.recommended ? 'text-violet-300' : 'text-zinc-400'}>Future {f.key}</span>
                  {f.recommended && (
                    <span className="rounded-sm border border-emerald-500/40 bg-emerald-950/40 px-1.5 py-0.5 text-emerald-300">Recommended</span>
                  )}
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-zinc-100">{f.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{f.plan}</p>
                <div className="mt-5">
                  <div className={`${LABEL} flex justify-between text-zinc-500`}>
                    <span>Boundary score</span>
                    <span className={`font-semibold ${scoreTone(f.boundary)}`}>{formatScore(f.boundary)}</span>
                  </div>
                  <div className="relative mt-2 h-1.5 rounded-full bg-zinc-900" aria-hidden="true">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full ${f.boundary >= 0.8 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ width: `${f.boundary * 100}%` }}
                    />
                    <span className="absolute -inset-y-1 left-[80%] w-px bg-zinc-200/70" />
                  </div>
                </div>
                <dl className="mt-4 divide-y divide-zinc-800/60 font-mono text-[11.5px]">
                  {[
                    ['Tests', `${TESTS_PER_CHANGE} of ${TESTS_PER_CHANGE}`],
                    ['Day-20 dispute', 'Works'],
                    ['Built by a Bob subagent in', `${f.buildSeconds} s`]
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 py-2">
                      <dt className="text-zinc-500">{k}</dt>
                      <dd className="text-zinc-200">{v}</dd>
                    </div>
                  ))}
                </dl>
                {f.recommended && <p className={`${LABEL} mt-3 text-emerald-300`}>Approved as M-1085</p>}
              </article>
            ))}
          </div>
          <p className={`${LABEL} mt-4 leading-relaxed text-zinc-500`}>
            Both built at once in {FUTURES_WALL_SECONDS} s. The white mark on each bar is the safe range&rsquo;s floor, 0.80.
          </p>
        </Section>

        <Section
          id="bob"
          dot="bg-cyan-400"
          label="IBM Bob"
          meta="The engineer inside EPOCH"
          title="IBM Bob does the work. A person makes the call."
          intro="EPOCH is built around IBM Bob. Bob makes every change in the demo, and it reaches EPOCH through modes, commands, skills, hooks and an MCP server made for it."
        >
          <div className="grid gap-3">
            <div className={PANEL}>
              <p className={`${LABEL} border-b border-zinc-800/80 px-4 py-2.5 text-zinc-400`}>How Bob makes a change</p>
              <ol className="grid gap-x-8 gap-y-5 p-4 sm:grid-cols-2">
                {BOB_STEPS.map((step, i) => (
                  <li key={step.name} className="relative pl-10">
                    <span className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-sm border border-cyan-500/40 bg-cyan-950/40 font-mono text-[11px] font-semibold text-cyan-300">
                      {i + 1}
                    </span>
                    <h3 className="text-[14.5px] font-semibold text-zinc-100">{step.name}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-400">{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className={PANEL}>
              <p className={`${LABEL} border-b border-zinc-800/80 px-4 py-2.5 text-zinc-400`}>Bob features in use</p>
              <dl className="divide-y divide-zinc-800/60">
                {BOB_FEATURES.map(feature => (
                  <div key={feature.name} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
                    <dt className={`${LABEL} pt-0.5 text-cyan-300/90`}>{feature.name}</dt>
                    <dd className="text-[13px] leading-relaxed text-zinc-400">{feature.text}</dd>
                  </div>
                ))}
              </dl>
              <a
                href={`${REPO}/blob/main/docs/BOB_SESSIONS.md`}
                className={`${LABEL} flex items-center gap-2 border-t border-zinc-800/80 px-4 py-3 text-zinc-400 hover:text-zinc-100`}
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
                Every Bob task is exported. Read the session log
              </a>
            </div>
          </div>
        </Section>

        <Section
          id="results"
          dot="bg-amber-400"
          label="Results"
          meta="Measured in the demo"
          title="What it caught"
          intro="Every number here comes from EPOCH’s own measurements of the payments service and from the recorded Bob sessions."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {RESULTS.map(r => (
              <div key={r.label} className={`${CELL} p-5`}>
                <p className={`${LABEL} min-h-[2.6em] leading-snug text-zinc-500`}>{r.label}</p>
                <p className="mt-4 font-mono text-[2.4rem] font-semibold leading-none tracking-tight text-zinc-100 tabular-nums">{r.value}</p>
                <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-400">{r.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="try"
          dot="bg-emerald-400"
          label="Try it"
          meta="About two minutes"
          title="Finish the story yourself"
          intro="The live demo runs the real engine. It opens at the moment a team has to choose a fix, and you make the call."
        >
          <ol className="grid gap-3 md:grid-cols-3">
            {TRY_STEPS.map((step, i) => (
              <li key={step.name} className={`${CELL} p-5`}>
                <p className={`${LABEL} flex items-center justify-between gap-3`}>
                  <span className="text-zinc-500">Step {i + 1}</span>
                  <span className={step.tone}>{step.view}</span>
                </p>
                <h3 className="mt-4 text-[15px] font-semibold text-zinc-100">{step.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a className={BTN_PRIMARY} href={CONSOLE}>
              Open the live console
            </a>
            <a className={BTN_QUIET} href="/console/futures">
              Go straight to Futures
            </a>
          </div>
          <p className={`${LABEL} mt-4 leading-relaxed text-zinc-500`}>
            Free server: the first load can take about a minute. The demo resets after 20 quiet minutes.
          </p>
        </Section>
      </main>

      <footer className="relative z-10 border-t border-zinc-800/80 bg-[#08090d]">
        <div className={`${LABEL} mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-zinc-500 sm:px-6 lg:px-8`}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-bold tracking-[0.16em] text-zinc-300">EPOCH</span>
            <span className="text-zinc-700">//</span>
            Built for the IBM Bob 2.0 hackathon
            <span className="text-zinc-700">//</span>
            MIT licence
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Project links">
            <a className="hover:text-zinc-200" href={REPO}>Source on GitHub</a>
            <a className="hover:text-zinc-200" href={`${REPO}/blob/main/docs/DEMO_GUIDE.md`}>Demo guide</a>
            <a className="hover:text-zinc-200" href={`${REPO}/blob/main/docs/BOB_SESSIONS.md`}>Bob sessions</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
