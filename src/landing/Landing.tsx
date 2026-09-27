import { useEffect } from 'react';
import { GitFork, Gauge, History, Route, ShieldCheck } from 'lucide-react';
import { Strata, formatScore } from './Strata';
import { FUTURES, FUTURES_WALL_SECONDS, TESTS_PER_CHANGE } from './story';
import { useLiveStatus, type LiveStatus } from './useLiveStatus';
import './landing.css';

const REPO = 'https://github.com/vighriday/epoch-software-evolution';
const CONSOLE = '/console/trajectory';
const FUTURES_VIEW = '/console/futures';

function Mark() {
  // Three layers of the strata: healthy, strained, broken.
  return (
    <svg className="lp-mark" viewBox="0 0 24 18" aria-hidden="true" focusable="false">
      <path d="M1 3.5c4-2 7 1.5 11 0s7-2 11 0" stroke="#43c6ac" />
      <path d="M1 9c4-2 7 1.5 11 0s7-2 11 0" stroke="#e2b857" />
      <path d="M1 14.5c4-2 7 1.5 11 0s7-2 11 0" stroke="#f05a67" />
    </svg>
  );
}

const LIVE_TEXT: Record<LiveStatus['kind'], string> = {
  loading: 'Checking the live demo.',
  open: 'Live now: INC-3312 is open and the payments service is waiting for someone to choose a fix.',
  fixing: 'Live now: a visitor adopted a fix for INC-3312 and it is on its way to the approval gate.',
  resolved: 'Live now: a visitor approved fix B and INC-3312 is resolved. The demo resets after 20 quiet minutes.',
  preparing: 'The live demo is setting up its story. Give it a minute.',
  offline: 'The live demo runs on a free server. If it is asleep, the console takes about a minute to wake up.'
};

function LiveLine() {
  const live = useLiveStatus();
  return (
    <p className="lp-live" data-kind={live.kind}>
      <span className="lp-live-dot" aria-hidden="true" />
      {LIVE_TEXT[live.kind]}
    </p>
  );
}

const DOES = [
  {
    icon: History,
    name: 'Remembers',
    text: 'Every approved change is kept with what it did, why, who made it and who approved it.'
  },
  {
    icon: Gauge,
    name: 'Measures',
    text: 'After each change it scans the code, checks the rules the team wrote down and tracks a few health scores.'
  },
  {
    icon: Route,
    name: 'Traces',
    text: 'When something breaks, it walks back through earlier changes and names the likely chain, with how sure it is about each link.'
  },
  {
    icon: GitFork,
    name: 'Compares fixes',
    text: 'It copies the code so fixes can be built side by side and measured like real changes, before anyone commits to one.'
  }
];

const BOB_STEPS = [
  {
    name: 'Reads first',
    text: 'Before touching code, Bob pulls the history, the rules in scope and past incidents from EPOCH.'
  },
  {
    name: 'Plans in the open',
    text: 'It records a plan, and EPOCH’s reviewers for history, security, tests and system health check it.'
  },
  {
    name: 'Makes the change',
    text: 'In its engineer mode Bob can only edit the watched service, and a hook tells EPOCH about every edit.'
  },
  {
    name: 'Stops at the gate',
    text: 'Bob has no approve tool. A person reads the review summary and decides.'
  }
];

const BOB_FEATURES = [
  { name: 'Custom modes', text: 'An engineer that may only edit the watched service, and a read-only analyst.' },
  { name: 'Slash commands', text: '/epoch-change, /epoch-why and /epoch-futures run the three jobs in the demo.' },
  { name: 'Skills', text: 'Governed change and evolution analysis, written down so Bob follows the same steps every time.' },
  { name: 'Hooks', text: 'After every edit and at the end of each task, Bob reports to EPOCH on its own.' },
  { name: 'EPOCH’s MCP server', text: '21 tools Bob calls to read history, run reviewers, measure futures and ask for approval.' },
  { name: 'Parallel subagents', text: 'Two at once, each in its own copy of the code, to build futures A and B.' },
  { name: 'Plan mode', text: 'Bob planned its own setup and the evolution report before building them.' }
];

