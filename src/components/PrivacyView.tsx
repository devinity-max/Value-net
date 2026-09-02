import React from 'react';
import { ActiveTab } from '../types';

interface PolicyViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenAuth?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrivacyView: React.FC<PolicyViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white font-mono uppercase tracking-wide">
            PRIVACY POLICY
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
          <h2 className="text-base font-bold text-white font-mono uppercase">1. Information We Collect</h2>
          <p>
            We collect minimal account data (username, optional recovery email, and public trading preferences).
            We do not store or ask for your Roblox password or financial data.
          </p>

          <h2 className="text-base font-bold text-white font-mono uppercase mt-6">2. Data Usage</h2>
          <p>
            Your trading ledger entries and trade ads are displayed publicly on the live trading board to facilitate matchmaking.
          </p>
        </section>
      </div>
    </div>
  );
};
