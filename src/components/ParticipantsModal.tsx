import React, { useState, useEffect } from 'react';
import { GiveawayEntry, GiveawayItem } from '../types';
import { apiGetGiveawayParticipants } from '../utils/giveaways';
import { playClickSound } from '../utils/audio';

interface ParticipantsModalProps {
  giveaway: GiveawayItem | null;
  isOpen: boolean;
  onClose: () => void;
  onViewTraderProfile: (username: string) => void;
}

export const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  giveaway,
  isOpen,
  onClose,
  onViewTraderProfile,
}) => {
  const [participants, setParticipants] = useState<GiveawayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [boostedOnly, setBoostedOnly] = useState(false);
  const [totalWeight, setTotalWeight] = useState(0);
  const [boostedCount, setBoostedCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !giveaway) return;
    let isMounted = true;
    setLoading(true);

    apiGetGiveawayParticipants(giveaway.id, {
      query: search.trim() || undefined,
      boostedOnly: boostedOnly || undefined,
    }).then((res) => {
      if (isMounted && res.success) {
        setParticipants(res.participants);
        setTotalWeight(res.totalWeight || 0);
        setBoostedCount(res.boostedCount || 0);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, giveaway?.id, search, boostedOnly]);

  if (!isOpen || !giveaway) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-[#0b0e1b] border border-purple-500/30 w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-lg">group</span>
              <h2 className="font-game font-bold text-base sm:text-lg text-white uppercase tracking-wider">
                Entrants & Provable Weights
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 font-sans">
              {giveaway.title}
            </p>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 my-4">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#070913] border border-slate-800/80 text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Entries</div>
            <div className="text-base sm:text-lg font-game font-bold text-white">
              {giveaway.participantCount || participants.length}
            </div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#070913] border border-purple-500/20 text-center">
            <div className="text-[10px] font-mono text-purple-300 uppercase">YouTube Boosted</div>
            <div className="text-base sm:text-lg font-game font-bold text-purple-400">
              {boostedCount}
            </div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#070913] border border-amber-500/20 text-center">
            <div className="text-[10px] font-mono text-amber-300 uppercase">Pool Weight</div>
            <div className="text-base sm:text-lg font-game font-bold text-amber-400">
              {totalWeight.toFixed(1)}x
            </div>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entrant username..."
              className="w-full pl-8 pr-3 py-2 bg-[#070913] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setBoostedOnly(!boostedOnly)}
            className={`px-3 py-2 rounded-xl text-[11px] font-game font-bold uppercase transition-all flex items-center justify-center gap-1.5 border ${
              boostedOnly
                ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                : 'bg-[#070913] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">rocket_launch</span>
            <span>Boosted Only</span>
          </button>
        </div>

        {/* Entrants List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-mono">Loading entrant records...</p>
            </div>
          ) : participants.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-mono">
              No entrants matching the criteria found.
            </div>
          ) : (
            participants.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-[#070913]/90 border border-slate-800/80 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onViewTraderProfile(entry.username)}
                    className="flex items-center gap-2 text-left hover:opacity-80"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <span className="material-symbols-outlined text-sm">
                        {entry.avatarUrl || 'person'}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-game font-bold text-white flex items-center gap-1.5">
                        <span>@{entry.username}</span>
                        {entry.hasYoutubeBoost && (
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-[9px] font-mono font-bold text-purple-300 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">rocket_launch</span>
                            <span>+{entry.boostPercentage || 10}%</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Entered {new Date(entry.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    {entry.winProbability ? `${entry.winProbability}%` : '—'}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase">
                    Weight: {(entry.ticketWeight || 1.0).toFixed(2)}x
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Provably Fair RNG Enabled</span>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-game text-[11px] uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
