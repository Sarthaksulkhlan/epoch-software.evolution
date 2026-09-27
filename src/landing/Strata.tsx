import { useEffect, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { LAYERS, TESTS_PER_CHANGE, type LayerId } from './story';

type Lens = 'tests' | 'epoch';

// The drawing is a cross-section of the codebase's history: one layer per
// approved change, oldest at the bottom. It stretches to its box, so the
// labels live in HTML on top of it and keep their size at any width.
const VB_W = 1000;
const TOP = 14;
const BAND = 100;
const VB_H = TOP + BAND * LAYERS.length;
const CRACK_X = 560;

const FILL_STOPS: Array<[number, string]> = [[0.5, '#7d2935'], [0.75, '#7a5d1f'], [1, '#1a6a61']];
const EDGE_STOPS: Array<[number, string]> = [[0.5, '#f05a67'], [0.75, '#e2b857'], [1, '#43c6ac']];
const TESTS_FILL = '#22324a';
const TESTS_EDGE = '#3b5475';
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

export function Strata() {
  const [lens, setLens] = useState<Lens>(() => (prefersReducedMotion() ? 'epoch' : 'tests'));
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<LayerId>('M-1077');

  // One reveal on load: the page opens on what the tests saw, then shows what EPOCH saw.
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

  return (
    <div className="st" data-lens={lens}>
      <div className="st-toggle" role="group" aria-label="Choose what the layers show">
        <button type="button" aria-pressed={lens === 'tests'} onClick={() => choose('tests')}>
          What your tests see
        </button>
        <button type="button" aria-pressed={lens === 'epoch'} onClick={() => choose('epoch')}>
          What EPOCH sees
        </button>
      </div>

      <p className="st-caption">
        {lens === 'tests'
          ? `Each layer is one approved change, oldest at the bottom. Every one passed all ${TESTS_PER_CHANGE} tests.`
          : 'Same changes, measured as a system. The boundary score falls from 1.00 to 0.50, a crack opens under the surface, and an incident follows. Select a layer to see what happened.'}
      </p>

      <div className="st-frame">
        <svg
          className="st-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern id="st-dash" width="28" height="12" patternUnits="userSpaceOnUse">
              <path d="M2 6h12" stroke="#fff" strokeOpacity="0.09" strokeWidth="1.2" />
            </pattern>
            <pattern id="st-dots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.3" fill="#fff" fillOpacity="0.09" />
            </pattern>
            <pattern id="st-hatch" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 14L14 0" stroke="#fff" strokeOpacity="0.07" strokeWidth="1.2" />
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

        <div className="st-rows" style={{ top: `${(TOP / VB_H) * 100}%` }}>
          {LAYERS.map(l => (
            <button
              key={l.id}
              type="button"
              className="st-row"
              data-selected={selected === l.id}
              aria-pressed={selected === l.id}
              aria-label={`${l.id}, ${l.title}. Show what happened.`}
              onClick={() => setSelected(l.id)}
            >
              <span className="st-name">
                <span className="st-id">{l.id}</span>
                <span className="st-title">{l.title}</span>
              </span>
              {l.incident && lens === 'epoch' && (
                <span className="st-incident" style={{ left: `${(CRACK_X / VB_W) * 100 + 2.5}%` }}>
                  <span className="st-incident-dot" aria-hidden="true" />
                  {l.incident}
                </span>
              )}
              <span className="st-badge">
                {lens === 'tests' ? (
                  <>
                    <Check className="st-check" aria-hidden="true" />
                    {TESTS_PER_CHANGE}/{TESTS_PER_CHANGE} tests
                  </>
                ) : (
                  <>
                    <span className="st-score">{formatScore(l.boundary)}</span>
                    <span className="st-flag">{l.flag}</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="st-detail" aria-live="polite">
        <p className="st-detail-head">
          <span className="st-id">{layer.id}</span>
          <span>{layer.title}</span>
          <span className="st-by">by {layer.by}</span>
        </p>
        <div className="st-detail-grid">
          <div>
            <p className="st-detail-label">Tests say</p>
            <p>{TESTS_PER_CHANGE} of {TESTS_PER_CHANGE} passed.</p>
          </div>
          <div>
            <p className="st-detail-label">EPOCH says</p>
            <p>
              {layer.epochSaw} <span className="st-detail-score">Boundary score {formatScore(layer.boundary)}.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
