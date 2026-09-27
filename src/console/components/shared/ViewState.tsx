import React from 'react';
import { AlertTriangle, Loader2, Inbox, RotateCcw } from 'lucide-react';
import { ApiError, START_API_HINT, describeError } from '../../api/client';

interface ViewStateProps {
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: React.ReactNode;
  error?: unknown;
  onRetry?: () => void;
  children?: React.ReactNode;
}

/** Loading, empty and error panels shared by every lens. */
export const ViewState: React.FC<ViewStateProps> = ({ kind, title, message, error, onRetry, children }) => {
  const unreachable = error instanceof ApiError && error.unreachable;
  const tone =
    kind === 'error'
      ? 'border-rose-500/40 bg-[#12080a] text-rose-200'
      : 'border-zinc-800/80 bg-[#08090d]/90 text-zinc-300';

  return (
    <div className={`reveal-delay-1 rounded-sm border ${tone} p-6 font-mono select-none flex flex-col items-center text-center gap-2.5`}>
      {kind === 'loading' && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
      {kind === 'empty' && <Inbox className="w-5 h-5 text-zinc-500" />}
      {kind === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}

      <div className="text-xs font-bold uppercase tracking-widest">
        {title ?? (kind === 'loading' ? 'Loading from the EPOCH API…' : kind === 'empty' ? 'Nothing recorded yet' : unreachable ? 'EPOCH API unreachable' : 'The EPOCH API returned an error')}
      </div>

      <div className="font-sans text-xs text-zinc-400 max-w-xl leading-relaxed">
        {message ?? (kind === 'error' ? (unreachable ? (
          <>
            The console could not reach the API. {START_API_HINT} (the API listens on port 3000; Vite proxies <code className="font-mono text-zinc-300">/api</code> to it).
          </>
        ) : describeError(error)) : null)}
      </div>

      {children}

      {onRetry && kind === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-control mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-sm uppercase tracking-wider"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
