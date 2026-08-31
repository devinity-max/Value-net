import React, { useState, useEffect } from 'react';
import { AuthUser, GiveawayItem } from '../types';
import { apiGetGiveaways, apiJoinGiveaway, apiLeaveGiveaway } from '../utils/giveaways';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSuccessSound } from '../utils/audio';
import { AdSlot } from './ads/AdSlot';

interface GiveawaysViewProps {
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onViewTraderProfile: (username: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GiveawaysView: React.FC<GiveawaysViewProps> = ({
  currentUser,
  onOpenAuth,
  onViewTraderProfile,
  onShowToast,
}) => {
  const [giveaways, setGiveaways] = useState<GiveawayItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED' | 'MY'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadGiveaways = async () => {
    setLoading(true);
    const res = await apiGetGiveaways({
      filter: filter === 'MY' && currentUser ? `user:${currentUser.id}` : filter,
      search: search.trim() || undefined,
    });
    if (res.success) {
      setGiveaways(res.giveaways);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGiveaways();
  }, [filter, search]);

  const handleJoin = async (gw: GiveawayItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setActionInProgress(gw.id);
    const isJoined = gw.hasJoined ?? false;

    if (isJoined) {
      const res = await apiLeaveGiveaway(gw.id);
      if (res.success) {
        playClickSound();
        onShowToast('Left giveaway entry pool.', 'info');
        loadGiveaways();
      } else {
        onShowToast(res.error || 'Failed to leave giveaway.', 'error');
      }
    } else {
      const res = await apiJoinGiveaway(gw.id);
      if (res.success) {
        playSuccessSound();
        onShowToast(res.message || 'Successfully entered giveaway!', 'success');
        loadGiveaways();
      } else {
        onShowToast(res.error || 'Failed to enter giveaway.', 'error');
      }
    }
    setActionInProgress(null);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/80 via-[#0e1224] to-indigo-950/80 p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-game font-bold text-purple-300 uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs">celebration</span>
            <span>Community Drops & Giveaways</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wider">
            Fruit Drop Terminal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Enter official staff & creator-hosted Blox Fruits giveaways with cryptographically fair RNG selection.
          </p>
        </div>

        {/* Action / Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search giveaways..."
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center bg-[#070913] p-1 rounded-xl border border-slate-800">
            {(['ACTIVE', 'ALL', 'ENDED'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  playClickSound();
                  setFilter(f);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-game font-bold uppercase transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AdSlot: Giveaways Banner */}
      <div>
        <AdSlot placement="giveaway-banner" variant="Banner" />
      </div>

      {/* Giveaways Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="font-game text-xs text-slate-400 uppercase tracking-wider">Loading Drops...</p>
        </div>
      ) : giveaways.length === 0 ? (
        <div className="bg-[#0a0d1a]/80 rounded-2xl border border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">redeem</span>
          <h3 className="font-game font-bold text-base text-white mb-1">No Giveaways Found</h3>
          <p className="text-xs text-slate-500">
            There are currently no matching giveaways active in this view.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {giveaways.map((gw) => {
            const isJoined = gw.hasJoined ?? false;
            const isEnded = gw.status === 'ENDED' || gw.status === 'CANCELLED' || gw.status === 'COMPLETED';
            const prizeTotal = (gw.prizes || []).reduce(
              (sum, p) => sum + (p.marketValue || p.value || 0),
              0
            );

            return (
              <div
                key={gw.id}
                className="bg-[#0a0d1a]/95 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 p-5 shadow-xl flex flex-col justify-between transition-all duration-200 backdrop-blur-md relative overflow-hidden group"
              >
                {/* Prize Info & Host */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => onViewTraderProfile(gw.hostUsername || gw.hostName)}
                      className="flex items-center gap-2 hover:opacity-80 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-300 text-sm">
                          {gw.hostAvatar || 'person'}
                        </span>
                      </div>
                      <div>
                        <div className="font-game font-bold text-xs text-white leading-tight">
                          @{gw.hostUsername || gw.hostName}
                        </div>
                        <div className="text-[9px] font-mono text-purple-400 uppercase">
                          {gw.hostRole || 'Host'}
                        </div>
                      </div>
                    </button>

                    <span
                      className={`text-[9px] font-game font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        isEnded
                          ? 'bg-slate-900 border-slate-700 text-slate-400'
                          : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 animate-pulse'
                      }`}
                    >
                      {isEnded ? 'CONCLUDED' : 'LIVE'}
                    </span>
                  </div>

                  <h3 className="font-game font-bold text-base text-white mb-1 group-hover:text-purple-300 transition-colors">
                    {gw.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-sans leading-relaxed">
                    {gw.description || 'Enter for a chance to win exclusive Blox Fruits inventory drops.'}
                  </p>

                  {/* Prize Fruits List */}
                  <div className="bg-[#0e1224] p-3 rounded-xl border border-slate-800/80 mb-4 space-y-2">
                    <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
                      <span>Prize Items:</span>
                      <span className="text-emerald-400 font-bold">
                        ${formatMoney(prizeTotal)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(gw.prizes || []).map((f, idx) => (
                        <span
                          key={idx}
                          className="bg-[#070913] px-2 py-0.5 rounded-md border border-purple-500/30 text-[11px] font-mono text-purple-200 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs text-purple-400">
                            {f.icon || f.fruitIcon || 'star'}
                          </span>
                          {f.name || f.fruitName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Status & Entry Button */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-1 text-slate-300">
                      <span className="material-symbols-outlined text-xs text-amber-400">group</span>
                      <span>{gw.participantCount || 0} Entries</span>
                    </div>
                  </div>

                  {!isEnded ? (
                    <button
                      type="button"
                      disabled={actionInProgress === gw.id}
                      onClick={() => handleJoin(gw)}
                      className={`px-4 py-2 rounded-xl text-xs font-game font-bold uppercase tracking-wider transition-all shadow-md active:scale-98 ${
                        isJoined
                          ? 'bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 border border-purple-400/40'
                      }`}
                    >
                      {isJoined ? 'Leave' : 'Enter Drop'}
                    </button>
                  ) : (
                    <span className="text-[11px] font-game text-slate-500 uppercase font-bold">
                      Winner Selected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
