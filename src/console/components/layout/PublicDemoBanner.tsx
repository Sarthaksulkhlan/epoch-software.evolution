import React, { useState } from 'react';
import { Globe, RotateCcw, Loader2 } from 'lucide-react';
import { apiPost, describeError } from '../../api/client';
import { refreshAll } from '../../api/live';
import { refreshHealth, useHealth } from '../../hooks/useHealth';

/** Slim banner for the hosted public demo (EPOCH_PUBLIC_DEMO=1): what a visitor can do, and a restore button. */
export const PublicDemoBanner: React.FC = () => {
  const { health } = useHealth();
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  if (health?.demo.mode !== 'public') return null;

  const building = health.demo.showcase === 'building';

  const restore = async () => {
    setIsRestoring(true);
    setMessage(null);
    try {
      await apiPost('/api/demo/showcase');
      setMessage({ tone: 'ok', text: 'Demo restored.' });
      refreshAll();
    } catch (error) {
      setMessage({ tone: 'error', text: describeError(error, 'restore') });
    } finally {
      setIsRestoring(false);
      void refreshHealth();
    }
  };

  return (
    <div className="shrink-0 px-4 sm:px-6 py-1.5 bg-[#0b0f1a] border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] z-20">
      <div className="flex items-center gap-2 text-cyan-200">
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Public demo: adopt a future and approve it; everything else is read-only</span>
        {health.demo.restoresAfterIdleMinutes && (
          <span className="hidden md:inline text-zinc-500">· restores itself after {health.demo.restoresAfterIdleMinutes} idle minutes</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {message && (
          <span className={message.tone === 'ok' ? 'text-emerald-400' : 'text-amber-300'}>{message.text}</span>
        )}
        {building && !isRestoring && <span className="text-amber-300">Preparing the showcase…</span>}
        <button
          type="button"
          onClick={() => void restore()}
          disabled={isRestoring || building}
          className="btn-control flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-wait border border-zinc-700 text-zinc-200 uppercase tracking-wider text-[10px]"
        >
          {isRestoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          <span>{isRestoring ? 'Restoring…' : 'Restore demo'}</span>
        </button>
      </div>
    </div>
  );
};
