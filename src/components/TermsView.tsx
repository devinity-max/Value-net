import React from 'react';
import { ActiveTab } from '../types';

interface PolicyViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenAuth?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TermsView: React.FC<PolicyViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white font-mono uppercase tracking-wide">
            TERMS OF SERVICE
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
        <p className="text-xs text-slate-400">Last updated: September 2026</p>

        <section className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <h2 className="text-base font-bold text-white font-mono uppercase">1. Platform Overview</h2>
          <p>
            VALUE.NET is an independent community trading calculator, market valuation ledger, and player hub.
            VALUE.NET is not affiliated with, endorsed by, or sponsored by Roblox Corporation or Gamer Robot Inc.
          </p>

          <h2 className="text-base font-bold text-white font-mono uppercase mt-6">2. Fair Trading & Anti-Scam Rules</h2>
          <p>
            Users agree not to engage in phishing, cross-trading involving real money (RMT), or misleading offers.
            All trade evaluations are based on community market supply and demand algorithms.
          </p>

          <h2 className="text-base font-bold text-white font-mono uppercase mt-6">3. Community Giveaways</h2>
          <p>
            Giveaways hosted on VALUE.NET are free community events. Hosts are responsible for honoring prize delivery.
          </p>
        </section>
      </div>
    </div>
  );
};
