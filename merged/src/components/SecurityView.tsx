import React from 'react';
import { ActiveTab } from '../types';
import { playClickSound } from '../utils/audio';

interface SecurityViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/60 border border-cyan-500/40 text-[11px] font-game font-bold text-cyan-300 uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-xs">enhanced_encryption</span>
            <span>Technical Architecture</span>
          </div>
          <h1 className="text-3xl font-game font-black text-white uppercase tracking-wide">
            Platform Security & Integrity
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Cryptographic standards, anti-tamper measures, and server protection protocols.
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 font-sans leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0e1224] p-5 rounded-2xl border border-cyan-500/20 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">password</span>
                <span>SHA-256 Key Salting</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All user passwords and YouTube giveaway secret codes undergo cryptographic hashing with unique random salts and constant-time comparison buffers.
              </p>
            </div>

            <div className="bg-[#0e1224] p-5 rounded-2xl border border-purple-500/20 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">speed</span>
                <span>Adaptive Rate Limiting</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sliding-window rate limiters prevent API spam, brute-force authentication attempts, and automated giveaway farming scripts.
              </p>
            </div>

            <div className="bg-[#0e1224] p-5 rounded-2xl border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">security</span>
                <span>Role-Based Access Control</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict granular permission boundaries govern all catalog updates, moderation actions, and user role promotions across Root Owner, Admin, and Creator tiers.
              </p>
            </div>

            <div className="bg-[#0e1224] p-5 rounded-2xl border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">shuffle</span>
                <span>Provably Fair Giveaway RNG</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Giveaway winners are determined via cryptographically secure pseudo-random number generation (`crypto.randomBytes`) with weighted probabilities for verified entries.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onNavigateTab('calculator');
            }}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/30"
          >
            Return to Calculator
          </button>
        </div>
      </div>
    </div>
  );
};
