import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { shortSha, useHealth } from '../../hooks/useHealth';
import { useStreamStatus } from '../../hooks/useApi';

interface TopBarProps {
  activeTitle?: string;
  activeDriftCount?: number;
  /** e.g. the invariant the open drift violates. */
  driftLabel?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeDriftCount = 0,
  driftLabel
}) => {
  const [tickerTime, setTickerTime] = useState<string>('');
  const { health } = useHealth();
  const streamStatus = useStreamStatus();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTickerTime(
        now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#08090d] border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 font-mono select-none">
      {/* Zone 1: Identity & System Metadata */}
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider text-zinc-100 uppercase">
            EPOCH
          </span>
          <span className="text-zinc-600">//</span>
          <span className="text-[11px] text-zinc-400 uppercase tracking-widest hidden sm:inline">
            MISSION CONTROL
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800 hidden md:block" />

        <div className="hidden lg:flex items-center gap-3 text-[11px]">
          <div>
            <span className="text-zinc-500">System: </span>
            <span className="text-zinc-200 font-medium">Payments service (sample-app)</span>
          </div>
          <span className="text-zinc-700">·</span>
          <div title={health?.sampleRepo?.head ?? 'Sample repository not initialised'}>
            <span className="text-zinc-500">HEAD: </span>
            <span className="text-zinc-300">{health?.sampleRepo ? shortSha(health.sampleRepo.head) : '—'}</span>
          </div>
          <span className="text-zinc-700">·</span>
          <div>
            <span className="text-zinc-500">Mode: </span>
            <span className="text-zinc-400">{health ? (health.demo.mode === 'public' ? 'PUBLIC DEMO' : 'LOCAL') : 'API OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Real-time Command & Fabric Indicators */}
      <div className="flex items-center gap-2.5 sm:gap-4 text-[10px]">
        {/* Real-time timestamp */}
        <div className="hidden xl:block text-zinc-400 text-[10px] tabular-nums">
          {tickerTime}
        </div>

        <div className="h-4 w-px bg-zinc-800 hidden xl:block" />

        {/* Operational Status Dots (Restrained, calm) */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-400">
          <div className="flex items-center gap-1.5" title={`Server-Sent Events: ${streamStatus}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${streamStatus === 'live' ? 'bg-emerald-400 animate-pulse-live' : streamStatus === 'offline' ? 'bg-rose-400' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline text-zinc-200 font-medium">
              {streamStatus === 'live' ? 'LIVE EVENTS' : streamStatus === 'offline' ? 'STREAM OFFLINE' : 'CONNECTING'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5" title="WEAVE execution plane">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-zinc-400">WEAVE</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5" title="IBM Bob, the implementer">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-zinc-400">BOB</span>
          </div>

          <div className="flex items-center gap-1.5" title="EPOCH evolutionary sentinel">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-amber-400/90 font-medium">EPOCH</span>
          </div>
        </div>

        {/* Drift Callout button with subtle hover transition */}
        {activeDriftCount > 0 && (
          <NavLink
            to="/trajectory"
            className="btn-control flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10px]"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-semibold">DRIFT:</span>
            <span>{driftLabel ?? `${activeDriftCount} OPEN`}</span>
          </NavLink>
        )}
      </div>
    </header>
  );
};
