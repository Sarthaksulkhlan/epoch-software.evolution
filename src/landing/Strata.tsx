import { useEffect, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { LAYERS, TESTS_PER_CHANGE, type LayerId } from './story';

type Lens = 'tests' | 'epoch';

// A cross-section of the codebase's history: one layer per approved change,
// oldest at the bottom. The drawing stretches to its box, so the labels live
// in HTML on top of it and keep their size at any width.
const VB_W = 1000;
const TOP = 14;
const BAND = 100;
const VB_H = TOP + BAND * LAYERS.length;
const CRACK_X = 560;

// The console's palette: emerald healthy, amber strained, rose broken.
const FILL_STOPS: Array<[number, string]> = [[0.5, '#4c1321'], [0.75, '#4a3410'], [1, '#0b3b30']];
const EDGE_STOPS: Array<[number, string]> = [[0.5, '#fb7185'], [0.75, '#fbbf24'], [1, '#34d399']];
const TESTS_FILL = '#12161d';
const TESTS_EDGE = '#2a3140';
const PATTERNS = ['st-dash', 'st-dots', 'st-hatch'];

function hexToRgb(hex: string): number[] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ramp(stops: Array<[number, string]>, value: number): string {
  const v = Math.min(Math.max(value, stops[0][0]), stops[stops.length - 1][0]);
  for (let i = 1; i < stops.length; i++) {
    const [x0, c0] = stops[i - 1];
    const [x1, c1] = stops[i];
    if (v <= x1) {
      const t = (v - x0) / (x1 - x0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      return `rgb(${a.map((ch, k) => Math.round(ch + (b[k] - ch) * t)).join(' ')})`;
    }
  }
  return stops[stops.length - 1][1];
}

export function formatScore(score: number): string {
  return score === 0.875 ? '0.875' : score.toFixed(2);
}

/** Text colour for a boundary score, in the console's semantic colours. */
export function scoreTone(score: number): string {
  return score >= 0.8 ? 'text-emerald-300' : score >= 0.7 ? 'text-amber-300' : 'text-rose-300';
}

const bandTop = (i: number) => TOP + (LAYERS.length - 1 - i) * BAND;

/** Wavy top edge of layer i (0 is the oldest). */
function edgePoints(i: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let x = 0; x <= VB_W; x += 20) {
    const y = bandTop(i) + Math.sin(x / 95 + i * 1.9) * 5 + Math.sin(x / 41 + i * 0.7) * 2.2;
    pts.push([x, Number(y.toFixed(1))]);
  }
  return pts;
}

const EDGES = LAYERS.map((_, i) => edgePoints(i));
const edgeLine = (i: number) => EDGES[i].map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ');
const layerArea = (i: number) => `M0 ${VB_H} L${EDGES[i].map(([x, y]) => `${x} ${y}`).join(' L')} L${VB_W} ${VB_H} Z`;

/**
 * The crack starts as a hairline inside M-1042, widens through M-1051 and
 * M-1077, where the incident opens, and closes under M-1085, the fix.
 */
function crackPolygon(): string {
  const start = bandTop(1) + BAND * 0.62;
  const end = bandTop(4) + 12;
  const span = start - end;
  const at = (y: number) => (start - y) / span;
  const [a, b, c] = [at(bandTop(1)), at(bandTop(2)), at(bandTop(3))];
  const width = (t: number) =>
    t < a ? 1.5 + (t / a) * 1.5
      : t < b ? 3 + ((t - a) / (b - a)) * 5
        : t < c ? 8 + ((t - b) / (c - b)) * 10
          : 18 * Math.pow(1 - (t - c) / (1 - c), 0.6);
  const left: string[] = [];
  const right: string[] = [];
  const steps = 26;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const y = start - span * t;
    const x = CRACK_X + Math.sin(s * 2.3) * 11 + Math.sin(s * 5.1) * 5;
    const w = width(t) / 2;
    left.push(`${(x - w).toFixed(1)} ${y.toFixed(1)}`);
    right.unshift(`${(x + w).toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${left.join(' L')} L${right.join(' L')} Z`;
}

const CRACK = crackPolygon();

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

export function Strata() {
  const [lens, setLens] = useState<Lens>(() => (prefersReducedMotion() ? 'epoch' : 'tests'));
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<LayerId>('M-1077');

  // One reveal on load: the panel opens on what the tests saw, then shows what EPOCH measured.
  useEffect(() => {
    if (touched || lens === 'epoch') return;
    const timer = window.setTimeout(() => setLens('epoch'), 1700);
    return () => window.clearTimeout(timer);
  }, [touched, lens]);

  const choose = (next: Lens) => {
    setTouched(true);
    setLens(next);
  };

  const layer = LAYERS.find(l => l.id === selected) ?? LAYERS[0];
  const tab = (active: boolean) =>
    `rounded-[2px] px-2.5 py-1.5 transition-colors duration-150 ${
      active
        ? 'bg-[#131b29] text-cyan-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.45)]'
        : 'text-zinc-400 hover:text-zinc-200'
    }`;

  return (
    <div className="st overflow-hidden rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur" data-lens={lens}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
        <span className={`${LABEL} flex items-center gap-2 text-zinc-300`}>
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
          System history
          <span className="text-zinc-600">//</span>
          <span className="text-zinc-500">Payments service</span>
        </span>
        <div className={`${LABEL} flex rounded-sm border border-zinc-800 bg-[#06070a] p-0.5`} role="group" aria-label="Choose what the layers show">
          <button type="button" className={tab(lens === 'tests')} aria-pressed={lens === 'tests'} onClick={() => choose('tests')}>
            What your tests see
          </button>
          <button type="button" className={tab(lens === 'epoch')} aria-pressed={lens === 'epoch'} onClick={() => choose('epoch')}>
            What EPOCH sees
          </button>
        </div>
      </div>

      <p className="min-h-[4.2em] px-4 pt-3 text-[13px] leading-relaxed text-zinc-400 sm:min-h-[3em]">
        {lens === 'tests'
          ? `Each layer is one approved change, oldest at the bottom. Every one passed all ${TESTS_PER_CHANGE} tests.`
          : 'The same changes, measured as a system. The boundary score falls from 1.00 to 0.50, a crack opens under the surface and an incident follows. Select a layer.'}
      </p>

      <div className="st-frame relative mx-4 mt-2 h-[360px] overflow-hidden rounded-sm border border-zinc-800 sm:h-[400px]">
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <pattern id="st-dash" width="28" height="12" patternUnits="userSpaceOnUse">
              <path d="M2 6h12" stroke="#fff" strokeOpacity="0.07" strokeWidth="1.2" />
            </pattern>
            <pattern id="st-dots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.3" fill="#fff" fillOpacity="0.07" />
            </pattern>
            <pattern id="st-hatch" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 14L14 0" stroke="#fff" strokeOpacity="0.055" strokeWidth="1.2" />
            </pattern>
            <clipPath id="st-reveal">
              <rect className="st-clip" x="0" y="0" width={VB_W} height={VB_H} style={{ '--vbh': `${VB_H}px` } as CSSProperties} />
            </clipPath>
          </defs>

          {/* Paint the newest first; each older layer covers the one above from its own top edge down. */}
          {LAYERS.map((_, i) => LAYERS.length - 1 - i).map(i => {
            const l = LAYERS[i];
            const fill = lens === 'epoch' ? ramp(FILL_STOPS, l.boundary) : TESTS_FILL;
            const edge = lens === 'epoch' ? ramp(EDGE_STOPS, l.boundary) : TESTS_EDGE;
            const delay = `${i * 90}ms`;
            return (
              <g key={l.id}>
                <path className="st-fill" d={layerArea(i)} style={{ fill, transitionDelay: delay }} />
                <path d={layerArea(i)} fill={`url(#${PATTERNS[i % PATTERNS.length]})`} />
                <path className="st-edge" d={edgeLine(i)} style={{ stroke: edge, transitionDelay: delay }} />
              </g>
            );
          })}

          <g clipPath="url(#st-reveal)">
            <path className="st-crack" d={CRACK} />
          </g>
        </svg>

        <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse" style={{ top: `${(TOP / VB_H) * 100}%` }}>
          {LAYERS.map(l => (
            <button
              key={l.id}
              type="button"
              className="st-row relative flex flex-1 items-center justify-between gap-3 px-3.5 text-left sm:px-4"
              data-selected={selected === l.id}
              aria-pressed={selected === l.id}
              aria-label={`${l.id}, ${l.title}. Show what happened.`}
              onClick={() => setSelected(l.id)}
            >
              <span className="grid min-w-0 max-w-[54%] leading-tight">
                <span className="font-mono text-[10px] text-white/55">{l.id}</span>
                <span className="truncate text-[13.5px] font-semibold text-zinc-100 [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">{l.title}</span>
              </span>
              {l.incident && lens === 'epoch' && (
                <span
                  className="st-incident absolute top-1/2 inline-flex items-center gap-1.5 rounded-sm border border-rose-500/60 bg-rose-950/85 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300"
                  style={{ left: `${(CRACK_X / VB_W) * 100 + 2.5}%` }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" aria-hidden="true" />
                  {l.incident}
                </span>
              )}
              <span className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-zinc-800 bg-[#06070a]/85 px-2 py-1 font-mono text-[10.5px] text-zinc-200">
                {lens === 'tests' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    {TESTS_PER_CHANGE}/{TESTS_PER_CHANGE} tests
                  </>
                ) : (
                  <>
                    <span className={`font-semibold ${scoreTone(l.boundary)}`}>{formatScore(l.boundary)}</span>
                    <span className="hidden text-[9.5px] uppercase tracking-[0.12em] text-zinc-400 sm:inline">{l.flag}</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4" aria-live="polite">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[11px] text-zinc-500">{layer.id}</span>
          <span className="text-[14px] font-semibold text-zinc-100">{layer.title}</span>
          <span className={`${LABEL} text-zinc-500`}>By {layer.by}</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)]">
          <div className="rounded-sm border border-zinc-800 bg-[#06070a] p-3">
            <p className={`${LABEL} text-zinc-500`}>Tests say</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-zinc-200">
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              {TESTS_PER_CHANGE} of {TESTS_PER_CHANGE} passed
            </p>
          </div>
          <div className="rounded-sm border border-zinc-800 bg-[#06070a] p-3">
            <p className={`${LABEL} text-zinc-500`}>EPOCH says</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-200">{layer.epochSaw}</p>
            <p className={`${LABEL} mt-2 text-zinc-500`}>
              Boundary score <span className={`font-semibold ${scoreTone(layer.boundary)}`}>{formatScore(layer.boundary)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
