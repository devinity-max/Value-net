import React, { useState } from 'react';
import { ActiveTab, AuthUser } from '../types';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

interface SupportViewProps {
  currentUser?: AuthUser | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenAuth?: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SupportView: React.FC<SupportViewProps> = ({
  currentUser,
  onNavigateTab,
  onOpenAuth,
  onShowToast,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('supporter');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSupportClick = (tierName: string) => {
    playClickSound();
    setSelectedTier(tierName);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      playTradeSuccessSound();
      if (onShowToast) {
        onShowToast(
          `Thank you for your interest in the ${tierName} tier! Direct gateway payments will open in the next community rollout.`,
          'info'
        );
      }
    }, 600);
  };

  return (
    <div className="pt-28 sm:pt-32 pb-24 px-4 md:px-8 max-w-[1180px] mx-auto w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-xs font-mono font-bold text-purple-300 uppercase tracking-wider mb-4">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          COMMUNITY SUSTAINABILITY & SUPPORT
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-game font-black text-white tracking-tight mb-4">
          SUPPORT <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-amber-300 to-indigo-400">VALUE.NET</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          VALUE.NET is built and maintained by independent developers and passionate Blox Fruits community members. Help keep server infrastructure ultra-fast, ad-light, and free for all traders worldwide.
        </p>
      </div>

      {/* Strict Anti-Pay-to-Win Pledge */}
      <div className="bg-[#0b0e24] border border-amber-500/30 rounded-2xl p-6 mb-12 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
            <span className="material-symbols-outlined text-2xl">balance</span>
          </div>
          <div>
            <h3 className="font-game font-bold text-base text-white mb-1">
              Zero Pay-to-Win Integrity Commitment
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Supporting the platform provides cosmetic badges and helps offset server costs. Financial contributions <strong className="text-amber-300">never</strong> grant unfair trade arbitration values, artificial reputation scores, moderator privileges, or biased giveaway outcomes. The trading floor remains 100% fair.
            </p>
          </div>
        </div>
      </div>

      {/* Support Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {/* Tier 1 */}
        <div className="bg-[#0a0d1d] border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-md">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-300">
              <span className="material-symbols-outlined text-xl">favorite</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block mb-1">
              COMMUNITY SUPPORTER
            </span>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl sm:text-3xl font-game font-black text-white">$3</span>
              <span className="text-xs font-mono text-slate-400">/ one-time or mo</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Buy our dev team a coffee and help cover live WebSocket server instances and API uptime.
            </p>
            <ul className="space-y-2 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                "Community Supporter" Profile Badge
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                Special Discord Supporter Role
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                Listed on Community Wall of Honor
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => handleSupportClick('Supporter ($3)')}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-xs font-game font-bold text-purple-200 transition-all text-center cursor-pointer"
          >
            Support for $3
          </button>
        </div>

        {/* Tier 2 */}
        <div className="bg-[#0c102b] border-2 border-amber-500/40 hover:border-amber-500/70 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-0.5 rounded-full text-[9px] font-mono font-black text-slate-950 uppercase tracking-widest shadow-md">
            POPULAR PATRON
          </div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-300">
              <span className="material-symbols-outlined text-xl">workspace_premium</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-1">
              PLATFORM PATRON
            </span>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl sm:text-3xl font-game font-black text-white">$10</span>
              <span className="text-xs font-mono text-slate-400">/ mo</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Power ongoing feature engineering, real-time demand calculation algorithms, and community drops.
            </p>
            <ul className="space-y-2 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-amber-400">check</span>
                All Supporter Perks
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-amber-400">check</span>
                Ad-Free Platform Browsing
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-amber-400">check</span>
                Custom Profile Obsidian Glow Border
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-amber-400">check</span>
                Early Beta feature preview access
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => handleSupportClick('Platform Patron ($10/mo)')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-game font-black text-slate-950 transition-all text-center cursor-pointer shadow-md"
          >
            Become a Patron ($10/mo)
          </button>
        </div>

        {/* Tier 3 */}
        <div className="bg-[#0a0d1d] border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-md">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-300">
              <span className="material-symbols-outlined text-xl">diamond</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              COMMUNITY BENEFACTOR
            </span>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl sm:text-3xl font-game font-black text-white">$25</span>
              <span className="text-xs font-mono text-slate-400">/ mo</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Directly sponsor staff prize pools for free public giveaways and community tournaments.
            </p>
            <ul className="space-y-2 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-indigo-400">check</span>
                All Patron Perks
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-indigo-400">check</span>
                "Benefactor" Mythical Profile Aura
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-indigo-400">check</span>
                Host co-branded community giveaways
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => handleSupportClick('Benefactor ($25/mo)')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-xs font-game font-bold text-indigo-200 transition-all text-center cursor-pointer"
          >
            Become a Benefactor ($25/mo)
          </button>
        </div>
      </div>

      {/* Privacy and Payment Safety Note */}
      <div className="text-center text-xs text-slate-400 max-w-xl mx-auto space-y-2">
        <p>
          All donations & memberships are processed securely through certified external payment providers (e.g. Stripe). VALUE.NET stores zero credit card or bank details on our servers.
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          Have questions or want to donate directly via crypto or server credits? Contact our <button onClick={() => onNavigateTab('contact')} className="text-amber-400 hover:underline">Help Desk</button>.
        </p>
      </div>
    </div>
  );
};
