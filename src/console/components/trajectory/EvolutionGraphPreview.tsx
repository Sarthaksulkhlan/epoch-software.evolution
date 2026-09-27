import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphNodeData, GraphEdgeData } from '../../types';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface EvolutionGraphPreviewProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  highlightCausalChain: boolean;
  selectedEpoch: number;
  /** Earliest plausible contributing mutation ('' when none). */
  originMutationId?: string;
  /** Id of the open incident, when there is one. */
  openIncidentId?: string;
  /** Mutation ids touching the active component filter (null = no filter). */
  componentMatchIds?: Set<string> | null;
  /** 'ALL' or an invariant status (HOLDING / WEAKENED / VIOLATED). */
  activeInvariantFilter?: string;
}

const SVG_HEIGHT = 460;
const MIN_WIDTH = 1140;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.2;
/** Mutation boxes are 140 wide on a 150px pitch, leaving a small gap between neighbours. */
const MUTATION_HALF_WIDTH = 70;
/** Approximate glyph width of the 9px, letter-spaced monospace lane labels. */
const LANE_CHAR_WIDTH = 6.4;

type Point = { x: number; y: number };

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…` : text;

const pad2 = (n: number) => String(n).padStart(2, '0');

const halfWidth = (node: GraphNodeData) =>
  node.type === 'InvariantNode' ? 70 : node.type === 'EpochBoundaryNode' ? 55 : node.type === 'MutationNode' ? MUTATION_HALF_WIDTH : 75;

/** Smooth curve through the given points: horizontal hops sag slightly, vertical drops ease in and out. */
function smoothPath(points: Point[]): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1) {
      const sag = 26;
      d += ` C ${a.x + dx * 0.35} ${a.y + sag}, ${b.x - dx * 0.35} ${b.y + sag}, ${b.x} ${b.y}`;
    } else {
      d += ` C ${a.x} ${a.y + dy * 0.5}, ${b.x} ${b.y - dy * 0.5}, ${b.x} ${b.y}`;
    }
  }
  return d;
}

export const EvolutionGraphPreview: React.FC<EvolutionGraphPreviewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  highlightCausalChain,
  selectedEpoch,
  originMutationId = '',
  openIncidentId,
  componentMatchIds = null,
  activeInvariantFilter = 'ALL'
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  // The recorded history is wider than the viewport: bring the origin of the
  // causal chain (or the newest mutation) into view once per data set.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || nodes.length === 0) return;
    const target = nodes.find(n => n.id === originMutationId) ?? [...nodes].filter(n => n.type === 'MutationNode').sort((a, b) => b.x - a.x)[0];
    const key = `${target?.id ?? ''}:${nodes.length}`;
    if (!target || scrolledFor.current === key) return;
    scrolledFor.current = key;
    el.scrollLeft = Math.max(0, target.x * zoom - 160);
  }, [nodes, originMutationId, zoom]);

  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  /** Causal chain from the data: flagged nodes plus every invariant that is no longer holding. */
  const causalChainNodeIds = useMemo(
    () =>
      new Set(
        nodes
          .filter(n => n.isCausalChain || (n.type === 'InvariantNode' && n.status !== undefined && n.status !== 'HOLDING'))
          .map(n => n.id)
      ),
    [nodes]
  );

  const layout = useMemo(() => {
    const boundaryNodes = nodes.filter(n => n.type === 'EpochBoundaryNode').sort((a, b) => a.x - b.x);

    // One lane per epoch boundary, its label truncated to fit the gap to its neighbours.
    const lanes = boundaryNodes.map((node, idx) => {
      const prevGap = idx > 0 ? node.x - boundaryNodes[idx - 1].x : Infinity;
      const nextGap = idx < boundaryNodes.length - 1 ? boundaryNodes[idx + 1].x - node.x : Infinity;
      const gap = Math.min(prevGap, nextGap);
      const maxChars = Number.isFinite(gap) ? Math.max(6, Math.min(28, Math.floor((gap - 12) / LANE_CHAR_WIDTH))) : 28;
      const text = node.sublabel ? `${node.label}: ${node.sublabel}` : node.label;
      return { id: node.id, x: node.x, label: truncate(text.toUpperCase(), maxChars) };
    });

    let minLeft = Infinity;
    let maxRight = -Infinity;
    for (const n of nodes) {
      minLeft = Math.min(minLeft, n.x - halfWidth(n));
      maxRight = Math.max(maxRight, n.x + halfWidth(n));
    }
    for (const lane of lanes) {
      const half = (lane.label.length * LANE_CHAR_WIDTH) / 2;
      minLeft = Math.min(minLeft, lane.x - half);
      maxRight = Math.max(maxRight, lane.x + half);
    }

    // Shift the drawing right when the leftmost node or lane label would be clipped.
    const offsetX = nodes.length > 0 ? Math.max(0, Math.ceil(12 - minLeft)) : 0;
    const maxNodeX = nodes.reduce((m, n) => Math.max(m, n.x), 0);
    const width = Math.ceil(Math.max(MIN_WIDTH, maxNodeX + 120 + offsetX, Number.isFinite(maxRight) ? maxRight + offsetX + 12 : 0));

    // Intended baseline: first to last mutation.
    const mutationNodes = nodes.filter(n => n.type === 'MutationNode').sort((a, b) => a.x - b.x);
    const baseline =
      mutationNodes.length > 0 ? { x1: mutationNodes[0].x, x2: mutationNodes[mutationNodes.length - 1].x, y: 210 } : null;

    // Drift path: bottom-centres of the causal mutations, ending at the open incident's top.
    const driftPoints: Point[] = mutationNodes.filter(n => n.isCausalChain).map(n => ({ x: n.x, y: n.y + 28 }));
    const incidentNode = openIncidentId ? nodes.find(n => n.type === 'IncidentNode' && n.id === openIncidentId) : undefined;
    if (incidentNode) driftPoints.push({ x: incidentNode.x, y: incidentNode.y - 25 });
    const driftPath = driftPoints.length >= 2 ? smoothPath(driftPoints) : null;
    const driftLabelText = '▲ ARCHITECTURAL DRIFT DIVERGENCE PATH';
    const driftLabel = driftPath
      ? { x: Math.max(8, driftPoints[0].x - 10), y: 250, w: driftLabelText.length * 5.4 }
      : null;

    // Edge labels, nudged down when they would overlap one another or the drift label.
    const placed: { x: number; y: number; w: number }[] = [];
    if (driftLabel) placed.push({ x: driftLabel.x + driftLabel.w / 2, y: driftLabel.y, w: driftLabel.w });
    const edgeLabels = new Map<string, Point>();
    for (const edge of edges) {
      if (!edge.label) continue;
      const s = nodeById.get(edge.source);
      const t = nodeById.get(edge.target);
      if (!s || !t) continue;
      // Sequential links between neighbouring mutations sit under the boxes; their label is noise.
      if (s.type === 'MutationNode' && t.type === 'MutationNode' && Math.abs(s.y - t.y) < 1) continue;
      const w = edge.label.length * 5.1 + 6;
      const x = (s.x + t.x) / 2;
      let y = (s.y + t.y) / 2 - 6;
      for (let guard = 0; guard < 8 && placed.some(p => Math.abs(p.x - x) < (p.w + w) / 2 && Math.abs(p.y - y) < 10); guard++) {
        y += 11;
      }
      placed.push({ x, y, w });
      edgeLabels.set(edge.id, { x, y });
    }

    return { lanes, offsetX, width, baseline, driftPath, driftLabel, driftLabelText, edgeLabels };
  }, [nodes, edges, nodeById, openIncidentId]);

  const { lanes, offsetX, width, baseline, driftPath, driftLabel, driftLabelText, edgeLabels } = layout;

  return (
    <div className="relative w-full h-[560px] rounded-sm border border-zinc-800/80 bg-[#06070a] mission-grid overflow-hidden flex flex-col justify-between font-mono select-none shadow-sm">
      {/* Top Workspace Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#08090d]/90 backdrop-blur border-b border-zinc-800/80 z-10 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-live" />
            Evolution Graph Topology
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-300 text-[11px] font-bold">
            ACTIVE EPOCH: {pad2(selectedEpoch)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(z => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))}
              disabled={zoom >= ZOOM_MAX}
              className="btn-control p-1 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))}
              disabled={zoom <= ZOOM_MIN}
              className="btn-control p-1 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="btn-control p-1 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              title="Reset View"
              aria-label="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Interactive Graph Workspace */}
      <div ref={scrollRef} className={`relative flex-1 w-full overflow-x-auto ${zoom > 1 ? 'overflow-y-auto' : 'overflow-y-hidden'} p-4`}>
        <svg
          className="select-none"
          style={{ width: width * zoom, height: SVG_HEIGHT * zoom }}
          viewBox={`0 0 ${width} ${SVG_HEIGHT}`}
        >
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3f3f46" />
            </marker>
            <marker
              id="arrow-causal"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          {nodes.length === 0 && (
            <text
              x={width / 2}
              y={SVG_HEIGHT / 2}
              fill="#71717a"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
              letterSpacing="1"
            >
              NO EVOLUTION GRAPH RECORDED YET
            </text>
          )}

          <g transform={`translate(${offsetX}, 0)`}>
            {/* Temporal Vertical Epoch Separators: one lane per recorded epoch boundary */}
            {lanes.map(lane => (
              <g key={lane.id}>
                <line
                  x1={lane.x}
                  y1="10"
                  x2={lane.x}
                  y2="440"
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <text
                  x={lane.x}
                  y="24"
                  fill="#71717a"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  letterSpacing="1"
                  fontWeight="bold"
                >
                  {lane.label}
                </text>
              </g>
            ))}

            {/* Trajectory Divergence Path (Normal vs Drift) */}
            <g opacity={highlightCausalChain ? 1 : 0.45}>
              {/* Intended Architecture Baseline */}
              {baseline && (
                <>
                  <path
                    d={`M ${baseline.x1} ${baseline.y} L ${baseline.x2} ${baseline.y}`}
                    fill="none"
                    stroke="#3f3f46"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                  <text
                    x={baseline.x2 + 5}
                    y={baseline.y - 5}
                    fill="#71717a"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    INTENDED BASELINE
                  </text>
                </>
              )}

              {/* Drift Divergence Trajectory through the candidate causal chain */}
              {driftPath && driftLabel && (
                <>
                  <path
                    d={driftPath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    className={highlightCausalChain ? 'animate-edge-flow' : ''}
                    opacity="0.95"
                  />
                  <text
                    x={driftLabel.x}
                    y={driftLabel.y}
                    fill="#fb7185"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="animate-pulse"
                  >
                    {driftLabelText}
                  </text>
                </>
              )}
            </g>

            {/* Render Graph Edges with dynamic highlights */}
            {edges.map(edge => {
              const sourceNode = nodeById.get(edge.source);
              const targetNode = nodeById.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const isCausalActive = highlightCausalChain && edge.isCausal;
              const strokeColor = isCausalActive
                ? '#f43f5e'
                : edge.style === 'success'
                ? '#10b981'
                : edge.style === 'warning'
                ? '#f59e0b'
                : edge.style === 'critical'
                ? '#e11d48'
                : edge.style === 'dashed'
                ? '#f59e0b'
                : '#3f3f46';

              const strokeDash = edge.style === 'dashed' ? '4 4' : 'none';
              const strokeWidth = isCausalActive ? 2.5 : 1.2;

              const deltaX = targetNode.x - sourceNode.x;
              const controlPoint1X = sourceNode.x + deltaX * 0.5;
              const controlPoint1Y = sourceNode.y;
              const controlPoint2X = sourceNode.x + deltaX * 0.5;
              const controlPoint2Y = targetNode.y;

              const pathData = `M ${sourceNode.x} ${sourceNode.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetNode.x} ${targetNode.y}`;
              const labelPos = edgeLabels.get(edge.id);

              return (
                <g key={edge.id} className="transition-all duration-300">
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    className={isCausalActive ? 'animate-edge-flow' : ''}
                    markerEnd={isCausalActive ? 'url(#arrow-causal)' : 'url(#arrow-default)'}
                  />
                  {edge.label && labelPos && (
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      fill={isCausalActive ? '#fda4af' : '#71717a'}
                      fontSize="8.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Custom Nodes with Focus and Stagger */}
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isCausal = causalChainNodeIds.has(node.id);

              // Filters from the rail: component, epoch scrubber and invariant health.
              const isFilteredOut =
                (node.type === 'MutationNode' &&
                  ((componentMatchIds !== null && !componentMatchIds.has(node.id)) || node.epoch > selectedEpoch)) ||
                (node.type === 'InvariantNode' && activeInvariantFilter !== 'ALL' && node.status !== activeInvariantFilter);
              const isFaded = !isSelected && !isHovered && (isFilteredOut || (highlightCausalChain && !isCausal));

              const nodeOpacity = isFaded ? (isFilteredOut ? 0.2 : 0.35) : 1;

              // InvariantNode
              if (node.type === 'InvariantNode') {
                const statusColor =
                  node.status === 'HOLDING'
                    ? '#10b981'
                    : node.status === 'WEAKENED'
                    ? '#f59e0b'
                    : '#f43f5e';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x - 70}, ${node.y - 24})`}
                    onClick={() => onSelectNode(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer transition-all duration-200"
                    opacity={nodeOpacity}
                  >
                    <title>{node.sublabel ? `${node.label}: ${node.sublabel}` : node.label}</title>
                    <rect
                      width="140"
                      height="48"
                      rx="2"
                      fill={isSelected ? '#151522' : '#0b0c10'}
                      stroke={isSelected ? '#38bdf8' : isCausal ? '#f59e0b' : '#27272a'}
                      strokeWidth={isSelected ? '2.5' : '1'}
                      className={isSelected ? 'filter drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : ''}
                    />
                    <circle cx="16" cy="18" r="4" fill={statusColor} className={node.status !== 'HOLDING' ? 'animate-pulse' : ''} />
                    <text
                      x="28"
                      y="21"
                      fill="#f4f4f5"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.label}
                    </text>
                    <text
                      x="16"
                      y="36"
                      fill="#a1a1aa"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {node.status}
                    </text>
                  </g>
                );
              }

              // IncidentNode
              if (node.type === 'IncidentNode') {
                const isResolved = (node.status ?? '').toUpperCase() === 'RESOLVED';
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x - 75}, ${node.y - 25})`}
                    onClick={() => onSelectNode(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer transition-all duration-200"
                    opacity={nodeOpacity}
                  >
                    <title>{node.sublabel ? `${node.label}: ${node.sublabel}` : node.label}</title>
                    <rect
                      width="150"
                      height="52"
                      rx="2"
                      fill={isResolved ? (isSelected ? '#0b1a13' : '#07110c') : isSelected ? '#20090d' : '#14080a'}
                      stroke={isResolved ? (isSelected ? '#34d399' : '#10b981') : isSelected ? '#fb7185' : '#e11d48'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      className={
                        isResolved
                          ? 'filter drop-shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                          : 'filter drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                      }
                    />
                    <text
                      x="14"
                      y="20"
                      fill={isResolved ? '#6ee7b7' : '#fda4af'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.severity ? `${node.label} [${node.severity}]` : node.label}
                    </text>
                    <text
                      x="14"
                      y="36"
                      fill={isResolved ? '#10b981' : '#f43f5e'}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.status ? node.status : truncate(node.sublabel ?? '', 22)}
                    </text>
                  </g>
                );
              }

              // EpochBoundaryNode
              if (node.type === 'EpochBoundaryNode') {
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x - 55}, ${node.y})`}
                    onClick={() => onSelectNode(node.id)}
                    className="cursor-pointer transition-transform duration-150"
                  >
                    <title>{node.sublabel ? `${node.label}: ${node.sublabel}` : node.label}</title>
                    <rect
                      width="110"
                      height="28"
                      rx="2"
                      fill={isSelected ? '#27272a' : '#18181b'}
                      stroke={isSelected ? '#38bdf8' : '#3f3f46'}
                      strokeWidth={isSelected ? '2' : '1'}
                    />
                    <text
                      x="55"
                      y="17"
                      fill="#f4f4f5"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              }

              // MutationNode
              const isOrigin = originMutationId !== '' && node.id === originMutationId;
              const statusLine = isOrigin
                ? 'EARLIEST PLAUSIBLE CAUSE'
                : `${node.status ?? ''}${node.severity ? ` · ${node.severity}` : ''}`;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x - MUTATION_HALF_WIDTH}, ${node.y - 28})`}
                  onClick={() => onSelectNode(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer transition-all duration-200"
                  opacity={nodeOpacity}
                >
                  <title>{node.sublabel ? `${node.label}: ${node.sublabel}` : node.label}</title>
                  <rect
                    width={MUTATION_HALF_WIDTH * 2}
                    height="56"
                    rx="2"
                    fill={
                      isSelected
                        ? '#14141d'
                        : isOrigin
                        ? '#161009'
                        : '#090a0f'
                    }
                    stroke={
                      isSelected
                        ? '#38bdf8'
                        : isOrigin
                        ? '#f59e0b'
                        : isCausal
                        ? '#f43f5e'
                        : '#27272a'
                    }
                    strokeWidth={isSelected ? '2.5' : isOrigin || isCausal ? '1.8' : '1'}
                    className={isSelected ? 'filter drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]' : isOrigin ? 'filter drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' : ''}
                  />
                  <text
                    x="14"
                    y="20"
                    fill={isOrigin ? '#fef08a' : '#f4f4f5'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.label}
                  </text>
                  <text
                    x="14"
                    y="34"
                    fill="#a1a1aa"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {truncate(node.sublabel ?? '', 22)}
                  </text>
                  <text
                    x="14"
                    y="48"
                    fill={isOrigin ? '#f59e0b' : '#71717a'}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {statusLine}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Technical Legend */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#06070a] border-t border-zinc-800/80 text-[10px] text-zinc-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500" />
            <span className="text-zinc-300">Earliest Plausible Contributor{originMutationId ? ` (${originMutationId})` : ''}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500" />
            <span className="text-zinc-300">Downstream Incident{openIncidentId ? ` (${openIncidentId})` : ''}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-rose-500" />
            <span className="text-zinc-300">Candidate Causal Propagation</span>
          </span>
        </div>
        <div className="text-zinc-500">
          Click any node to inspect context in the right inspector
        </div>
      </div>
    </div>
  );
};
