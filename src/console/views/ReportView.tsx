import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, RefreshCw, Copy, Check } from 'lucide-react';
import { ViewState } from '../components/shared/ViewState';
import { describeError } from '../api/client';
import { renderMarkdown } from '../lib/markdown';

const REPORT_PATH = '/api/v1/report';

async function fetchReport(signal?: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(REPORT_PATH, { headers: { Accept: 'text/markdown, text/plain, */*' }, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Cannot reach the EPOCH API. Start the API with pnpm dev.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load report (${res.status})`);
  }
  return res.text();
}

export const ReportView: React.FC = () => {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reportAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    reportAbortRef.current?.abort();
    const controller = new AbortController();
    reportAbortRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const text = await fetchReport(controller.signal);
      setMarkdown(text);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      reportAbortRef.current?.abort();
      if (copyTimerRef.current !== undefined) clearTimeout(copyTimerRef.current);
    };
  }, [load]);

  const handleCopy = useCallback(() => {
    if (!markdown) return;
    void navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [markdown]);

  if (isLoading) return <ViewState kind="loading" title="Loading evolution report…" />;
  if (error) return <ViewState kind="error" error={error} onRetry={load} message={describeError(error)} />;
  if (!markdown || markdown.trim() === '') {
    return (
      <ViewState
        kind="empty"
        title="No report available"
        message="Run pnpm report to generate the evolution report."
      />
    );
  }

  const html = renderMarkdown(markdown);

  return (
    <div className="space-y-4 select-none font-mono">
      {/* Header */}
      <div className="reveal-delay-1 p-4 rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-orange-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-0.5 text-xs">
              <h1 id="evolution-report-title" className="text-zinc-200 font-bold uppercase tracking-wider">Evolution Report</h1>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500 text-[10px]">Full Service History</span>
            </div>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Rendered from the EPOCH store. Reflects all mutations, drift findings, incidents and futures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-sm uppercase tracking-wider transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy MD'}</span>
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-sm uppercase tracking-wider transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Report body */}
      <div
        aria-labelledby="evolution-report-title"
        className="reveal-delay-2 p-5 rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur shadow-sm prose-report"
        /* dangerouslySetInnerHTML is safe: renderMarkdown escapes all user text */
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
