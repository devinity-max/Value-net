import React, { useState, useEffect } from 'react';
import { PublicProfileData, TradeAd } from '../types';
import { safeFetchJson } from '../utils/apiHelper';
import { getAuthToken } from '../utils/auth';
import { formatMoney } from '../utils/calc';
import { getRoleBadgeInfo } from '../utils/permissions';
import { playClickSound } from '../utils/audio';

interface PlayerProfileViewProps {
  username: string;
  onEditProfile: () => void;
  onInspectTrade: (trade: TradeAd) => void;
  onLoginClick: () => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  username,
  onEditProfile,
  onInspectTrade,
  onLoginClick,
}) => {
  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await safeFetchJson<{ success: boolean; data: PublicProfileData; error?: string }>(
        `/api/profiles/${encodeURIComponent(username || 'RootOwner')}`,
        { headers }
      );

      if (!isMounted) return;

      if (res.success && res.data?.success && res.data.data) {
        setProfileData(res.data.data);
      } else {
        setError(res.data?.error || res.error || 'Failed to load profile');
      }
      setLoading(false);
    };

    if (username) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="w-full py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="font-game text-sm text-slate-400 uppercase tracking-wider">
          Decrypting Player Profile...
        </p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="w-full py-16 px-4 max-w-xl mx-auto bg-[#0a0d1a]/90 rounded-2xl border border-rose-500/30 p-8 text-center backdrop-blur-md">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-rose-400 text-2xl">person_off</span>
        </div>
        <h3 className="text-xl font-game font-bold text-white mb-2">Profile Not Found</h3>
        <p className="text-sm text-slate-400 mb-6">
          {error || `Unable to locate player data for @${username}.`}
        </p>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onLoginClick();
          }}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/30"
        >
          Sign In to VALUE.NET
        </button>
      </div>
    );
  }

  const { profile, badges, favoriteFruit, lookingForFruits, notInterestedInFruits, stats, activeTrades, isOwner } =
    profileData;
  const roleInfo = getRoleBadgeInfo(profile.role);

  const getThemeBanner = (theme: string) => {
    switch (theme) {
      case 'violet':
        return 'from-purple-900/60 via-indigo-900/40 to-[#070913] border-purple-500/30';
      case 'gold':
        return 'from-amber-900/60 via-orange-900/40 to-[#070913] border-amber-500/30';
      case 'ocean':
        return 'from-cyan-900/60 via-sky-900/40 to-[#070913] border-cyan-500/30';
      case 'crimson':
        return 'from-rose-900/60 via-red-900/40 to-[#070913] border-rose-500/30';
      default:
        return 'from-slate-900 via-[#0e1224] to-[#070913] border-slate-800';
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {/* Profile Banner & Header */}
      <div className={`relative rounded-3xl border bg-gradient-to-b ${getThemeBanner(profile.profileTheme)} overflow-hidden shadow-2xl backdrop-blur-xl`}>
        {/* Banner Glow Area */}
        <div className="h-40 sm:h-48 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d1a] via-transparent to-transparent" />
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onEditProfile();
              }}
              className="absolute top-4 right-4 z-20 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-purple-900/80 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-game font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Identity & Main Info */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#0e1224] border-2 border-purple-500/60 p-1 shadow-2xl shadow-purple-950 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-2xl bg-purple-950/60 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-300 text-5xl">
                    {profile.avatarUrl || 'person'}
                  </span>
                </div>
              </div>
              {/* Online Status Indicator */}
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#070913] shadow-md" />
            </div>

            {/* Name & Titles */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-game font-black text-white tracking-wide">
                  {profile.displayName || profile.username}
                </h1>
                <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  @{profile.username}
                </span>
                <span
                  className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${roleInfo.bg} ${roleInfo.border} ${roleInfo.text}`}
                >
                  {roleInfo.label}
                </span>
              </div>

              <p className="text-xs text-slate-400 max-w-md font-sans leading-relaxed">
                {profile.bio || 'Blox Fruits trader on VALUE.NET.'}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-purple-400">dns</span>
                  <span>{profile.server || 'US-EAST #412'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-400">tune</span>
                  <span>Style: {profile.tradingStyle || 'Fair Trades'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Trust Score Highlight Pill */}
          <div className="flex items-center justify-center sm:justify-end gap-3 bg-[#0e1224]/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Trust Index</div>
              <div className="text-xl font-game font-black text-emerald-400">
                {stats.reputationScore || 100} / 100
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-300 text-xl">verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Profile Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats & Reputation Engine Summary */}
        <div className="bg-[#0a0d1a]/90 rounded-2xl border border-purple-500/20 p-6 space-y-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <span className="material-symbols-outlined text-purple-400 text-lg">monitoring</span>
            <h3 className="font-game font-bold text-sm text-white uppercase tracking-wider">
              Trade Metrics & Trust
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-[#0e1224] p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Completed</div>
              <div className="font-game font-bold text-lg text-emerald-400 mt-0.5">
                {stats.tradesCompleted}
              </div>
            </div>
            <div className="bg-[#0e1224] p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Acceptance</div>
              <div className="font-game font-bold text-lg text-amber-400 mt-0.5">
                {stats.acceptanceRate}%
              </div>
            </div>
            <div className="bg-[#0e1224] p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Avg Rating</div>
              <div className="font-game font-bold text-lg text-purple-300 mt-0.5 flex items-center justify-center gap-1">
                <span>{stats.rating.toFixed(1)}</span>
                <span className="material-symbols-outlined text-xs text-amber-400">star</span>
              </div>
            </div>
            <div className="bg-[#0e1224] p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Ads Posted</div>
              <div className="font-game font-bold text-lg text-sky-400 mt-0.5">
                {stats.tradeAdsPosted}
              </div>
            </div>
          </div>

          {/* Favorite Fruit Display */}
          {favoriteFruit && (
            <div className="pt-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">Favorite Fruit</div>
              <div className="bg-[#0e1224] p-3 rounded-xl border border-purple-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-500/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-300 text-xl">
                    {favoriteFruit.icon || 'star'}
                  </span>
                </div>
                <div className="flex-grow">
                  <div className="font-game font-bold text-sm text-white">{favoriteFruit.name}</div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    ${formatMoney(favoriteFruit.marketValue)} • {favoriteFruit.rarity}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center & Right: Badges, Preferences, and Active Listings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Badges Terminal */}
          <div className="bg-[#0a0d1a]/90 rounded-2xl border border-purple-500/20 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 mb-4">
              <span className="material-symbols-outlined text-amber-400 text-lg">military_tech</span>
              <h3 className="font-game font-bold text-sm text-white uppercase tracking-wider">
                Earned Badges ({badges.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {badges.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-slate-500">
                  No badges unlocked yet.
                </div>
              ) : (
                badges.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[#0e1224] p-3 rounded-xl border border-slate-800/80 hover:border-purple-500/40 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-amber-400 text-lg">{b.icon}</span>
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-game font-bold text-xs text-white truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{b.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trade Preferences (Looking For / Avoid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0a0d1a]/90 rounded-2xl border border-emerald-500/20 p-5 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-game font-bold text-xs uppercase mb-3">
                <span className="material-symbols-outlined text-sm">search</span>
                <span>Actively Looking For</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lookingForFruits.length === 0 ? (
                  <span className="text-xs text-slate-500">No specific fruits tagged</span>
                ) : (
                  lookingForFruits.map((f) => (
                    <span
                      key={f.id}
                      className="bg-[#0e1224] px-2.5 py-1 rounded-lg border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">{f.icon || 'star'}</span>
                      {f.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0a0d1a]/90 rounded-2xl border border-rose-500/20 p-5 shadow-xl">
              <div className="flex items-center gap-2 text-rose-400 font-game font-bold text-xs uppercase mb-3">
                <span className="material-symbols-outlined text-sm">block</span>
                <span>Not Interested In</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {notInterestedInFruits.length === 0 ? (
                  <span className="text-xs text-slate-500">Open to all offers</span>
                ) : (
                  notInterestedInFruits.map((f) => (
                    <span
                      key={f.id}
                      className="bg-[#0e1224] px-2.5 py-1 rounded-lg border border-rose-500/30 text-xs font-mono text-rose-300 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">{f.icon || 'star'}</span>
                      {f.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Active Public Trade Listings */}
          <div className="bg-[#0a0d1a]/90 rounded-2xl border border-purple-500/20 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 mb-4">
              <span className="material-symbols-outlined text-purple-400 text-lg">storefront</span>
              <h3 className="font-game font-bold text-sm text-white uppercase tracking-wider">
                Active Listings ({activeTrades.length})
              </h3>
            </div>

            <div className="space-y-3">
              {activeTrades.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No active trade offers currently posted on the marketplace.
                </div>
              ) : (
                activeTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="bg-[#0e1224] p-4 rounded-xl border border-slate-800 hover:border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-game">
                        <span className="text-purple-300">Offers:</span>
                        <span className="text-slate-200">
                          {trade.offeredFruits.map((f) => f.name).join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-game">
                        <span className="text-amber-300">Wants:</span>
                        <span className="text-slate-200">
                          {trade.requestedFruits.map((f) => f.name).join(', ')}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onInspectTrade(trade);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-game font-bold uppercase transition-colors"
                    >
                      View Trade
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
