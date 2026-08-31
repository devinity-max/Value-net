import React, { useState } from 'react';
import { playClickSound } from '../utils/audio';

export const WikiView: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<'rules' | 'locations' | 'gamepasses' | 'scams'>('rules');

  const sections = [
    { id: 'rules', label: '40% Trading Rule', icon: 'gavel' },
    { id: 'locations', label: 'Trading Locations', icon: 'pin_drop' },
    { id: 'gamepasses', label: 'Gamepasses & Perms', icon: 'military_tech' },
    { id: 'scams', label: 'Anti-Scam Guide', icon: 'security' },
  ];

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-amber-400 text-xs font-game font-bold uppercase tracking-widest mb-3">
          <span className="material-symbols-outlined text-sm">menu_book</span>
          VALUE.NET Knowledge Base
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-game text-white tracking-wide uppercase">
          Blox Fruits Trading Wiki
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto mt-2 font-sans">
          Master the mechanics of in-game trading tables, market demand dynamics, and secure trade verification.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              playClickSound();
              setSelectedSection(s.id as any);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-game text-xs font-bold uppercase tracking-wider transition-all border ${
              selectedSection === s.id
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                : 'bg-[#12162d] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-base">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[#0e1224] border border-purple-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl font-sans">
        {selectedSection === 'rules' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black font-game text-amber-400 flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">balance</span>
              The 40% Beli Difference Constraint
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              In official Blox Fruits servers, trading tables enforce a strict mathematical cap: the total in-game Beli price difference between both players’ offers cannot exceed <strong className="text-amber-300">40%</strong> of the higher side’s total value.
            </p>
            <div className="bg-[#141830] border border-amber-500/30 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-bold font-game text-white uppercase">How to Bypass 40% Beli Disparity:</h4>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li><strong>Add Trash/Fodder Fruits:</strong> Use high Beli-price fruits with low market value (like Quake, Spider, or Gravity) to inflate your side's Beli total without giving away valuable assets.</li>
                <li><strong>Gamepass Exemption:</strong> Robux Gamepasses (such as +1 Fruit Storage, 2x Money, Dark Blade) have a Beli value of $0 and do not trigger the 40% cap restrictions in the same way.</li>
              </ul>
            </div>
          </div>
        )}

        {selectedSection === 'locations' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black font-game text-amber-400 flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">pin_drop</span>
              Trading Table Locations Across the Seas
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-[#141830] border border-slate-800 rounded-2xl p-5">
                <span className="text-[10px] font-game font-bold text-sky-400 uppercase tracking-wider block mb-1">SECOND SEA (LEVEL 700+)</span>
                <h3 className="text-lg font-black font-game text-white mb-2">The Kingdom of Rose (The Cafe)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Located in the center of Kingdom of Rose. Houses multiple green safe-zone trade tables where second sea pirates exchange fruits and raid chips.
                </p>
              </div>
              <div className="bg-[#141830] border border-slate-800 rounded-2xl p-5">
                <span className="text-[10px] font-game font-bold text-amber-400 uppercase tracking-wider block mb-1">THIRD SEA (LEVEL 1500+)</span>
                <h3 className="text-lg font-black font-game text-white mb-2">Floating Turtle (The Mansion)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The primary high-tier trading hub of Blox Fruits. Elite players gather inside the Turtle Mansion tables to trade Kitsune, Dragon, and Gamepasses.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedSection === 'gamepasses' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black font-game text-amber-400 flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">military_tech</span>
              Gamepasses & Permanent Fruits Valuation
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Permanent fruits and gamepass passes are bought with Robux and stored in inventory. They carry premium market liquidity because they are non-consumable and persist forever on an account.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-4 bg-[#141830] rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-amber-300 block mb-1">+1 Fruit Storage</span>
                <span className="text-xs text-slate-400">400 Robux (~40M Value)</span>
              </div>
              <div className="p-4 bg-[#141830] rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-amber-300 block mb-1">2x Mastery / 2x Money</span>
                <span className="text-xs text-slate-400">450 Robux (~45M Value)</span>
              </div>
              <div className="p-4 bg-[#141830] rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-amber-300 block mb-1">Dark Blade (Yoru)</span>
                <span className="text-xs text-slate-400">1,200 Robux (~55M Value)</span>
              </div>
            </div>
          </div>
        )}

        {selectedSection === 'scams' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black font-game text-rose-400 flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">security</span>
              Anti-Scam & Trust Protection Rules
            </h2>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl">
                <strong className="text-rose-300 block text-sm mb-1">1. The "Last Second Swap" Scam</strong>
                Scammers swap high-tier fruits (e.g. Kitsune) with low-tier fruits (e.g. Ghost or Rubber) right before the 5-second countdown timer. Always inspect the final table slots before holding Accept!
              </div>
              <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl">
                <strong className="text-rose-300 block text-sm mb-1">2. "I trade you after" Cross-Trades</strong>
                Never give fruits on promise of accounts, gift cards, or external services. All official trades must happen simultaneously in the Blox Fruits trade table.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
