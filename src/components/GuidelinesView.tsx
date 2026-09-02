import React from 'react';
import { ActiveTab } from '../types';

interface PolicyViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenAuth?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GuidelinesView: React.FC<PolicyViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white font-mono uppercase tracking-wide">
            COMMUNITY GUIDELINES
          </h1>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('calculator')}
              className="text-xs text-amber-400 hover:underline font-mono"
            >
              &larr; Back to App
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">Strict zero-tolerance code of conduct</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="font-bold text-white font-mono uppercase mb-2 text-sm text-amber-400">1. Respectful Trading</h3>
            <p>Treat all trading partners politely in negotiations. Do not spam or troll live trade feeds.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="font-bold text-white font-mono uppercase mb-2 text-sm text-rose-400">2. Anti-Scam Policy</h3>
            <p>Any attempt to deceive users with fake links, malicious scripts, or fake giveaways results in permanent bans.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
