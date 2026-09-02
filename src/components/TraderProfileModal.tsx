import React, { useEffect, useState } from 'react';
import { UserProfile, UserStats, TradeReview, TraderProfile, AuthUser } from '../types';
import { fetchUserProfile } from '../utils/traderProfile';
import { TrustBadge } from './TrustBadge';

export interface TraderProfileModalProps {
  username?: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: TraderProfile | AuthUser;
  onUpdateProfile?: (updated: TraderProfile) => void;
}

export const TraderProfileModal: React.FC<TraderProfileModalProps> = ({
  username,
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
}) => {
  const targetUsername = username || currentUser?.username || 'Trader';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [reviews, setReviews] = useState<TradeReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit fields for local trader profile
  const [editServer, setEditServer] = useState('Sea 3');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    if (isOpen && targetUsername) {
      setLoading(true);
      fetchUserProfile(targetUsername).then((res) => {
        if (res.success && res.profile) {
          setProfile(res.profile);
          setStats(res.stats || null);
          setReviews(res.reviews || []);
          setEditServer(res.profile.server || 'Sea 3');
          setEditBio(res.profile.bio || '');
        } else {
          setProfile({
            id: 'mock-id',
            username: targetUsername,
            displayName: (currentUser as TraderProfile)?.displayName || targetUsername,
            role: currentUser?.role || 'MEMBER',
            avatarUrl: 'person',
            bannerUrl: 'midnight',
            bio: (currentUser as TraderProfile)?.bio || 'Active Blox Fruits trader on VALUE.NET.',
            status: 'ONLINE',
            titleId: 'novice',
            tradingStyle: 'Fair Trades',
            lookingFor: [],
            notInterestedIn: [],
            profileTheme: 'midnight',
            showProfile: true,
            showPreferences: true,
            showActivity: true,
            showTradeStats: true,
            server: (currentUser as TraderProfile)?.server || 'Sea 3',
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
            updatedAt: Date.now(),
          });
          setStats({
            tradesCompleted: (currentUser as TraderProfile)?.completedTrades || 14,
            tradesRejected: 2,
            tradesCancelled: 1,
            tradeAdsPosted: 22,
            acceptanceRate: 88,
            reputationScore: (currentUser as TraderProfile)?.trustScore || 92,
            rating: (currentUser as TraderProfile)?.rating || 4.8,
            trustLevel: 'TRUSTED',
          });
        }
        setLoading(false);
      });
    }
  }, [isOpen, targetUsername, currentUser]);

  if (!isOpen) return null;

  const handleSaveLocal = () => {
    if (onUpdateProfile && currentUser) {
      onUpdateProfile({
        ...(currentUser as TraderProfile),
        server: editServer,
        bio: editBio,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            Loading trader profile...
          </div>
        ) : profile ? (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl font-black text-amber-400 font-mono">
                {profile.displayName ? profile.displayName[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-xl font-black text-white font-mono">{profile.displayName || profile.username}</h3>
                <div className="text-xs text-slate-400 font-mono">@{profile.username}</div>
                <div className="mt-1">
                  <TrustBadge trustLevel={stats?.trustLevel} reputationScore={stats?.reputationScore} size="sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Trades Done</div>
                <div className="text-lg font-black text-white font-mono">{stats?.tradesCompleted || 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Accept Rate</div>
                <div className="text-lg font-black text-emerald-400 font-mono">{stats?.acceptanceRate || 90}%</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Rating</div>
                <div className="text-lg font-black text-amber-400 font-mono">★ {stats?.rating?.toFixed(1) || '5.0'}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 mb-4">
              <span className="font-bold text-slate-400 font-mono">Bio: </span>
              {profile.bio || 'No custom bio provided.'}
            </div>

            {onUpdateProfile && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 mb-4 text-xs">
                <div className="font-bold text-white font-mono uppercase">Update Local Settings</div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Server Realm</label>
                  <input
                    type="text"
                    value={editServer}
                    onChange={(e) => setEditServer(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs mt-1"
                  />
                </div>
                <button
                  onClick={handleSaveLocal}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase cursor-pointer"
                >
                  Save Quick Settings
                </button>
              </div>
            )}

            {reviews.length > 0 && (
              <div>
                <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-2">Recent Trader Feedback</div>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-bold text-white">@{r.fromUsername}</span>
                        <span className="text-amber-400">★ {r.rating}/5</span>
                      </div>
                      <p className="text-slate-300">{r.feedback || 'Smooth and fair trade!'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
