import React, { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PublicDemoBanner } from './PublicDemoBanner';
import { useApi } from '../../hooks/useApi';
import type { DriftFinding } from '../../types';

const BACKDROPS = [
  // 0: CURRENT: dark graphite + restrained operational green
  'radial-gradient(ellipse 95% 65% at 50% -15%, rgba(16, 185, 129, 0.14) 0%, rgba(16, 185, 129, 0.04) 45%, transparent 75%), radial-gradient(ellipse 60% 40% at 90% 90%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)',
  // 1: HISTORY: dark graphite + restrained archaeological amber/orange
  'radial-gradient(ellipse 95% 65% at 50% -15%, rgba(245, 158, 11, 0.13) 0%, rgba(245, 158, 11, 0.035) 45%, transparent 75%), radial-gradient(ellipse 60% 40% at 90% 90%, rgba(245, 158, 11, 0.035) 0%, transparent 60%)',
  // 2: TRAJECTORY: dark graphite + restrained structural blue/cyan
  'radial-gradient(ellipse 95% 65% at 50% -15%, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0.04) 45%, transparent 75%), radial-gradient(ellipse 60% 40% at 90% 90%, rgba(56, 189, 248, 0.04) 0%, transparent 60%)',
  // 3: FUTURES: dark graphite + restrained counterfactual violet/indigo
  'radial-gradient(ellipse 95% 65% at 50% -15%, rgba(168, 85, 247, 0.14) 0%, rgba(168, 85, 247, 0.04) 45%, transparent 75%), radial-gradient(ellipse 60% 40% at 90% 90%, rgba(168, 85, 247, 0.04) 0%, transparent 60%)'
];

const GRID_TINTS = [
  'rgba(16, 185, 129, 0.032)', // 0: CURRENT
  'rgba(245, 158, 11, 0.03)',   // 1: HISTORY
  'rgba(56, 189, 248, 0.035)',  // 2: TRAJECTORY
  'rgba(168, 85, 247, 0.032)'   // 3: FUTURES
];

export const ConsoleLayout: React.FC = () => {
  const location = useLocation();

  const getLensIndex = (pathname: string): number => {
    if (pathname.startsWith('/history')) return 1;
    if (pathname.startsWith('/trajectory')) return 2;
    if (pathname.startsWith('/futures')) return 3;
    return 0; // CURRENT
  };

  const currentIndex = getLensIndex(location.pathname);

  // Open drift drives the DRIFT badge and the top-bar callout.
  const { data: driftData } = useApi<DriftFinding[]>('/api/v1/trajectory/drift-findings?activeOnly=true', ['drift', 'mutation']);
  const openDrift = driftData ?? [];
  const worst = openDrift.find(d => d.severity === 'CRITICAL') ?? openDrift[0];
  const driftLabel = worst ? `${worst.violatedInvariantId || worst.id}${openDrift.length > 1 ? ` +${openDrift.length - 1}` : ''}` : undefined;
  const prevIndexRef = useRef<number>(currentIndex);
  const isForward = currentIndex >= prevIndexRef.current;
  prevIndexRef.current = currentIndex;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050608] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white relative">
      {/* =========================================================
          STABLE LIVE BACKGROUND INFRASTRUCTURE (100% GPU Accelerated)
          ========================================================= */}

      {/* Layer 1: Continuous Moving Technical Grid */}
      <div className="absolute inset-0 live-moving-grid pointer-events-none opacity-85 z-0" />

      {/* Layer 2: Pre-rendered Subtle Lens Grid Tints (Instant GPU Opacity Crossfade) */}
      {GRID_TINTS.map((tint, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ease-out z-0 ${
            currentIndex === idx ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundColor: tint }}
        />
      ))}

      {/* Layer 3: Slow Sweeping Technical Scan Bar */}
      <div className="live-scan-bar" />

      {/* Layer 4: Pre-rendered Lens Lighting Backdrops (Instant GPU Opacity Crossfade, 0% CPU) */}
      {BACKDROPS.map((bg, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ease-out z-0 ${
            currentIndex === idx ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: bg }}
        />
      ))}

      {/* Layer 5: Technical Telemetry Data Tracks & Flowing Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-35">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* High-Elevation Data Bus */}
          <line x1="0" y1="90" x2="100%" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="6 12" />
          <circle cx="0" cy="90" r="2" fill="#38bdf8" className="particle-runner-x" />

          {/* Mid-Elevation Secondary Bus */}
          <line x1="0" y1="380" x2="100%" y2="380" stroke="rgba(255,255,255,0.04)" strokeDasharray="8 16" />
          <circle cx="0" cy="380" r="2" fill="#10b981" className="particle-runner-x-delayed" />

          {/* Lower Diagnostic Bus */}
          <line x1="0" y1="720" x2="100%" y2="720" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 8" />
          <circle cx="0" cy="720" r="2" fill="#38bdf8" className="particle-runner-x" />

          {/* Vertical Diagnostic Stems */}
          <line x1="420" y1="0" x2="420" y2="100%" stroke="rgba(255,255,255,0.03)" strokeDasharray="6 12" />
          <circle cx="420" cy="0" r="2" fill="#f59e0b" className="particle-runner-y" />

          <line x1="1120" y1="0" x2="1120" y2="100%" stroke="rgba(255,255,255,0.03)" strokeDasharray="6 12" />
          <circle cx="1120" cy="0" r="2" fill="#38bdf8" className="particle-runner-y" />
        </svg>
      </div>

      {/* Distinct Slate Sidebar (Fast GPU Translate Rail & Opacity Cross-Fading) */}
      <Sidebar driftFindingCount={openDrift.length} />

      {/* Main Viewport Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Stable Command Console Top Bar */}
        <TopBar activeDriftCount={openDrift.length} driftLabel={driftLabel} />
        <PublicDemoBanner />

        {/* Viewport Content with Snappy 200ms Directional Transition */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 relative">
          <div
            key={location.pathname}
            className={`max-w-[1560px] mx-auto space-y-5 ${
              isForward ? 'lens-shift-forward' : 'lens-shift-reverse'
            }`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
