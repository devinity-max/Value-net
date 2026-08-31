import React from 'react';
import { ActiveTab } from '../types';
import { playClickSound } from '../utils/audio';

interface GuidelinesViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const GuidelinesView: React.FC<GuidelinesViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-game font-bold text-purple-300 uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-xs">verified</span>
            <span>Trader Code of Conduct</span>
          </div>
          <h1 className="text-3xl font-game font-black text-white uppercase tracking-wide">
            Community Guidelines
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Rules for maintaining fair, transparent, and respectful Blox Fruits trading.
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 font-sans leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0e1224] p-5 rounded-2xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Encouraged Behavior</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Honor agreed-upon trades from the Live Board</li>
                <li>Communicate politely in trade chat sessions</li>
                <li>Accurately list items and inventory availability</li>
                <li>Leave honest reputation feedback after completed trades</li>
              </ul>
            </div>

            <div className="bg-[#0e1224] p-5 rounded-2xl border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">cancel</span>
                <span>Prohibited Behavior</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Bait-and-switch offers at the in-game trade table</li>
                <li>Reputation farming with alt accounts or collusion</li>
                <li>Abusive language, harassment, or scam threats</li>
                <li>External link phishing or account credential requests</li>
              </ul>
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
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onNavigateTab('safety');
            }}
            className="text-xs font-game text-purple-400 hover:text-purple-300 uppercase tracking-wider"
          >
            Visit Safety Center →
          </button>
        </div>
      </div>
    </div>
  );
};
