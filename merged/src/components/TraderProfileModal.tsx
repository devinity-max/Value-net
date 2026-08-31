import React from 'react';
import { TraderProfile } from '../types';
import { TrustBadge } from './TrustBadge';
import { playClickSound } from '../utils/audio';

export interface TraderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: TraderProfile;
  currentUser?: TraderProfile;
  onSaveProfile?: (profile: TraderProfile) => void;
  onUpdateProfile?: (updated: any) => void;
}

export const TraderProfileModal: React.FC<TraderProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  currentUser,
  onSaveProfile,
  onUpdateProfile,
}) => {
  if (!isOpen) return null;

  const targetProfile = profile || currentUser || {
    id: 'guest',
    username: 'Guest Trader',
    avatarIcon: 'person',
    server: 'Second Sea',
    rating: 5,
    completedTrades: 0,
    totalTrades: 0,
    vouchesCount: 0,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0e1224] border-2 border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">{targetProfile.avatarUrl || targetProfile.avatarIcon || 'person'}</span>
            </div>
            <div>
              <h3 className="text-lg font-black font-game text-white">{targetProfile.displayName || targetProfile.username}</h3>
              <span className="text-xs font-mono text-purple-400">@{targetProfile.username}</span>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between bg-[#141830] p-3.5 rounded-2xl border border-slate-800">
            <span className="text-slate-400 font-bold uppercase font-mono">Verification Status</span>
            <TrustBadge score={targetProfile.trustScore || 100} totalTrades={targetProfile.totalTrades || targetProfile.completedTrades || 0} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#141830] p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Total Trades</span>
              <span className="text-lg font-black text-amber-400 font-game">{targetProfile.totalTrades || targetProfile.completedTrades || 0}</span>
            </div>
            <div className="bg-[#141830] p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Vouches</span>
              <span className="text-lg font-black text-emerald-400 font-game">{targetProfile.vouchesCount || 0}</span>
            </div>
          </div>

          <div className="bg-[#141830] p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block uppercase mb-1">Trader Bio</span>
            <p className="text-slate-300">{targetProfile.bio || 'No bio provided.'}</p>
          </div>
        </div>

        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full py-2.5 mt-6 bg-[#181d38] hover:bg-[#20274c] text-white font-game font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
        >
          Close Terminal Profile
        </button>
      </div>
    </div>
  );
};
