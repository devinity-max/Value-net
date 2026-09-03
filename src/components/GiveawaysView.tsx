import React, { useState, useEffect } from 'react';
import { AuthUser, GiveawayItem, ActiveTab } from '../types';
import {
  apiGetGiveaways,
  apiJoinGiveaway,
  apiLeaveGiveaway,
  apiRedeemGiveawayBoost,
  apiDrawGiveawayWinner,
} from '../utils/giveaways';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSuccessSound, playCoinSound } from '../utils/audio';
import { canHostGiveaways } from '../utils/permissions';
import { AdSlot } from './ads/AdSlot';
import { FruitImage } from './FruitImage';
import { ParticipantsModal } from './ParticipantsModal';

interface GiveawaysViewProps {
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onViewTraderProfile: (username: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const GiveawaysView: React.FC<GiveawaysViewProps> = ({
  currentUser,
  onOpenAuth,
  onViewTraderProfile,
  onShowToast,
  onNavigateToTab,
}) => {
  const [giveaways, setGiveaways] = useState<GiveawayItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED' | 'MY'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Secret code verification input state per giveaway ID
  const [secretCodes, setSecretCodes] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Participants modal
  const [selectedGwForModal, setSelectedGwForModal] = useState<GiveawayItem | null>(null);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);

  const isAuthorizedToHost =
    currentUser &&
    (currentUser.role === 'ROOT_OWNER' ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'APPROVED_CREATOR');

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

  // Join or Leave Giveaway
  const handleToggleJoin = async (gw: GiveawayItem) => {
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
        onShowToast(res.message || 'Successfully entered giveaway! Good luck!', 'success');
        loadGiveaways();
      } else {
        onShowToast(res.error || 'Failed to enter giveaway.', 'error');
      }
    }
    setActionInProgress(null);
  };

  // Redeem Secret Code for YouTube Boost
  const handleVerifySecretCode = async (gw: GiveawayItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const code = (secretCodes[gw.id] || '').trim();
    if (!code) {
      onShowToast('Please enter the secret code found in the video.', 'error');
      return;
    }

    setVerifyingId(gw.id);
    const res = await apiRedeemGiveawayBoost(gw.id, code);
    setVerifyingId(null);

    if (res.success) {
      playSuccessSound();
      onShowToast(
        res.message || `✓ Secret code verified! +${res.boostPercentage || 10}% Boost Active!`,
        'success'
      );
      // Clear input
      setSecretCodes((prev) => ({ ...prev, [gw.id]: '' }));
      loadGiveaways();
    } else {
      onShowToast(res.error || 'Invalid secret code. Please check video and try again.', 'error');
    }
  };

  // Draw Winner (for Hosts / Admins)
  const handleDrawWinner = async (gw: GiveawayItem) => {
    if (!window.confirm(`Draw winner for "${gw.title}" now using provably fair RNG?`)) {
      return;
    }
    setActionInProgress(gw.id);
    const res = await apiDrawGiveawayWinner(gw.id);
    setActionInProgress(null);

    if (res.success && res.winner) {
      playCoinSound();
      onShowToast(
        `🏆 Winner drawn: @${res.winner.username}${res.winner.hasYoutubeBoost ? ' (with YouTube Boost!)' : ''}`,
        'success'
      );
      loadGiveaways();
    } else {
      onShowToast(res.error || 'Failed to draw winner.', 'error');
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/90 via-[#0e1224] to-indigo-950/90 p-5 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_25px_rgba(168,85,247,0.4)] shrink-0 overflow-hidden hidden sm:block">
            <img
              src="/assets/logo.png"
              alt="Value.NET Official Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-game font-bold text-purple-300 uppercase tracking-wider">
              <span className="material-symbols-outlined text-xs">celebration</span>
              <span>Community Drops & Giveaways</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wider">
              Fruit Drop Terminal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-sans">
              Enter official staff & creator-hosted Blox Fruits drops with provably fair weighted RNG and secret code YouTube boosts.
            </p>
          </div>
        </div>

        {/* Action / Search & Host Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Host Giveaway Trigger - Restricted to Creator+ */}
          {onNavigateToTab && canHostGiveaways(currentUser) && (
            <button
              onClick={() => {
                playClickSound();
                if (!currentUser) {
                  onOpenAuth();
                } else {
                  onNavigateToTab('host-giveaways');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-game font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>Host Giveaway</span>
            </button>
          )}

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drops & fruits..."
              className="w-full sm:w-60 pl-9 pr-4 py-2.5 bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
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

      {/* AdSlot Banner */}
      <div>
        <AdSlot placement="giveaway-banner" variant="Banner" />
      </div>

      {/* Giveaways Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="font-game text-xs text-slate-400 uppercase tracking-wider">Loading Drops Terminal...</p>
        </div>
      ) : giveaways.length === 0 ? (
        <div className="bg-[#0a0d1a]/80 rounded-3xl border border-slate-800 p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-slate-600">redeem</span>
          <h3 className="font-game font-bold text-base text-white">No Giveaways Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no active giveaways in this view. Check back soon for official community drops!
          </p>
          {onNavigateToTab && canHostGiveaways(currentUser) && (
            <button
              onClick={() => onNavigateToTab('host-giveaways')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game text-xs uppercase"
            >
              Host a Community Drop
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {giveaways.map((gw) => {
            const isJoined = gw.hasJoined ?? false;
            const isBoosted = gw.hasUserBoosted ?? false;
            const isEnded =
              gw.status === 'ENDED' || gw.status === 'CANCELLED' || gw.status === 'COMPLETED';
            const isHostOrAdmin =
              currentUser &&
              (currentUser.id === gw.hostId ||
                currentUser.role === 'ROOT_OWNER' ||
                currentUser.role === 'ADMIN');
            const prizeTotal = (gw.prizes || []).reduce(
              (sum, p) => sum + (p?.marketValue || p?.value || 0) * (p?.quantity || 1),
              0
            );

            return (
              <div
                key={gw.id}
                className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 hover:border-purple-500/50 p-5 shadow-xl flex flex-col justify-between transition-all duration-200 backdrop-blur-md relative overflow-hidden group"
              >
                {/* Prize Info & Host */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => onViewTraderProfile(gw.hostUsername || gw.hostName)}
                      className="flex items-center gap-2 hover:opacity-80 text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-300">
                        <span className="material-symbols-outlined text-sm">
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

                    <div className="flex items-center gap-1.5">
                      {gw.youtubeBoostEnabled && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-[9px] font-mono font-bold text-rose-300 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">rocket_launch</span>
                          <span>+{gw.youtubeBoostPercentage || 10}%</span>
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-game font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          isEnded
                            ? 'bg-slate-900 border-slate-700 text-slate-400'
                            : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 animate-pulse'
                        }`}
                      >
                        {gw.status === 'COMPLETED'
                          ? 'CONCLUDED'
                          : gw.status === 'ENDED'
                          ? 'ENDED'
                          : 'LIVE'}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-game font-bold text-base text-white mb-1 group-hover:text-purple-300 transition-colors">
                    {gw.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 font-sans leading-relaxed">
                    {gw.description || 'Enter for a chance to win exclusive Blox Fruits inventory drops.'}
                  </p>

                  {/* Prize Fruits List */}
                  <div className="bg-[#0e1224] p-3 rounded-2xl border border-slate-800/80 mb-3 space-y-2">
                    <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
                      <span>Prize Pool:</span>
                      <span className="text-emerald-400 font-bold">
                        ${formatMoney(prizeTotal)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(gw.prizes || []).map((f, idx) => (
                        <span
                          key={idx}
                          className="bg-[#070913] px-2 py-0.5 rounded-lg border border-purple-500/30 text-[11px] font-mono text-purple-200 flex items-center gap-1.5"
                        >
                          <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded-xs" />
                          <span>{f.name || f.fruitName}</span>
                          {(f.quantity || 1) > 1 && (
                            <span className="text-amber-400 font-bold">x{f.quantity}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* YouTube Video Attachment Banner (if configured) */}
                  {gw.youtubeBoostEnabled && gw.youtubeVideoId && (
                    <div className="p-2.5 rounded-2xl bg-[#080b18] border border-rose-500/30 mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-rose-500 text-lg">play_circle</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-game font-bold text-white truncate">
                            Creator Video Attached
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            Find secret code in video for +{gw.youtubeBoostPercentage || 10}% boost!
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${gw.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-[10px] font-game font-bold text-rose-300 uppercase whitespace-nowrap"
                      >
                        Watch
                      </a>
                    </div>
                  )}

                  {/* SECRET CODE VERIFICATION SECTION */}
                  {gw.youtubeBoostEnabled && !isEnded && (
                    <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 mb-3 space-y-2">
                      {isBoosted ? (
                        <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            <span>Code Verified (+{gw.youtubeBoostPercentage || 10}% Boost Active)</span>
                          </div>
                          {gw.userWinProbability !== undefined && (
                            <span className="text-white font-bold">{gw.userWinProbability}% Chance</span>
                          )}
                        </div>
                      ) : isJoined ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-purple-300 uppercase">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">key</span>
                              <span>Redeem Secret Video Code</span>
                            </span>
                            <span className="text-amber-400 font-bold">+{gw.youtubeBoostPercentage || 10}% Boost</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={secretCodes[gw.id] || ''}
                              onChange={(e) =>
                                setSecretCodes({ ...secretCodes, [gw.id]: e.target.value })
                              }
                              placeholder="Enter secret code..."
                              className="flex-1 px-3 py-1.5 bg-[#070913] border border-purple-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none font-mono"
                            />
                            <button
                              type="button"
                              disabled={verifyingId === gw.id}
                              onClick={() => handleVerifySecretCode(gw)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              {verifyingId === gw.id ? 'Checking...' : 'Verify'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] font-sans text-slate-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs text-amber-400">info</span>
                          <span>Enter drop to redeem secret code for +{gw.youtubeBoostPercentage || 10}% winning weight!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Winner Announcement Banner */}
                  {gw.winnerUsername && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 to-amber-950/80 border border-amber-500/40 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-lg">emoji_events</span>
                        <div>
                          <div className="text-xs font-game font-bold text-amber-300">
                            Winner: @{gw.winnerUsername}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            Selected via Provably Fair RNG
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onViewTraderProfile(gw.winnerUsername!)}
                        className="text-[11px] font-mono font-bold text-amber-400 hover:underline"
                      >
                        Profile &rarr;
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {/* Entrants modal trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGwForModal(gw);
                      setIsParticipantsModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-purple-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs text-amber-400">group</span>
                    <span>{gw.participantCount || 0} Entrants</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Host Action: Draw Winner */}
                    {isHostOrAdmin && !isEnded && (
                      <button
                        type="button"
                        disabled={actionInProgress === gw.id}
                        onClick={() => handleDrawWinner(gw)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-game font-bold uppercase transition-all"
                      >
                        Draw
                      </button>
                    )}

                    {/* Participant Action: Join / Leave */}
                    {!isEnded ? (
                      <button
                        type="button"
                        disabled={actionInProgress === gw.id}
                        onClick={() => handleToggleJoin(gw)}
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
                        Concluded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Entrants / Provable Weights Modal */}
      {isParticipantsModalOpen && selectedGwForModal && (
        <ParticipantsModal
          giveaway={selectedGwForModal}
          isOpen={isParticipantsModalOpen}
          onClose={() => setIsParticipantsModalOpen(false)}
          onViewTraderProfile={onViewTraderProfile}
        />
      )}
    </div>
  );
};
