import React, { useState } from 'react';
import { Fruit, LedgerEntry } from '../types';
import { formatMoney } from '../utils/calc';
import { playClickSound } from '../utils/audio';
import { FruitImage } from './FruitImage';

interface RecentLedgerProps {
  entries: LedgerEntry[];
  onLoadTrade: (your: Fruit[], their: Fruit[]) => void;
  onDeleteEntry: (id: string) => void;
  onClearLedger: () => void;
}

export const RecentLedger: React.FC<RecentLedgerProps> = ({
  entries,
  onLoadTrade,
  onDeleteEntry,
  onClearLedger,
}) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredEntries = entries.filter((e) => {
    if (filter === 'ALL') return true;
    if (filter === 'WIN') return e.grade === 'BW' || e.grade === 'W';
    if (filter === 'FAIR') return e.grade === 'F';
    if (filter === 'LOSS') return e.grade === 'L' || e.grade === 'BL';
    return true;
  });

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'BW':
      case 'W':
        return 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300';
      case 'F':
        return 'bg-amber-950/80 border-amber-500/60 text-amber-300';
      case 'L':
      case 'BL':
        return 'bg-rose-950/80 border-rose-500/60 text-rose-300';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="w-full bg-[#0a0d1a]/90 rounded-2xl border border-purple-500/20 p-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-300 text-xl">history_edu</span>
          </div>
          <div>
            <h3 className="text-lg font-game font-bold text-white uppercase tracking-wider">
              Trade History Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Audit log of your evaluated trades & saved sessions
            </p>
          </div>
        </div>

        {/* Filter and Clear */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#070913] p-1 rounded-xl border border-slate-800">
            {['ALL', 'WIN', 'FAIR', 'LOSS'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  playClickSound();
                  setFilter(f);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-game font-bold uppercase transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClearLedger();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[11px] font-game font-bold uppercase tracking-wider transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Entries List */}
      <div className="mt-5 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center">
            <span className="material-symbols-outlined text-3xl mb-2 opacity-50">receipt_long</span>
            <p className="font-game text-sm text-slate-400">No recorded trades in this ledger view</p>
            <p className="text-xs text-slate-500 mt-1">
              Add fruits in the calculator and click "Save to Ledger"
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#0e1224]/80 hover:bg-[#12162d] p-4 rounded-xl border border-slate-800/80 hover:border-purple-500/40 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Trade items summary */}
              <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Your offer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-game font-bold text-slate-400 uppercase">You Offered:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${formatMoney(entry.yourMarketValue)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.yourFruits.map((f, idx) => (
                      <span
                        key={idx}
                        className="bg-[#070913] px-2 py-0.5 rounded-md border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                      >
                        <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded-sm" />
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Their offer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-game font-bold text-slate-400 uppercase">They Offered:</span>
                    <span className="font-mono font-bold text-amber-400">
                      ${formatMoney(entry.theirMarketValue)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.theirFruits.map((f, idx) => (
                      <span
                        key={idx}
                        className="bg-[#070913] px-2 py-0.5 rounded-md border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                      >
                        <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded-sm" />
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Verdict + Actions */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="text-right">
                  <div
                    className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-game font-bold uppercase tracking-wider ${getGradeBadge(
                      entry.grade
                    )}`}
                  >
                    {entry.title || entry.grade}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onLoadTrade(entry.yourFruits, entry.theirFruits);
                    }}
                    className="p-2 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-500/40 transition-colors"
                    title="Load into Calculator"
                  >
                    <span className="material-symbols-outlined text-base">input</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onDeleteEntry(entry.id);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors"
                    title="Delete Entry"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
