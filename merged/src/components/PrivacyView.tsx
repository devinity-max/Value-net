import React from 'react';
import { ActiveTab } from '../types';
import { playClickSound } from '../utils/audio';

interface PrivacyViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-game font-bold text-purple-300 uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-xs">lock</span>
            <span>Data Protection</span>
          </div>
          <h1 className="text-3xl font-game font-black text-white uppercase tracking-wide">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Last Updated: January 2025 • End-to-End Cryptographic Security
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 font-sans leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-game font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">1.</span> Information We Collect
            </h2>
            <p className="text-slate-400">
              When creating an account on VALUE.NET, we store your chosen username, email address, hashed passwords (using salted SHA-256 cryptographic algorithms), and user-customized profile configurations (bio, favorite fruits, server preferences). We do not collect or request real-world financial credentials or sensitive government IDs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-game font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">2.</span> How We Use Data
            </h2>
            <p className="text-slate-400">
              Your data is used exclusively to facilitate live trade board synchronization, reputation score calculations, giveaway eligibility verification, and anti-abuse / anti-farming rate protection across the VALUE.NET platform. We never sell user data to third-party advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-game font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">3.</span> Local Storage & Session Cookies
            </h2>
            <p className="text-slate-400">
              We utilize browser local storage to preserve your client trade ledger history, volume sound preferences, and active authenticated session tokens. You may clear your local browser storage at any time to purge client-cached state.
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
              onNavigateTab('guidelines');
            }}
            className="text-xs font-game text-purple-400 hover:text-purple-300 uppercase tracking-wider"
          >
            Read Community Guidelines →
          </button>
        </div>
      </div>
    </div>
  );
};
