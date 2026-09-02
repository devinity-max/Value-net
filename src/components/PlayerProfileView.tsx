import React, { useEffect, useState } from 'react';
import { UserProfile, UserStats, TradeReview, TradeAd } from '../types';
import { fetchUserProfile } from '../utils/traderProfile';
import { TrustBadge } from './TrustBadge';

export interface PlayerProfileViewProps {
  username: string;
  onEditProfile?: () => void;
  onInspectTrade?: (trade: TradeAd) => void;
  onLoginClick?: () => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  username,
  onEditProfile,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [reviews, setReviews] = useState<TradeReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUserProfile(username).then((res) => {
      if (res.success && res.profile) {
        setProfile(res.profile);
        setStats(res.stats || null);
        setReviews(res.reviews || []);
      }
      setLoading(false);
    });
  }, [username]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 text-center text-slate-400 font-mono text-xs">
        Loading player profile for @{username}...
      </div>
    );
  }

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl font-black text-amber-400 font-mono">
              {username[0]?.toUpperCase() || 'P'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-mono">{profile?.displayName || username}</h1>
              <div className="text-xs text-slate-400 font-mono">@{username}</div>
              <div className="mt-1.5">
                <TrustBadge trustLevel={stats?.trustLevel} reputationScore={stats?.reputationScore} size="sm" />
              </div>
            </div>
          </div>
          {onEditProfile && (
            <button
              onClick={onEditProfile}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-white transition-colors cursor-pointer"
            >
              Edit My Profile
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Completed Trades</div>
            <div className="text-xl font-black text-white font-mono mt-1">{stats?.tradesCompleted || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Success Rate</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">{stats?.acceptanceRate || 95}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Reputation</div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">★ {stats?.rating?.toFixed(1) || '5.0'}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
          <div className="font-bold text-slate-400 font-mono uppercase mb-1">Trader Bio</div>
          <p>{profile?.bio || 'Active trader and collector on VALUE.NET.'}</p>
        </div>
      </div>
    </div>
  );
};