export default function Landing() {
  useEffect(() => {
    document.title = 'EPOCH: every change passed its tests, the system still broke';
  }, []);

  return (
    <div className="landing">
      <a className="lp-skip" href="#main">Skip to content</a>

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <a className="lp-brand" href="/" aria-label="EPOCH home">
            <Mark />
            <span className="display">EPOCH</span>
          </a>
          <nav className="lp-links" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#bob">IBM Bob</a>
            <a href="#try">Try it</a>
            <a href={REPO}>GitHub</a>
          </nav>
          <a className="lp-btn lp-btn-primary lp-btn-small" href={CONSOLE}>
            Open the live console
          </a>
        </div>
      </header>

      <main id="main">
        <section className="lp-wrap lp-hero">
          <h1 className="display lp-h1">
            <span>Every change passed its tests.</span> <span>The system still broke.</span>
          </h1>
          <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-deck">
              EPOCH remembers what a codebase has become while AI agents keep changing it. It notices when
              safe-looking changes add up to damage, traces the break back to the change that started it, and has
              IBM Bob build two fixes side by side so a person can choose with the numbers in front of them.
            </p>
            <div className="lp-ctas">
              <a className="lp-btn lp-btn-primary" href={CONSOLE}>
                Open the live console
              </a>
              <a className="lp-btn lp-btn-quiet" href="#bob">
                See how IBM Bob fits in
              </a>
            </div>
            <LiveLine />
          </div>
          <div className="lp-hero-strata">
            <Strata />
          </div>
          </div>
        </section>

        <section id="how" className="lp-section">
          <div className="lp-wrap">
            <h2 className="display lp-h2">What EPOCH does</h2>
            <p className="lp-lede">
              Coding agents are good at the next change. EPOCH watches the whole journey: it sits next to a
              codebase and keeps a record of what the system has become.
            </p>
            <div className="lp-does">
              {DOES.map(({ icon: Icon, name, text }) => (
                <div key={name} className="lp-does-item">
                  <Icon className="lp-does-icon" aria-hidden="true" />
                  <h3>{name}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fixes" className="lp-section">
          <div className="lp-wrap lp-split">
            <div>
              <h2 className="display lp-h2">Two fixes, built at the same time</h2>
              <p className="lp-lede">
                When INC-3312 opened, Bob split into two subagents, each working in its own copy of the code.
                EPOCH measured both results like real changes. Both passed every test and fixed the day-20
                dispute. Only one put the system back in shape.
              </p>
              <p className="lp-note">
                Both were built at once in {FUTURES_WALL_SECONDS} seconds, against{' '}
                {FUTURES.reduce((sum, f) => sum + f.buildSeconds, 0)} seconds one after the other.
              </p>
            </div>
            <div className="lp-futures">
              {FUTURES.map(f => (
                <article key={f.key} className="lp-future" data-recommended={f.recommended}>
                  <p className="lp-future-key">Future {f.key}</p>
                  <h3>{f.name}</h3>
                  <p className="lp-future-plan">{f.plan}</p>
                  <div className="lp-meter" aria-hidden="true">
                    <span style={{ width: `${f.boundary * 100}%` }} data-score={f.boundary} />
                    <i style={{ left: '80%' }} />
                  </div>
                  <dl className="lp-facts">
                    <div>
                      <dt>Boundary score</dt>
                      <dd>{formatScore(f.boundary)}</dd>
                    </div>
                    <div>
                      <dt>Tests</dt>
                      <dd>
                        {TESTS_PER_CHANGE} of {TESTS_PER_CHANGE}
                      </dd>
                    </div>
                    <div>
                      <dt>Day-20 dispute</dt>
                      <dd>Works</dd>
                    </div>
                    <div>
                      <dt>Built by a Bob subagent in</dt>
                      <dd>{f.buildSeconds} s</dd>
                    </div>
                  </dl>
                  {f.recommended && (
                    <p className="lp-chip">
                      Recommended. Approved as <span className="lp-nowrap">M-1085</span>.
                    </p>
                  )}
                </article>
              ))}
              <p className="lp-meter-legend">The mark on each bar is the safe range&rsquo;s floor, 0.80.</p>
            </div>
          </div>
        </section>

        <section id="bob" className="lp-section lp-bob">
          <div className="lp-wrap">
            <h2 className="display lp-h2">IBM Bob does the work. A person makes the call.</h2>
            <p className="lp-lede">
              EPOCH is built around IBM Bob. Bob is the engineer in every change of the demo, and it reaches EPOCH
              through modes, commands, skills, hooks and an MCP server made for it.
            </p>
            <div className="lp-bob-grid">
              <ol className="lp-steps">
                {BOB_STEPS.map(step => (
                  <li key={step.name}>
                    <h3>{step.name}</h3>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
              <div>
                <ul className="lp-features">
                  {BOB_FEATURES.map(feature => (
                    <li key={feature.name}>
                      <span className="lp-feature-name">{feature.name}</span>
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="lp-evidence">
                  <ShieldCheck className="lp-evidence-icon" aria-hidden="true" />
                  <span>
                    Every Bob task is exported with its summary screenshot.{' '}
                    <a href={`${REPO}/blob/main/docs/BOB_SESSIONS.md`}>Read the session log</a>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="impact" className="lp-section lp-impact">
          <div className="lp-wrap">
            <h2 className="display lp-h2">What it caught in the demo</h2>
            <div className="lp-numbers">
              <div>
                <p className="display lp-number">4 of 4</p>
                <p>
                  Four changes made the system worse, and every one passed all {TESTS_PER_CHANGE} tests. EPOCH
                  flagged all four. The first warning came at review, two changes before the incident.
                </p>
              </div>
              <div>
                <p className="display lp-number">2 s</p>
                <p>for Bob to get the likely chain of changes behind INC-3312 from EPOCH.</p>
              </div>
              <div>
                <p className="display lp-number">{FUTURES_WALL_SECONDS} s</p>
                <p>to build and measure two fixes with two Bob subagents working in parallel.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="try" className="lp-section">
          <div className="lp-wrap lp-split">
            <div>
              <h2 className="display lp-h2">Try it in two minutes</h2>
              <p className="lp-lede">
                The live demo runs the real engine. It opens at the moment a team has to choose a fix, and you get to
                make the call.
              </p>
              <div className="lp-ctas">
                <a className="lp-btn lp-btn-primary" href={CONSOLE}>
                  Open the live console
                </a>
                <a className="lp-btn lp-btn-quiet" href={FUTURES_VIEW}>
                  Go straight to Futures
                </a>
              </div>
              <p className="lp-note">
                It runs on a free server, so the first load can take about a minute. It resets itself after 20 quiet
                minutes.
              </p>
            </div>
            <ol className="lp-steps lp-try">
              <li>
                <h3>See the damage</h3>
                <p>Trajectory shows the boundary score below its safe range and INC-3312 open.</p>
              </li>
              <li>
                <h3>Adopt future B</h3>
                <p>In Futures, compare A and B and adopt B.</p>
              </li>
              <li>
                <h3>Approve it</h3>
                <p>
                  In Current, run EPOCH&rsquo;s checks to the approval gate, about 30 seconds, then approve. The
                  score goes back to 1.00 and the incident closes.
                </p>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <p>
            <Mark /> EPOCH was built for the IBM Bob 2.0 hackathon. MIT licence.
          </p>
          <nav aria-label="Project links">
            <a href={REPO}>Source on GitHub</a>
            <a href={`${REPO}/blob/main/docs/DEMO_GUIDE.md`}>Demo guide</a>
            <a href={`${REPO}/blob/main/docs/BOB_SESSIONS.md`}>Bob sessions</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
