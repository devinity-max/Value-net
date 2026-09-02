import React from 'react';
import { ActiveTab } from '../types';

interface PolicyViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenAuth?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SafetyView: React.FC<PolicyViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white font-mono uppercase tracking-wide">
            TRADING SAFETY GUIDE
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
        <p className="text-xs text-slate-400">Essential rules for safe Blox Fruits trading</p>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="font-bold text-white font-mono uppercase mb-1 text-sm text-emerald-400">
              ✓ Only Trade Inside the Official In-Game Trade Window
            </h3>
            <p>Never agree to "drop first" or transfer assets outside the official Blox Fruits trading tables in Cafe or Mansion.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="font-bold text-white font-mono uppercase mb-1 text-sm text-amber-400">
              ✓ Check the 40% Beli Threshold
            </h3>
            <p>Make sure the in-game Beli value is within 40% difference to prevent trade window lockouts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
