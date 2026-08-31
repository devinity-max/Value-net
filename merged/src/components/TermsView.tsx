import React from 'react';
import { ActiveTab } from '../types';
import { playClickSound } from '../utils/audio';

interface TermsViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-game font-bold text-purple-300 uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-xs">gavel</span>
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl font-game font-black text-white uppercase tracking-wide">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Last Updated: January 2025 • Protocol Version 2.4
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 font-sans leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-game font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">1.</span> Platform Purpose & Virtual Currency Disclaimer
            </h2>
            <p className="text-slate-400">
              VALUE.NET is an independent community calculator, market analytics index, and trade communication terminal designed for Blox Fruits players. VALUE.NET is not affiliated with, endorsed by, or partnered with Roblox Corporation or Gamer Robot Inc. All virtual item values, valuations, and market calculations are community estimations intended solely for gameplay strategy and entertainment.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-game font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">2.</span> Real-Money Trading (RMT) Prohibition
            </h2>
            <p className="text-slate-400">
              VALUE.NET strictly prohibits any solicitation, advertisement, or execution of Real-Money Trading (RMT), cross-trading for external currency, or unauthorized sales of Roblox accounts or virtual items. Any user found soliciting real-world money will receive an immediate permanent ban across all platform services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-game font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">3.</span> Safe Trading & In-Game Execution
            </h2>
            <p className="text-slate-400">
              All actual item transfers occur inside the official Roblox Blox Fruits game servers via in-game trade tables. VALUE.NET does not hold, escrow, or execute physical virtual asset transactions. Always double-check in-game trade tables before confirming any trade.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-game font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">4.</span> User Accounts & Code of Conduct
            </h2>
            <p className="text-slate-400">
              Users are responsible for maintaining the confidentiality of their credentials. Impersonation of staff members, abusive behavior, malicious advertisement spamming, and deliberate rate limit abuse are grounds for account termination.
            </p>
          </section>
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
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onNavigateTab('privacy');
            }}
            className="text-xs font-game text-purple-400 hover:text-purple-300 uppercase tracking-wider"
          >
            Read Privacy Policy →
          </button>
        </div>
      </div>
    </div>
  );
};
