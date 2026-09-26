import React, { useState } from 'react';
import { GraphNodeData, GraphEdgeData } from '../../data/mock/trajectory';
import { GitCommit, AlertOctagon, ShieldCheck, Clock, ZoomIn, ZoomOut, Maximize2, Layers } from 'lucide-react';

interface EvolutionGraphPreviewProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  highlightCausalChain: boolean;
  selectedEpoch: number;
  componentFilter: string;
}

export const EvolutionGraphPreview: React.FC<EvolutionGraphPreviewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  highlightCausalChain,
  selectedEpoch,
  componentFilter
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const causalChainNodeIds = ['M-1042', 'M-1051', 'M-1077', 'INC-3312', 'INV-BOUND-04', 'INV-TIME-02'];

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
            ACTIVE EPOCH: 0{selectedEpoch}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[10px] text-zinc-400 bg-[#06070a] px-2.5 py-1 rounded-sm border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>TODO(IBM Bob: React Flow 12.x)</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="btn-control p-1 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              className="btn-control p-1 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
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
      <div className="relative flex-1 w-full overflow-x-auto overflow-y-hidden p-4">
        <svg
          className="w-[1140px] h-[460px] select-none"
          viewBox="0 0 1140 460"
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

          {/* Temporal Vertical Epoch Separators */}
          {[
            { epoch: 0, x: 80, label: 'EPOCH 00: BASELINE' },
            { epoch: 1, x: 320, label: 'EPOCH 01: ELIGIBILITY' },
            { epoch: 2, x: 560, label: 'EPOCH 02: BYPASS HOTFIX' },
            { epoch: 3, x: 800, label: 'EPOCH 03: DIRECT JOIN' },
            { epoch: 4, x: 1040, label: 'EPOCH 04: PRESENT' }
          ].map(lane => (
            <g key={lane.epoch}>
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
            <path
              d="M 80 200 L 320 200 L 560 200 L 800 200 L 1040 200"
              fill="none"
              stroke="#3f3f46"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <text
              x="1045"
              y="195"
              fill="#71717a"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              INTENDED BASELINE
            </text>

            {/* Drift Divergence Trajectory (Breaking off after M-1042) */}
            <path
              d="M 320 200 C 440 200, 480 240, 560 270 C 660 300, 720 270, 800 270 C 840 270, 860 200, 880 150"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              className={highlightCausalChain ? 'animate-edge-flow' : ''}
              opacity="0.95"
            />
            <text
              x="570"
              y="312"
              fill="#fb7185"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              className="animate-pulse"
            >
              ▲ ARCHITECTURAL DRIFT DIVERGENCE PATH
            </text>
          </g>

          {/* Render Graph Edges with dynamic highlights */}
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const isCausalActive = highlightCausalChain && edge.isCausal;
            const strokeColor = isCausalActive
              ? '#f43f5e'
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
                {edge.label && (
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2 - 6}
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
            const isCausal = causalChainNodeIds.includes(node.id);
            const isFaded = highlightCausalChain && !isCausal && !isSelected;

            const nodeOpacity = isFaded ? 0.35 : 1;

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
                  <rect
                    width="150"
                    height="52"
                    rx="2"
                    fill={isSelected ? '#20090d' : '#14080a'}
                    stroke={isSelected ? '#fb7185' : '#e11d48'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="filter drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                  />
                  <text
                    x="14"
                    y="20"
                    fill="#fda4af"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.label} [CRITICAL]
                  </text>
                  <text
                    x="14"
                    y="36"
                    fill="#f43f5e"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    $420k Frozen Purge
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
            const isOrigin = node.id === 'M-1042';
            return (
              <g
                key={node.id}
                transform={`translate(${node.x - 75}, ${node.y - 28})`}
                onClick={() => onSelectNode(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className="cursor-pointer transition-all duration-200"
                opacity={nodeOpacity}
              >
                <rect
                  width="150"
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
                  {isOrigin ? 'Chargeback 30d' : node.id === 'M-1051' ? 'Bypass Hotfix' : node.id === 'M-1077' ? 'Direct SQL Query' : 'Telemetry Sync'}
                </text>
                <text
                  x="14"
                  y="48"
                  fill={isOrigin ? '#f59e0b' : '#71717a'}
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {isOrigin ? 'PRECURSOR TO INCIDENT' : node.status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Technical Legend */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#06070a] border-t border-zinc-800/80 text-[10px] text-zinc-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500" />
            <span className="text-zinc-300">Earliest Plausible Contributor (M-1042)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500" />
            <span className="text-zinc-300">Downstream Incident (INC-3312)</span>
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
