'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { timeAgo, fmtDuration } from '@/lib/utils';

interface PollEntry {
  polledAt: string;
  totalCollections: number;
  newCollections: number;
  status: 'success' | 'error';
  errorMessage?: string;
  collectionsDurationMs?: number;
  countsDurationMs?: number;
  updatedCollections?: number;
}

interface SyncProgress {
  phase: 'idle' | 'collections' | 'counts';
  current: number;
  total: number;
  currentHandle: string;
  updatedCount: number;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

const HISTORY_LIMIT = 20;

export default function PollPage() {
  const [history, setHistory] = useState<PollEntry[]>([]);
  const [progress, setProgress] = useState<SyncProgress>({ phase: 'idle', current: 0, total: 0, currentHandle: '', updatedCount: 0 });
  const [showAll, setShowAll] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const pollingRef = useRef(false);

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/collections');
    const data = await res.json();
    setHistory(data.history ?? []);
  }, []);

  // Poll server-side progress while a sync is running
  const pollProgress = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    if (startRef.current === null) startRef.current = Date.now();

    while (true) {
      await new Promise(r => setTimeout(r, 800));
      try {
        const res = await fetch('/api/poll-progress');
        const p: SyncProgress = await res.json();
        setProgress(p);
        setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
        if (p.phase === 'idle') break;
      } catch {
        break;
      }
    }

    pollingRef.current = false;
    startRef.current = null;
    setElapsed(0);
    await loadHistory();
  }, [loadHistory]);

  // On mount: check if a sync is already running (e.g. after page reload)
  useEffect(() => {
    loadHistory();
    fetch('/api/poll-progress')
      .then(r => r.json())
      .then((p: SyncProgress) => {
        if (p.phase !== 'idle') {
          setProgress(p);
          pollProgress();
        }
      });
  }, [loadHistory, pollProgress]);

  // Elapsed ticker (runs whenever progress phase is non-idle)
  useEffect(() => {
    if (progress.phase === 'idle') return;
    const id = setInterval(() => {
      if (startRef.current !== null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [progress.phase]);

  async function runPoll() {
    if (pollingRef.current) return;
    startRef.current = Date.now();
    setProgress({ phase: 'collections', current: 0, total: 0, currentHandle: '', updatedCount: 0 });
    pollProgress();

    try {
      await fetch('/api/poll', { method: 'POST' });
      await fetch('/api/poll-counts', { method: 'POST' });
    } catch (err) {
      console.error('Poll failed:', err);
    }
  }

  const running = progress.phase !== 'idle';
  const last = history[0];
  const visible = showAll ? history : history.slice(0, HISTORY_LIMIT);
  const hidden = history.length - HISTORY_LIMIT;

  const statusLabel = progress.phase === 'collections'
    ? `Syncing collections${progress.current > 0 ? ` — ${progress.current.toLocaleString()} fetched` : '…'}`
    : progress.phase === 'counts'
    ? `Fetching stock counts${progress.total > 0
        ? ` — ${progress.current} / ${progress.total}${progress.currentHandle ? ` · ${progress.currentHandle}` : ''}`
        : '…'}`
    : '';

  const progressPct = progress.phase === 'counts' && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : null;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-300 text-sm">← Dashboard</Link>
            <h1 className="text-xl font-semibold text-white">Sync</h1>
          </div>
          <button
            onClick={runPoll}
            disabled={running}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors min-w-[10rem] text-center"
          >
            {running ? 'Running…' : 'Check Now'}
          </button>
        </div>

        {last && (
          <p className="text-gray-500 text-sm -mt-4">
            Last synced <span className="text-gray-400">{timeAgo(last.polledAt)}</span>
            {' '}&middot; {last.totalCollections.toLocaleString()} collections
          </p>
        )}

        {running && (
          <div className="p-4 bg-blue-950/30 border border-blue-800/40 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span className="text-blue-300 text-sm flex-1">{statusLabel}</span>
              <span className="text-blue-500 text-xs tabular-nums">{fmtDuration(elapsed * 1000)}</span>
            </div>
            {progressPct !== null ? (
              <div className="h-1.5 bg-blue-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            ) : (
              <div className="h-1.5 bg-blue-950 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-blue-700 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">History</h2>
          {history.length === 0 ? (
            <p className="text-gray-600 text-sm">No history yet.</p>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collections</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">New</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Updated</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {visible.map((h, i) => {
                    const total = (h.collectionsDurationMs ?? 0) + (h.countsDurationMs ?? 0);
                    return (
                      <tr key={i} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-gray-400 text-xs">{fmt(h.polledAt)}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums">{h.totalCollections.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums">
                          {h.newCollections > 0
                            ? <span className="text-emerald-400 font-medium">+{h.newCollections}</span>
                            : <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums">
                          {h.updatedCollections != null && h.updatedCollections > 0
                            ? <span className="text-amber-400">{h.updatedCollections}</span>
                            : <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-500">
                          {total > 0 ? (
                            <span title={[
                              h.collectionsDurationMs != null ? `collections: ${fmtDuration(h.collectionsDurationMs)}` : null,
                              h.countsDurationMs != null ? `counts: ${fmtDuration(h.countsDurationMs)}` : null,
                            ].filter(Boolean).join(' · ')}>
                              {fmtDuration(total)}
                            </span>
                          ) : <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {h.status === 'success'
                            ? <span className="text-xs text-gray-600">ok</span>
                            : <span className="text-xs text-red-400">{h.errorMessage || 'error'}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {hidden > 0 && (
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="w-full px-4 py-2.5 text-xs text-gray-600 hover:text-gray-400 hover:bg-gray-800/40 transition-colors border-t border-gray-800/60 text-center"
                >
                  {showAll ? 'Show less' : `Show ${hidden} more`}
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
