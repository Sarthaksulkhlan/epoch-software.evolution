import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  GitCommit,
  Compass,
  GitBranch,
  FileText,
  Cpu
} from 'lucide-react';
import { shortSha, useHealth } from '../../hooks/useHealth';
import { useStreamStatus } from '../../hooks/useApi';

interface SidebarProps {
  driftFindingCount?: number;
}

const LENS_THEMES = [
  {
    // CURRENT (0): Green
    railBorder: 'border-emerald-500/50',
    railBg: 'bg-gradient-to-r from-emerald-950/60 via-[#101c24] to-[#0d161d]',
    edgeBg: 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]',
    glow: 'shadow-[0_0_14px_rgba(16,185,129,0.15)]',
    activeText: 'text-emerald-300 font-bold',
    activeIcon: 'text-emerald-400',
    activeSub: 'text-emerald-400/80'
  },
  {
    // HISTORY (1): Yellow / Amber
    railBorder: 'border-amber-500/50',
    railBg: 'bg-gradient-to-r from-amber-950/60 via-[#211a12] to-[#14100c]',
    edgeBg: 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.7)]',
    glow: 'shadow-[0_0_14px_rgba(245,158,11,0.15)]',
    activeText: 'text-amber-300 font-bold',
    activeIcon: 'text-amber-400',
    activeSub: 'text-amber-400/80'
  },
  {
    // TRAJECTORY (2): Blue / Cyan
    railBorder: 'border-cyan-500/50',
    railBg: 'bg-gradient-to-r from-cyan-950/60 via-[#101d2c] to-[#0c1520]',
    edgeBg: 'bg-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.7)]',
    glow: 'shadow-[0_0_14px_rgba(56,189,248,0.15)]',
    activeText: 'text-cyan-300 font-bold',
    activeIcon: 'text-cyan-400',
    activeSub: 'text-cyan-400/80'
  },
  {
    // FUTURES (3): Purple / Violet
    railBorder: 'border-violet-500/50',
    railBg: 'bg-gradient-to-r from-violet-950/60 via-[#1a1329] to-[#120d1c]',
    edgeBg: 'bg-violet-400 shadow-[0_0_10px_rgba(168,85,247,0.7)]',
    glow: 'shadow-[0_0_14px_rgba(168,85,247,0.15)]',
    activeText: 'text-violet-300 font-bold',
    activeIcon: 'text-violet-400',
    activeSub: 'text-violet-400/80'
  },
  {
    // REPORT (4): Orange
    railBorder: 'border-orange-500/50',
    railBg: 'bg-gradient-to-r from-orange-950/60 via-[#1c1208] to-[#130d05]',
    edgeBg: 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.7)]',
    glow: 'shadow-[0_0_14px_rgba(251,146,60,0.15)]',
    activeText: 'text-orange-300 font-bold',
    activeIcon: 'text-orange-400',
    activeSub: 'text-orange-400/80'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ driftFindingCount = 0 }) => {
  const location = useLocation();
  const { health, error: healthError, latencyMs } = useHealth();
  const streamStatus = useStreamStatus();
  const apiUp = Boolean(health) && !healthError;

  const navItems = [
    {
      to: '/',
      label: 'CURRENT',
      descriptor: 'Workflow Lifecycle',
      icon: Activity,
      end: true
    },
    {
      to: '/history',
      label: 'HISTORY',
      descriptor: 'Temporal Lineage',
      icon: GitCommit,
      end: false
    },
    {
      to: '/trajectory',
      label: 'TRAJECTORY',
      descriptor: 'Evolution & Drift',
      icon: Compass,
      end: false,
      badge: driftFindingCount > 0 ? 'DRIFT' : undefined
    },
    {
      to: '/futures',
      label: 'FUTURES',
      descriptor: 'Counterfactuals',
      icon: GitBranch,
      end: false
    },
    {
      to: '/report',
      label: 'REPORT',
      descriptor: 'Evolution Report',
      icon: FileText,
      end: false
    }
  ];

  // Calculate active index for stable gliding illuminated indicator
  const getActiveIndex = () => {
    const path = location.pathname;
    if (path.startsWith('/history')) return 1;
    if (path.startsWith('/trajectory')) return 2;
    if (path.startsWith('/futures')) return 3;
    if (path.startsWith('/report')) return 4;
    return 0; // default to CURRENT
  };

  const activeIndex = getActiveIndex();
  const currentTheme = LENS_THEMES[activeIndex] || LENS_THEMES[0];

  return (
    <aside
      aria-label="EPOCH console navigation"
      className="w-64 bg-gradient-to-b from-[#0c1017] via-[#090d14] to-[#0c1017] border-r border-[#1a2333] shadow-[4px_0_24px_rgba(0,0,0,0.6)] flex flex-col justify-between shrink-0 select-none z-30 relative"
    >
      <div>
        {/* Distinct Header Surface */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#1a2333] bg-[#0e1420]/90 backdrop-blur">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded-sm bg-gradient-to-b from-[#1b2538] to-[#101724] border border-[#263550] flex items-center justify-center text-zinc-300 group-hover:border-cyan-400/80 group-hover:text-cyan-300 transition-colors duration-150 shadow-inner">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold tracking-[0.16em] font-mono text-zinc-100 flex items-center gap-1.5 leading-none">
                <span>EPOCH</span>
                <span className="text-[8px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#131b2c] border border-[#212f4c] text-zinc-400 tracking-wider">
                  CTRL
                </span>
              </div>
              <div className="text-[9px] font-mono tracking-[0.18em] uppercase text-zinc-400 font-medium mt-0.5 leading-none">
                Evolution Plane
              </div>
            </div>
          </NavLink>

          <div className="flex items-center gap-1.5 text-[9px] font-mono font-semibold tracking-wider text-emerald-400/90 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-live" />
            <span className="text-zinc-300">SYNC</span>
          </div>
        </div>

        {/* Distinct Target System Specification Inset Panel */}
        <div className="px-4 py-3 border-b border-[#1a2333] bg-[#0f1624]/70">
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 uppercase tracking-[0.18em] font-semibold mb-1">
            <span>Target Subsystem</span>
            <span
              className="text-zinc-300 font-mono font-semibold bg-[#162136] px-1.5 py-0.2 rounded border border-[#243555] text-[9px]"
              title={health?.sampleRepo?.head ?? 'HEAD unknown'}
            >
              {health?.sampleRepo ? shortSha(health.sampleRepo.head) : '—'}
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-100 truncate flex items-center gap-1.5 tracking-tight font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shrink-0" />
            <span className="truncate">Payments service (sample-app)</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-400/90 truncate mt-0.5 pl-3 tracking-tight">
            {health?.sampleRepo ? `branch ${health.sampleRepo.branch}` : healthError ? 'API unreachable' : 'sample repo not initialised'}
          </div>
        </div>

        {/* Operational Lenses Rail with 100% GPU-Accelerated Hardware Rail & Opacity Cross-Fading */}
        <nav aria-label="Operational lenses" className="p-2 space-y-1 relative">
          <div className="px-2 pt-2.5 pb-1.5 text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-400 font-semibold flex items-center justify-between">
            <span>Operational Lenses</span>
            <span className="text-[9px] text-zinc-500 font-mono tracking-wider">5 PLANES</span>
          </div>

          {/* Gliding Rail: Uses GPU translate3d with ZERO layout reflow */}
          <div
            className="absolute left-2 right-2 rounded-sm pointer-events-none z-0"
            style={{
              top: '34px',
              height: '46px',
              transform: `translate3d(0, ${activeIndex * 52}px, 0)`,
              transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform'
            }}
          >
            {/* 4 Pre-rendered Theme Layers: Pure GPU Opacity Crossfade (Instant color transition from purple to green) */}
            {LENS_THEMES.map((theme, i) => (
              <div
                key={i}
                className={`absolute inset-0 rounded-sm border ${theme.railBorder} ${theme.railBg} ${theme.glow} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_12px_rgba(0,0,0,0.5)] transition-opacity duration-200 ease-out ${
                  activeIndex === i ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${theme.edgeBg}`} />
              </div>
            ))}
          </div>

          {/* Nav Links */}
          <div className="space-y-1.5 relative z-10">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeIndex === idx;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors duration-150 h-[46px] group ${
                    isActive
                      ? 'text-zinc-100 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#131b29]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                        isActive
                          ? currentTheme.activeIcon
                          : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    />
                    <div className="min-w-0">
                      <span
                        className={`block font-mono text-[11px] leading-tight transition-all duration-150 ${
                          isActive
                            ? `${currentTheme.activeText} font-bold tracking-[0.16em]`
                            : 'text-zinc-300 tracking-[0.12em] group-hover:text-zinc-100 group-hover:translate-x-0.5'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span
                        className={`block text-[10px] font-sans font-normal truncate transition-colors duration-150 leading-tight mt-0.5 ${
                          isActive ? currentTheme.activeSub : 'text-zinc-500 group-hover:text-zinc-400'
                        }`}
                      >
                        {item.descriptor}
                      </span>
                    </div>
                  </div>

                  {/* Restored previous visual style with slow, calm breathing pulse */}
                  {item.badge && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/50 tracking-wider font-bold animate-pulse-warn-slow shrink-0 ml-1">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Distinct Engineering Fabric Telemetry Footer */}
      <div className="p-3 border-t border-[#1a2333] bg-[#0c121e]/95 backdrop-blur space-y-2 font-mono text-[10px]">
        <div className="flex items-center justify-between text-zinc-400 tracking-[0.18em] uppercase text-[9px] font-semibold">
          <span>System Status</span>
          <span className={`flex items-center gap-1.5 font-semibold px-1.5 py-0.5 rounded border ${apiUp ? 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20' : 'text-rose-400 bg-rose-950/30 border-rose-500/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${apiUp ? 'bg-emerald-400 animate-pulse-live' : 'bg-rose-400'}`} />
            {apiUp ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        <div className="space-y-1 pt-1 text-zinc-400">
          <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-[#151f30]/60 transition-colors">
            <span className="text-zinc-500">API</span>
            <span className={`font-mono text-[9px] ${apiUp ? 'text-zinc-300' : 'text-rose-400'}`}>{apiUp ? 'CONNECTED' : 'UNREACHABLE'}</span>
          </div>
          <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-[#151f30]/60 transition-colors">
            <span className="text-zinc-500">EVENT STREAM</span>
            <span className="text-zinc-300 font-mono text-[9px]">{streamStatus.toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-[#151f30]/60 transition-colors">
            <span className="text-zinc-500">EPOCH</span>
            <span className="text-amber-400/90 font-medium font-mono text-[9px]">
              {health?.demo.mode === 'public' ? `PUBLIC DEMO · ${health.demo.showcase.toUpperCase()}` : 'MONITORING'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#1a2333] text-[9px] text-zinc-500 flex items-center justify-between">
          <span>LATENCY: <strong className="text-zinc-400 font-normal">{latencyMs !== undefined && apiUp ? `${latencyMs}ms` : '—'}</strong></span>
          <span>MUTATIONS: <strong className="text-zinc-400 font-normal">{health?.mutations ?? '—'}</strong></span>
        </div>
      </div>
    </aside>
  );
};
